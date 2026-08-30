import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import type { SyncWorkoutInput } from '../api/client';
import {
  currentSyncState,
  archiveRecoveredDraft,
  enqueueWorkout,
  getDatabase,
  loadActiveWorkout,
} from '../db/database';
import { syncPendingWorkouts } from '../sync/sync-engine';
import type { SyncQueueState } from '../sync/queue-policy';
import {
  finishLocalWorkout,
  type LocalWorkout,
  type LocalWorkoutSet,
} from './workout-domain';

interface TrainingState {
  ready: boolean;
  activeWorkout: LocalWorkout | null;
  syncState: SyncQueueState;
  error: string | null;
  initialize: () => Promise<void>;
  startWorkout: (name?: string, routineId?: string) => Promise<void>;
  recoverDraft: (draft: LocalWorkout) => Promise<void>;
  addSet: (exerciseId: string) => Promise<void>;
  updateSet: (clientId: string, changes: Partial<LocalWorkoutSet>) => Promise<void>;
  deleteSet: (clientId: string) => Promise<void>;
  finishWorkout: () => Promise<void>;
  refreshSyncState: () => Promise<void>;
}

let localWriteQueue: Promise<void> = Promise.resolve();

export const useTrainingStore = create<TrainingState>((set, get) => ({
  ready: false,
  activeWorkout: null,
  syncState: 'synced',
  error: null,
  async initialize() {
    await getDatabase();
    const activeWorkout = await loadActiveWorkout();
    set({
      ready: true,
      activeWorkout,
      syncState: await currentSyncState(),
      error: null,
    });
  },
  async startWorkout(name = 'Entrenamiento libre', routineId) {
    if (get().activeWorkout) return;
    const workout: LocalWorkout = {
      clientId: Crypto.randomUUID(),
      revision: 0,
      name,
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      notes: null,
      ...(routineId ? { routineId } : {}),
      sets: [],
      deletedSetClientIds: [],
    };
    set({ activeWorkout: workout, syncState: 'pending', error: null });
    const syncState = await queueWorkout(workout);
    set({ syncState });
    scheduleSync();
  },
  async recoverDraft(draft) {
    if (get().activeWorkout) throw new Error('Finaliza la sesión activa antes de recuperar un borrador.');
    const workout: LocalWorkout = {
      ...draft,
      clientId: Crypto.randomUUID(),
      revision: 0,
      status: 'ACTIVE',
      endedAt: undefined,
      cancelledAt: undefined,
      sets: draft.sets.map((item) => ({ ...item, clientId: Crypto.randomUUID(), revision: 0 })),
      deletedSetClientIds: [],
    };
    set({ activeWorkout: workout, syncState: 'pending', error: null });
    const syncState = await queueWorkout(workout);
    await archiveRecoveredDraft(draft);
    set({ syncState });
    scheduleSync();
  },
  async addSet(exerciseId) {
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const exerciseSets = workout.sets.filter((item) => item.exerciseId === exerciseId);
    const next: LocalWorkout = {
      ...workout,
      sets: [...workout.sets, {
        clientId: Crypto.randomUUID(),
        revision: 0,
        exerciseId,
        order: exerciseSets.length,
        weightKg: 0,
        reps: 0,
        durationS: null,
        rpe: null,
        isWarmup: false,
        techniqueStable: null,
        completedAt: new Date().toISOString(),
      }],
    };
    set({ activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(next);
    set({ syncState });
    scheduleSync();
  },
  async updateSet(clientId, changes) {
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const next = {
      ...workout,
      sets: workout.sets.map((item) => item.clientId === clientId ? { ...item, ...changes } : item),
    };
    set({ activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(next);
    set({ syncState });
    scheduleSync();
  },
  async deleteSet(clientId) {
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const removed = workout.sets.find((item) => item.clientId === clientId);
    if (!removed) return;
    const exerciseOrders = new Map<string, number>();
    const remainingSets = workout.sets
      .filter((item) => item.clientId !== clientId)
      .map((item) => {
        const order = exerciseOrders.get(item.exerciseId) ?? 0;
        exerciseOrders.set(item.exerciseId, order + 1);
        return { ...item, order };
      });
    const next: LocalWorkout = {
      ...workout,
      sets: remainingSets,
      // Revision zero may already be in flight: the server must see the deletion
      // even when its acknowledgement has not reached this device yet.
      deletedSetClientIds: [...new Set([...workout.deletedSetClientIds, removed.clientId])],
    };
    set({ activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(next);
    set({ syncState });
    scheduleSync();
  },
  async finishWorkout() {
    const workout = get().activeWorkout;
    if (!workout) return;
    try {
      const completed = finishLocalWorkout(workout);
      set({ activeWorkout: null, syncState: 'pending', error: null });
      const syncState = await queueWorkout(completed);
      set({ syncState });
      scheduleSync();
    } catch (error) {
      set({ activeWorkout: workout, error: error instanceof Error ? error.message : 'No se pudo finalizar la sesión.' });
      throw error;
    }
  },
  async refreshSyncState() {
    await localWriteQueue;
    set({ activeWorkout: await loadActiveWorkout(), syncState: await currentSyncState() });
  },
}));

async function queueWorkout(workout: LocalWorkout): Promise<SyncQueueState> {
  const syncId = Crypto.randomUUID();
  const write = localWriteQueue.then(() => enqueueWorkout(workout, syncId, syncPayload(workout, syncId)));
  localWriteQueue = write.then(() => undefined, () => undefined);
  return write;
}

function scheduleSync(): void {
  void syncPendingWorkouts().finally(() => useTrainingStore.getState().refreshSyncState());
}

function syncPayload(workout: LocalWorkout, syncId: string): SyncWorkoutInput {
  if (workout.status === 'DRAFT') {
    throw new Error('Un borrador recuperado debe revisarse antes de sincronizarse.');
  }
  return {
    clientId: workout.clientId,
    syncId,
    baseRevision: workout.revision,
    name: workout.name,
    startedAt: workout.startedAt,
    ...(workout.endedAt ? { endedAt: workout.endedAt } : {}),
    ...(workout.cancelledAt ? { cancelledAt: workout.cancelledAt } : {}),
    status: workout.status,
    ...(workout.notes ? { notes: workout.notes } : {}),
    ...(workout.routineId ? { routineId: workout.routineId } : {}),
    sets: workout.sets.map((item) => ({
      clientId: item.clientId,
      baseRevision: item.revision,
      exerciseId: item.exerciseId,
      order: item.order,
      weightKg: item.weightKg,
      reps: item.reps,
      durationS: item.durationS,
      rpe: item.rpe,
      isWarmup: item.isWarmup,
      techniqueStable: item.techniqueStable,
      completedAt: item.completedAt,
    })),
    deletedSetClientIds: workout.deletedSetClientIds,
  };
}
