import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import type { SetType } from '@evry/domain';
import { isCurrentMobileSession, type MobileSession, type SyncWorkoutInput } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import {
  currentSyncState,
  enqueueWorkout,
  getDatabase,
  loadActiveWorkout,
} from '../db/database';
import { syncPendingWorkouts } from '../sync/sync-engine';
import type { SyncQueueState } from '../sync/queue-policy';
import {
  cancelLocalWorkout,
  finishLocalWorkout,
  setTypeOfLocal,
  type LocalWorkout,
  type LocalWorkoutSet,
} from './workout-domain';

export type LocalSaveState = 'saved' | 'saving' | 'failed';

interface TrainingState {
  session: MobileSession | null;
  editVersion: number;
  reset: () => void;
  ready: boolean;
  activeWorkout: LocalWorkout | null;
  syncState: SyncQueueState;
  localSaveState: LocalSaveState;
  error: string | null;
  initialize: (session: MobileSession) => Promise<void>;
  startWorkout: (name?: string, routineId?: string) => Promise<void>;
  recoverDraft: (draft: LocalWorkout) => Promise<void>;
  renameWorkout: (name: string) => Promise<void>;
  addSet: (exerciseId: string, initial?: { weightKg?: number | null; reps?: number | null }) => Promise<void>;
  updateSet: (clientId: string, changes: Partial<LocalWorkoutSet>) => Promise<void>;
  setSetCompleted: (clientId: string, completed: boolean) => Promise<void>;
  changeSetType: (clientId: string, setType: SetType) => Promise<void>;
  deleteSet: (clientId: string) => Promise<void>;
  cancelWorkout: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  refreshSyncState: () => Promise<void>;
}

const localWriteQueues = new Map<string, Promise<void>>();

function writeScope(session: MobileSession): string {
  return JSON.stringify([session.serverUrl.replace(/\/+$/, ''), session.userId]);
}

function pendingLocalWrites(session: MobileSession): Promise<void> {
  return localWriteQueues.get(writeScope(session)) ?? Promise.resolve();
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  session: null,
  editVersion: 0,
  reset: () => set({ session: null, ready: false, activeWorkout: null, syncState: 'synced', localSaveState: 'saved', error: null, editVersion: get().editVersion + 1 }),
  ready: false,
  activeWorkout: null,
  syncState: 'synced',
  localSaveState: 'saved',
  error: null,
  async initialize(session) {
    if (!isCurrentMobileSession(session)) return;
    const version = get().editVersion + 1;
    set({ session, ready: false, activeWorkout: null, localSaveState: 'saving', error: null, editVersion: version });
    try {
      await pendingLocalWrites(session);
      if (!isCurrentMobileSession(session) || get().session !== session || get().editVersion !== version) return;
      await getDatabase(session);
      const activeWorkout = await loadActiveWorkout(session);
      const syncState = await currentSyncState(session);
      if (!isCurrentMobileSession(session) || get().session !== session || get().editVersion !== version) return;
      const localFailure = get().localSaveState === 'failed' ? get().error : null;
      set({ ready: true, activeWorkout, syncState, localSaveState: localFailure ? 'failed' : 'saved', error: localFailure });
    } catch (error) {
      if (get().session === session && isCurrentMobileSession(session) && get().editVersion === version) {
        set({ localSaveState: 'failed', error: error instanceof Error ? error.message : 'No se pudo abrir el almacenamiento local.' });
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
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: workout, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, workout, version);
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
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: workout, syncState: 'pending', localSaveState: 'saving', error: null });
    try {
      const syncState = await queueWorkout(session, workout, draft);
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      if (get().editVersion === version) set({ syncState, localSaveState: 'saved' });
      scheduleSync(session);
    } catch (reason) {
      await pendingLocalWrites(session);
      if (isCurrentMobileSession(session) && get().session === session && get().editVersion === version) {
        const error = reason instanceof Error ? reason.message : 'No se pudo recuperar el borrador.';
        try {
          const [activeWorkout, syncState] = await Promise.all([loadActiveWorkout(session), currentSyncState(session)]);
          if (get().session === session && get().editVersion === version) set({ activeWorkout, syncState, localSaveState: 'failed', error, editVersion: version + 1 });
        } catch {
          if (get().session === session && get().editVersion === version) set({ ready: false, activeWorkout: null, localSaveState: 'failed', error: `${error} Reinicia la app para reintentar.`, editVersion: version + 1 });
        }
      }
      throw reason;
    }
  },
  async addSet(exerciseId, initial) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const exerciseSets = workout.sets.filter((item) => item.exerciseId === exerciseId);
    // The last type chosen for this exercise is the default for the next set,
    // and the previous values are copied so a straight set is one tap away.
    const previous = exerciseSets.length > 0 ? exerciseSets[exerciseSets.length - 1] : undefined;
    const setType = previous ? setTypeOfLocal(previous) : 'NORMAL';
    const next: LocalWorkout = {
      ...workout,
      sets: [...workout.sets, {
        clientId: Crypto.randomUUID(),
        revision: 0,
        exerciseId,
        order: exerciseSets.length,
        weightKg: initial?.weightKg !== undefined ? initial.weightKg : previous?.weightKg ?? null,
        reps: initial?.reps !== undefined ? initial.reps : previous?.reps ?? null,
        durationS: null,
        rpe: null,
        isWarmup: setType === 'WARMUP',
        setType,
        techniqueStable: null,
        completedAt: null,
      }],
    };
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
  },
  async renameWorkout(name) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 120 || trimmed === workout.name) return;
    const next: LocalWorkout = { ...workout, name: trimmed };
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
  },
  async setSetCompleted(clientId, completed) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const target = workout.sets.find((item) => item.clientId === clientId);
    if (!target || (target.completedAt !== null) === completed) return;
    const next: LocalWorkout = {
      ...workout,
      sets: workout.sets.map((item) => item.clientId === clientId
        ? { ...item, completedAt: completed ? new Date().toISOString() : null }
        : item),
    };
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
  },
  async changeSetType(clientId, setType) {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    const target = workout.sets.find((item) => item.clientId === clientId);
    if (!target || setTypeOfLocal(target) === setType) return;
    const next: LocalWorkout = {
      ...workout,
      sets: workout.sets.map((item) => item.clientId === clientId
        ? { ...item, setType, isWarmup: setType === 'WARMUP' }
        : item),
    };
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
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
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
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
    const version = get().editVersion + 1;
    set({ editVersion: version, activeWorkout: next, syncState: 'pending', localSaveState: 'saving', error: null });
    await persistOptimisticWorkout(session, next, version);
  },
  async cancelWorkout() {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    let version = get().editVersion;
    try {
      const cancelled = cancelLocalWorkout(workout);
      version += 1;
      set({ editVersion: version, activeWorkout: cancelled, syncState: 'pending', localSaveState: 'saving', error: null });
      const syncState = await queueWorkout(session, cancelled);
      if (!isCurrentMobileSession(session) || get().session !== session || get().editVersion !== version) return;
      set({ editVersion: get().editVersion + 1, activeWorkout: null, syncState, localSaveState: 'saved' });
      scheduleSync(session);
    } catch (error) {
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      const message = error instanceof Error ? error.message : 'No se pudo cancelar la sesión.';
      if (get().editVersion === version) {
        set({ editVersion: version + 1, activeWorkout: workout, localSaveState: 'failed', error: message });
      } else if (!get().ready) {
        // Initialization owns the snapshot/version; preserve the failed-write notice.
        set({ localSaveState: 'failed', error: message });
      }
      throw error;
    }
  },
  async finishWorkout() {
    const session = get().session;
    if (!session || !get().ready || !isCurrentMobileSession(session)) return;
    const workout = get().activeWorkout;
    if (!workout || workout.status !== 'ACTIVE') return;
    let version = get().editVersion;
    try {
      const completed = finishLocalWorkout(workout);
      version += 1;
      set({ editVersion: version, activeWorkout: completed, syncState: 'pending', localSaveState: 'saving', error: null });
      const syncState = await queueWorkout(session, completed);
      if (!isCurrentMobileSession(session) || get().session !== session || get().editVersion !== version) return;
      set({ editVersion: get().editVersion + 1, activeWorkout: null, syncState, localSaveState: 'saved' });
      scheduleSync(session);
    } catch (error) {
      if (!isCurrentMobileSession(session) || get().session !== session) return;
      const message = error instanceof Error ? error.message : 'No se pudo finalizar la sesión.';
      if (get().editVersion === version) {
        set({ editVersion: version + 1, activeWorkout: workout, localSaveState: 'failed', error: message });
      } else if (!get().ready) {
        set({ localSaveState: 'failed', error: message });
      }
      throw error;
    }
  },
  async refreshSyncState() {
    const session = get().session;
    const version = get().editVersion;
    if (!session || !isCurrentMobileSession(session)) return;
    await pendingLocalWrites(session);
    const activeWorkout = await loadActiveWorkout(session);
    const syncState = await currentSyncState(session);
    if (get().session !== session || !isCurrentMobileSession(session) || get().editVersion !== version) return;
    set({ activeWorkout, syncState });
  },
}));

async function queueWorkout(session: MobileSession, workout: LocalWorkout, draftToArchive?: LocalWorkout): Promise<SyncQueueState> {
  const syncId = Crypto.randomUUID();
  const scope = writeScope(session);
  const write = pendingLocalWrites(session).then(() => enqueueWorkout(session, workout, syncId, syncPayload(workout, syncId), draftToArchive));
  const settled = write.then(() => undefined, () => undefined);
  localWriteQueues.set(scope, settled);
  void settled.then(() => {
    if (localWriteQueues.get(scope) === settled) localWriteQueues.delete(scope);
  });
  return write;
}

async function persistOptimisticWorkout(session: MobileSession, workout: LocalWorkout, version: number): Promise<void> {
  try {
    const syncState = await queueWorkout(session, workout);
    if (!isCurrentMobileSession(session) || useTrainingStore.getState().session !== session) return;
    if (useTrainingStore.getState().editVersion === version) useTrainingStore.setState({ syncState, localSaveState: 'saved' });
    scheduleSync(session);
  } catch (reason) {
    await pendingLocalWrites(session);
    const current = useTrainingStore.getState();
    if (!isCurrentMobileSession(session) || current.session !== session || current.editVersion !== version) return;
    const error = reason instanceof Error ? reason.message : 'No se pudo guardar en este dispositivo.';
    try {
      const [activeWorkout, syncState] = await Promise.all([loadActiveWorkout(session), currentSyncState(session)]);
      if (useTrainingStore.getState().session === session && useTrainingStore.getState().editVersion === version) {
        useTrainingStore.setState({ activeWorkout, syncState, localSaveState: 'failed', error, editVersion: version + 1 });
      }
    } catch {
      if (useTrainingStore.getState().session === session && useTrainingStore.getState().editVersion === version) {
        useTrainingStore.setState({ ready: false, activeWorkout: null, localSaveState: 'failed', error: `${error} No se pudo recuperar el estado local. Reinicia la app para reintentar.`, editVersion: version + 1 });
      }
    }
  }
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
      ...(item.setType ? { setType: item.setType } : {}),
      techniqueStable: item.techniqueStable,
      completedAt: item.completedAt,
    })),
    deletedSetClientIds: workout.deletedSetClientIds,
  };
}
