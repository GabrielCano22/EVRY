import { MAX_REST_SECONDS, MIN_REST_SECONDS, normalizeRestSeconds } from './set-type';

export const DEFAULT_REST_SECONDS = 120;

export interface RestPreferences {
  /** Base rest for a working set, in seconds, on a 15 second grid. */
  defaultRestSeconds: number;
  /** Per-exercise override, remembered when the user adjusts the timer. */
  restSecondsByExerciseId: Record<string, number>;
}

export const DEFAULT_REST_PREFERENCES: RestPreferences = {
  defaultRestSeconds: DEFAULT_REST_SECONDS,
  restSecondsByExerciseId: {},
};

const damagedMessage = 'Las preferencias de descanso guardadas no son válidas.';

export function decodeRestPreferences(value: unknown): RestPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(damagedMessage);
  const record = value as Record<string, unknown>;
  const base = record.defaultRestSeconds;
  if (typeof base !== 'number' || !Number.isFinite(base)
    || base < MIN_REST_SECONDS || base > MAX_REST_SECONDS) {
    throw new Error(damagedMessage);
  }
  const overrides = record.restSecondsByExerciseId;
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) throw new Error(damagedMessage);
  const restSecondsByExerciseId: Record<string, number> = {};
  for (const [exerciseId, seconds] of Object.entries(overrides)) {
    if (exerciseId.trim().length === 0 || typeof seconds !== 'number' || !Number.isFinite(seconds)
      || seconds < MIN_REST_SECONDS || seconds > MAX_REST_SECONDS) {
      throw new Error(damagedMessage);
    }
    restSecondsByExerciseId[exerciseId] = seconds;
  }
  return { defaultRestSeconds: normalizeRestSeconds(base), restSecondsByExerciseId };
}

export function restSecondsForExercise(preferences: RestPreferences, exerciseId: string): number {
  return preferences.restSecondsByExerciseId[exerciseId] ?? preferences.defaultRestSeconds;
}

export function withExerciseRest(preferences: RestPreferences, exerciseId: string, seconds: number): RestPreferences {
  return {
    ...preferences,
    restSecondsByExerciseId: { ...preferences.restSecondsByExerciseId, [exerciseId]: normalizeRestSeconds(seconds) },
  };
}

export function withoutExerciseRest(preferences: RestPreferences, exerciseId: string): RestPreferences {
  const restSecondsByExerciseId = { ...preferences.restSecondsByExerciseId };
  delete restSecondsByExerciseId[exerciseId];
  return { ...preferences, restSecondsByExerciseId };
}
