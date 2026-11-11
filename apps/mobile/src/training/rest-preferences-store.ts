import { create } from 'zustand';
import {
  DEFAULT_REST_PREFERENCES,
  normalizeRestSeconds,
  restSecondsForExercise,
  withExerciseRest,
  withoutExerciseRest,
  type RestPreferences,
} from '@evry/domain';
import { isCurrentMobileSession, type MobileSession } from '../api/client';
import { loadRestPreferences, saveRestPreferences } from '../db/database';

interface RestPreferencesState {
  session: MobileSession | null;
  ready: boolean;
  saving: boolean;
  error: string | null;
  preferences: RestPreferences;
  load: (session: MobileSession) => Promise<void>;
  setDefault: (seconds: number) => Promise<void>;
  setExercise: (exerciseId: string, seconds: number) => Promise<void>;
  resetExercise: (exerciseId: string) => Promise<void>;
  /** Persists a ± delta on the configured base for this exercise. */
  adjustExercise: (exerciseId: string, deltaSeconds: number) => Promise<void>;
  clear: () => void;
}

let loadVersion = 0;

export const useRestPreferencesStore = create<RestPreferencesState>((set, get) => {
  async function persist(next: RestPreferences): Promise<void> {
    const session = get().session;
    if (!session || !isCurrentMobileSession(session)) return;
    const previous = get().preferences;
    set({ preferences: next, saving: true, error: null });
    try {
      await saveRestPreferences(session, next);
      if (get().session === session) set({ saving: false });
    } catch (reason) {
      if (get().session === session) {
        set({
          preferences: previous,
          saving: false,
          error: reason instanceof Error ? reason.message : 'No se pudo guardar el descanso.',
        });
      }
      throw reason;
    }
  }

  return {
    session: null,
    ready: false,
    saving: false,
    error: null,
    preferences: DEFAULT_REST_PREFERENCES,
    async load(session) {
      const version = ++loadVersion;
      set({ session, ready: false, error: null });
      try {
        const preferences = await loadRestPreferences(session);
        if (version !== loadVersion || get().session !== session) return;
        set({ preferences, ready: true });
      } catch (reason) {
        if (version !== loadVersion || get().session !== session) return;
        // Defaults keep the session usable; the error stays visible in Profile.
        set({
          preferences: DEFAULT_REST_PREFERENCES,
          ready: true,
          error: reason instanceof Error ? reason.message : 'No se pudieron leer los descansos guardados.',
        });
      }
    },
    async setDefault(seconds) {
      const normalized = normalizeRestSeconds(seconds);
      await persist({ ...get().preferences, defaultRestSeconds: normalized });
    },
    async setExercise(exerciseId, seconds) {
      await persist(withExerciseRest(get().preferences, exerciseId, normalizeRestSeconds(seconds)));
    },
    async resetExercise(exerciseId) {
      await persist(withoutExerciseRest(get().preferences, exerciseId));
    },
    async adjustExercise(exerciseId, deltaSeconds) {
      const base = restSecondsForExercise(get().preferences, exerciseId);
      await persist(withExerciseRest(get().preferences, exerciseId, normalizeRestSeconds(base + deltaSeconds)));
    },
    clear() {
      loadVersion += 1;
      set({ session: null, ready: false, saving: false, error: null, preferences: DEFAULT_REST_PREFERENCES });
    },
  };
});

export function restBaseForExercise(preferences: RestPreferences, exerciseId: string): number {
  return restSecondsForExercise(preferences, exerciseId);
}
