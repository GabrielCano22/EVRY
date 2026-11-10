import { describe, expect, it } from 'vitest';
import * as timer from './index';

describe('offline rest timer', () => {
  it('uses an absolute deadline and derives time after missed ticks without going negative', () => {
    expect(typeof timer.startRestTimer).toBe('function');
    const started = timer.startRestTimer(120, 1_000_000);
    expect(started).toEqual({ mode: 'RUNNING', remainingMs: 120_000, deadlineMs: 1_120_000, notificationDelivered: false });
    expect(timer.remainingRestMs(started, 1_031_500)).toBe(88_500);
    expect(timer.remainingRestMs(started, 1_180_000)).toBe(0);
    expect(timer.remainingRestMs(started, 999_000)).toBe(120_000);
  });

  it('pauses exact remaining time and resumes without counting time spent paused', () => {
    expect(typeof timer.pauseRestTimer).toBe('function');
    const paused = timer.pauseRestTimer(timer.startRestTimer(120, 1_000_000), 1_031_500);
    expect(paused).toEqual({ mode: 'PAUSED', remainingMs: 88_500, deadlineMs: null, notificationDelivered: false });
    expect(timer.remainingRestMs(paused, 2_000_000)).toBe(88_500);
    const resumed = timer.resumeRestTimer(paused, 2_000_000);
    expect(resumed.deadlineMs).toBe(2_088_500);
    expect(timer.remainingRestMs(resumed, 2_038_500)).toBe(50_000);
  });

  it('adjusts a running deadline and clamps remaining time at zero and one hour', () => {
    expect(typeof timer.adjustRestTimer).toBe('function');
    const started = timer.startRestTimer(120, 1_000_000);
    expect(timer.adjustRestTimer(started, 10, 1_030_000)).toMatchObject({ mode: 'RUNNING', remainingMs: 100_000, deadlineMs: 1_130_000 });
    expect(timer.adjustRestTimer(started, -120, 1_030_000)).toEqual({ mode: 'FINISHED', remainingMs: 0, deadlineMs: null, notificationDelivered: false });
    expect(timer.adjustRestTimer(started, 3600, 1_030_000).remainingMs).toBe(3_600_000);
  });

  it('expires only a running deadline and does not rearm acknowledged completion', () => {
    expect(typeof timer.finishRestTimer).toBe('function');
    const started = timer.startRestTimer(120, 1_000_000);
    expect(timer.finishRestTimer(started, 1_119_999)).toEqual(started);
    const finished = timer.finishRestTimer(started, 1_120_000);
    expect(finished).toEqual({ mode: 'FINISHED', remainingMs: 0, deadlineMs: null, notificationDelivered: false });
    expect(timer.finishRestTimer({ ...finished, notificationDelivered: true }, 2_000_000).notificationDelivered).toBe(true);
    const paused = timer.pauseRestTimer(started, 1_020_000);
    expect(timer.finishRestTimer(paused, 2_000_000)).toEqual(paused);
  });

  it('keeps an adjusted paused timer paused and does not silently restart a finished timer', () => {
    expect(typeof timer.adjustRestTimer).toBe('function');
    const paused = timer.pauseRestTimer(timer.startRestTimer(120, 1_000_000), 1_030_000);
    expect(timer.adjustRestTimer(paused, -10, 2_000_000)).toMatchObject({ mode: 'PAUSED', remainingMs: 80_000, deadlineMs: null });
    const finished = timer.finishRestTimer(timer.startRestTimer(1, 1_000_000), 1_001_000);
    expect(timer.adjustRestTimer(finished, 10, 2_000_000)).toMatchObject({ mode: 'PAUSED', remainingMs: 10_000, deadlineMs: null });
  });

  it.each([0, -1, 1.5, 3601, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid duration %s before starting', seconds => {
    expect(typeof timer.startRestTimer).toBe('function');
    expect(() => timer.startRestTimer(seconds, 1_000_000)).toThrow();
  });

  it.each([-1, Number.NaN, Number.MAX_SAFE_INTEGER])('rejects unsafe clock %s instead of persisting an invalid deadline', now => {
    expect(typeof timer.startRestTimer).toBe('function');
    expect(() => timer.startRestTimer(120, now)).toThrow();
  });

  it.each([null, {}, { mode: 'RUNNING', remainingMs: 120_000, deadlineMs: null, notificationDelivered: false },
    { mode: 'PAUSED', remainingMs: 0, deadlineMs: null, notificationDelivered: false },
    { mode: 'FINISHED', remainingMs: 1000, deadlineMs: null, notificationDelivered: false },
    { mode: 'PAUSED', remainingMs: 120_000, deadlineMs: null, notificationDelivered: true }])('rejects malformed durable state %j', value => {
    expect(typeof timer.decodeRestTimer).toBe('function');
    expect(() => timer.decodeRestTimer(value)).toThrow(/datos inválidos/);
  });
});
