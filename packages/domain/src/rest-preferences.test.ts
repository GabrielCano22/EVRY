import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REST_PREFERENCES, decodeRestPreferences, restSecondsForExercise, withExerciseRest, withoutExerciseRest,
} from './rest-preferences';

describe('rest preferences', () => {
  it('starts at two minutes with no overrides', () => {
    expect(DEFAULT_REST_PREFERENCES).toEqual({ defaultRestSeconds: 120, restSecondsByExerciseId: {} });
  });

  it('round-trips a valid document', () => {
    const value = { defaultRestSeconds: 180, restSecondsByExerciseId: { squat: 240 } };
    expect(decodeRestPreferences(value)).toEqual(value);
  });

  it('rejects damaged documents instead of guessing', () => {
    expect(() => decodeRestPreferences(null)).toThrow();
    expect(() => decodeRestPreferences([])).toThrow();
    expect(() => decodeRestPreferences({ defaultRestSeconds: 10, restSecondsByExerciseId: {} })).toThrow();
    expect(() => decodeRestPreferences({ defaultRestSeconds: 120, restSecondsByExerciseId: { squat: 5 } })).toThrow();
    expect(() => decodeRestPreferences({ defaultRestSeconds: 120 })).toThrow();
  });

  it('resolves the exercise override before the default', () => {
    const preferences = { defaultRestSeconds: 120, restSecondsByExerciseId: { squat: 240 } };
    expect(restSecondsForExercise(preferences, 'squat')).toBe(240);
    expect(restSecondsForExercise(preferences, 'bench')).toBe(120);
  });

  it('remembers and forgets a per-exercise override without mutating the input', () => {
    const updated = withExerciseRest(DEFAULT_REST_PREFERENCES, 'squat', 95);
    expect(updated.restSecondsByExerciseId.squat).toBe(90);
    expect(DEFAULT_REST_PREFERENCES.restSecondsByExerciseId).toEqual({});
    expect(withoutExerciseRest(updated, 'squat').restSecondsByExerciseId).toEqual({});
  });
});
