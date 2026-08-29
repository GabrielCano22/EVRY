import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import type { SyncWorkoutInput } from '../api/client';
import { enqueueWorkout, getDatabase, loadActiveWorkout, saveWorkout } from '../db/database';
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
  startWorkout: (name?: string) => Promise<void>;
  addSet: (exerciseId: string) => Promise<void>;
  updateSet: (clientId: string, changes: Partial<LocalWorkoutSet>) => Promise<void>;
  finishWorkout: () => Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  ready: false,
  activeWorkout: null,
  syncState: 'synced',
  error: null,
  async initialize() {
    await getDatabase();
    const activeWorkout = await loadActiveWorkout();
    set({ ready: true, activeWorkout, error: null });
  },
  async startWorkout(name = 'Entrenamiento libre') {
    if (get().activeWorkout) return;
    const workout: LocalWorkout = {
      clientId: Crypto.randomUUID(),
      revision: 0,
      name,
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      notes: null,
      sets: [],
      deletedSetClientIds: [],
    };
    await saveWorkout(workout, 'synced');
    set({ activeWorkout: workout, syncState: 'synced', error: null });
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
    await saveWorkout(next, 'synced');
    set({ activeWorkout: next });
  },
  async updateSet(clientId, changes) {
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const next = {
      ...workout,
      sets: workout.sets.map((item) => item.clientId === clientId ? { ...item, ...changes } : item),
    };
    await saveWorkout(next, 'synced');
    set({ activeWorkout: next });
  },
  async finishWorkout() {
    const workout = get().activeWorkout;
    if (!workout) return;
    try {
      const completed = finishLocalWorkout(workout);
      const syncId = Crypto.randomUUID();
      await enqueueWorkout(completed, syncId, syncPayload(completed, syncId));
      set({ activeWorkout: null, syncState: 'pending', error: null });
      void syncPendingWorkouts();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo finalizar la sesión.' });
      throw error;
    }
  },
}));

function syncPayload(workout: LocalWorkout, syncId: string): SyncWorkoutInput {
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
    })),
    deletedSetClientIds: workout.deletedSetClientIds,
  };
}
