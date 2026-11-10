export interface RestTimerState {
  mode: 'RUNNING' | 'PAUSED' | 'FINISHED';
  remainingMs: number;
  deadlineMs: number | null;
  notificationDelivered: boolean;
}

const MAX_REST_MS = 3_600_000;
const damagedMessage = 'El descanso guardado contiene datos inválidos. Los datos locales se conservan.';

function safeClock(now: number): void {
  if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - MAX_REST_MS) {
    throw new RangeError('El reloj no permite calcular un descanso válido.');
  }
}

export function decodeRestTimer(value: unknown): RestTimerState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(damagedMessage);
  const state = value as Record<string, unknown>;
  if (typeof state.remainingMs !== 'number' || !Number.isSafeInteger(state.remainingMs)
    || state.remainingMs < 0 || state.remainingMs > MAX_REST_MS || typeof state.notificationDelivered !== 'boolean') {
    throw new Error(damagedMessage);
  }
  const running = state.mode === 'RUNNING' && state.remainingMs > 0 && typeof state.deadlineMs === 'number'
    && Number.isSafeInteger(state.deadlineMs) && state.deadlineMs > 0 && !state.notificationDelivered;
  const paused = state.mode === 'PAUSED' && state.remainingMs > 0 && state.deadlineMs === null && !state.notificationDelivered;
  const finished = state.mode === 'FINISHED' && state.remainingMs === 0 && state.deadlineMs === null;
  if (!running && !paused && !finished) throw new Error(damagedMessage);
  return { mode: state.mode as RestTimerState['mode'], remainingMs: state.remainingMs,
    deadlineMs: state.deadlineMs as number | null, notificationDelivered: state.notificationDelivered };
}

export function startRestTimer(seconds = 120, now = Date.now()): RestTimerState {
  safeClock(now);
  if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds > MAX_REST_MS / 1000) {
    throw new RangeError('El descanso debe durar entre 1 y 3600 segundos enteros.');
  }
  return { mode: 'RUNNING', remainingMs: seconds * 1000, deadlineMs: now + seconds * 1000, notificationDelivered: false };
}

export function remainingRestMs(state: RestTimerState, now = Date.now()): number {
  safeClock(now);
  decodeRestTimer(state);
  return state.mode === 'RUNNING' ? Math.max(0, Math.min(state.remainingMs, state.deadlineMs! - now)) : state.remainingMs;
}

export function finishRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  if (state.mode !== 'RUNNING' || remainingRestMs(state, now) > 0) return decodeRestTimer(state);
  return { mode: 'FINISHED', remainingMs: 0, deadlineMs: null, notificationDelivered: false };
}

export function pauseRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  if (state.mode !== 'RUNNING') return decodeRestTimer(state);
  const remainingMs = remainingRestMs(state, now);
  return remainingMs === 0 ? finishRestTimer(state, now)
    : { mode: 'PAUSED', remainingMs, deadlineMs: null, notificationDelivered: false };
}

export function resumeRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  safeClock(now);
  const valid = decodeRestTimer(state);
  return valid.mode === 'PAUSED' ? { ...valid, mode: 'RUNNING', deadlineMs: now + valid.remainingMs } : valid;
}

export function adjustRestTimer(state: RestTimerState, seconds: number, now = Date.now()): RestTimerState {
  if (!Number.isSafeInteger(seconds) || Math.abs(seconds) > MAX_REST_MS / 1000) {
    throw new RangeError('El ajuste del descanso no es válido.');
  }
  const remainingMs = Math.max(0, Math.min(MAX_REST_MS, remainingRestMs(state, now) + seconds * 1000));
  if (remainingMs === 0) return { mode: 'FINISHED', remainingMs: 0, deadlineMs: null, notificationDelivered: state.mode === 'FINISHED' && state.notificationDelivered };
  return { mode: state.mode === 'RUNNING' ? 'RUNNING' : 'PAUSED', remainingMs,
    deadlineMs: state.mode === 'RUNNING' ? now + remainingMs : null, notificationDelivered: false };
}
