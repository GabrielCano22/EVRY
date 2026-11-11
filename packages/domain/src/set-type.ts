/**
 * Set types and their rest semantics.
 *
 * Warm-up and drop sets deliberately rest for half of the configured time: they
 * are not working sets, and holding a full rest there turns a 40 minute session
 * into an hour. The factor lives here, not in a screen, so it can become a user
 * setting later without touching the UI.
 */
export type SetType = 'WARMUP' | 'NORMAL' | 'FAILURE' | 'DROP';

export const SET_TYPES = ['WARMUP', 'NORMAL', 'FAILURE', 'DROP'] as const;

export const SET_TYPE_LABELS: Record<SetType, string> = {
  WARMUP: 'Calentamiento',
  NORMAL: 'Normal',
  FAILURE: 'Al fallo',
  DROP: 'Drop set',
};

/** Compact chip shown inside the set row. Normal sets carry no chip. */
export const SET_TYPE_CHIPS: Record<SetType, string> = {
  WARMUP: 'W',
  NORMAL: '',
  FAILURE: 'F',
  DROP: 'D',
};

export const SET_TYPE_HELP: Record<SetType, string> = {
  WARMUP: 'No cuenta para el volumen',
  NORMAL: 'Serie de trabajo',
  FAILURE: 'Llegaste al límite técnico',
  DROP: 'Bajas peso sin descansar',
};

export const SECONDARY_SET_REST_FACTOR = 0.5;
export const MIN_REST_SECONDS = 30;
export const MAX_REST_SECONDS = 600;
export const REST_STEP_SECONDS = 15;

export function isSetType(value: unknown): value is SetType {
  return typeof value === 'string' && (SET_TYPES as readonly string[]).includes(value);
}

export function isWarmupFromSetType(setType: SetType): boolean {
  return setType === 'WARMUP';
}

export function isSecondarySetType(setType: SetType): boolean {
  return setType === 'WARMUP' || setType === 'DROP';
}

/**
 * Resolves a set type from either representation. Stored workouts written before
 * set types existed only carry `isWarmup`; they keep working without a rewrite.
 */
export function setTypeOf(set: { setType?: unknown; isWarmup?: unknown }): SetType {
  if (isSetType(set.setType)) return set.setType;
  return set.isWarmup === true ? 'WARMUP' : 'NORMAL';
}

export function normalizeRestSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) throw new RangeError('El descanso debe ser un número.');
  const clamped = Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(seconds)));
  const stepped = Math.round(clamped / REST_STEP_SECONDS) * REST_STEP_SECONDS;
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, stepped));
}

/**
 * Rest actually started for a set: the configured base, halved for warm-up and
 * drop sets, always on a 15 second grid and never under 30 seconds.
 */
export function restSecondsForSetType(baseSeconds: number, setType: SetType): number {
  const base = normalizeRestSeconds(baseSeconds);
  const factor = isSecondarySetType(setType) ? SECONDARY_SET_REST_FACTOR : 1;
  return normalizeRestSeconds(base * factor);
}
