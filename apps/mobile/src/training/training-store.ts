import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { isCurrentMobileSession, type MobileSession, type SyncWorkoutInput } from '../api/client';
import { useSessionStore } from '../auth/session-store';
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
  session: MobileSession | null;
  editVersion: number;
  reset: () => void;
  ready: boolean;
  activeWorkout: LocalWorkout | null;
  syncState: SyncQueueState;
  error: string | null;
  initialize: (session: MobileSession) => Promise<void>;
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
  session: null,
  editVersion: 0,
  reset: () => set({ session: null, ready: false, activeWorkout: null, syncState: 'synced', error: null, editVersion: get().editVersion + 1 }),
  ready: false,
  activeWorkout: null,
  syncState: 'synced',
  error: null,
  async initialize(session) {
    if (!isCurrentMobileSession(session)) return;
    set({ session, ready: false, activeWorkout: null, error: null, editVersion: get().editVersion + 1 });
    try {
      await getDatabase(session);
      const activeWorkout = await loadActiveWorkout(session);
      const syncState = await currentSyncState(session);
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      set({ ready: true, activeWorkout, syncState, error: null });
    } catch (error) {
      if (get().session === session && isCurrentMobileSession(session)) {
        set({ error: error instanceof Error ? error.message : 'No se pudo abrir el almacenamiento local.' });
      }
    }
  },
  async startWorkout(name = 'Entrenamiento libre', routineId) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
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
    set({ editVersion: get().editVersion + 1, activeWorkout: workout, syncState: 'pending', error: null });
    const syncState = await queueWorkout(session, workout);
    if (!isCurrentMobileSession(session) || get().session !== session) return;
    set({ syncState });
    scheduleSync(session);
  },
  async recoverDraft(draft) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
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
    set({ editVersion: get().editVersion + 1, activeWorkout: workout, syncState: 'pending', error: null });
    const syncState = await queueWorkout(session, workout);
    await archiveRecoveredDraft(session, draft);
    if (!isCurrentMobileSession(session) || get().session !== session) return;
    set({ syncState });
    scheduleSync(session);
  },
  async addSet(exerciseId) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
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
    set({ editVersion: get().editVersion + 1, activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(session, next);
    if (!isCurrentMobileSession(session) || get().session !== session) return;
    set({ syncState });
    scheduleSync(session);
  },
  async updateSet(clientId, changes) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const next = {
      ...workout,
      sets: workout.sets.map((item) => item.clientId === clientId ? { ...item, ...changes } : item),
    };
    set({ editVersion: get().editVersion + 1, activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(session, next);
    if (!isCurrentMobileSession(session) || get().session !== session) return;
    set({ syncState });
    scheduleSync(session);
  },
  async deleteSet(clientId) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
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
    set({ editVersion: get().editVersion + 1, activeWorkout: next, syncState: 'pending' });
    const syncState = await queueWorkout(session, next);
    if (!isCurrentMobileSession(session) || get().session !== session) return;
    set({ syncState });
    scheduleSync(session);
  },
  async finishWorkout() {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout) return;
    try {
      const completed = finishLocalWorkout(workout);
      set({ editVersion: get().editVersion + 1, activeWorkout: null, syncState: 'pending', error: null });
      const syncState = await queueWorkout(session, completed);
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      set({ syncState });
      scheduleSync(session);
    } catch (error) {
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      set({ editVersion: get().editVersion + 1, activeWorkout: workout, error: error instanceof Error ? error.message : 'No se pudo finalizar la sesión.' });
      throw error;
    }
  },
  async refreshSyncState() {
    const session = get().session;
    const version = get().editVersion;
    if (!session || !isCurrentMobileSession(session)) return;
    await localWriteQueue;
    const activeWorkout = await loadActiveWorkout(session);
    const syncState = await currentSyncState(session);
    if (get().session !== session || !isCurrentMobileSession(session) || get().editVersion !== version) return;
    set({ activeWorkout, syncState });
  },
}));

async function queueWorkout(session: MobileSession, workout: LocalWorkout): Promise<SyncQueueState> {
  const syncId = Crypto.randomUUID();
  const write = localWriteQueue.then(() => enqueueWorkout(session, workout, syncId, syncPayload(workout, syncId)));
  localWriteQueue = write.then(() => undefined, () => undefined);
  return write;
}

// Clear visible state synchronously on logout/account change, before React effects.
useSessionStore.subscribe((state) => {
  const current = useTrainingStore.getState().session;
  if (current && state.session !== current) useTrainingStore.getState().reset();
});

function scheduleSync(session: MobileSession): void {
  void syncPendingWorkouts(session)
    .then(() => {
      if (useTrainingStore.getState().session === session && isCurrentMobileSession(session)) {
        return useTrainingStore.getState().refreshSyncState();
      }
    })
    .catch((error: unknown) => {
      if (useTrainingStore.getState().session === session && isCurrentMobileSession(session)) {
        useTrainingStore.setState({ error: error instanceof Error ? error.message : 'No se pudo sincronizar.' });
      }
    });
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
    notes: workout.notes,
    routineId: workout.routineId ?? null,
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
