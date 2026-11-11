import { describe, expect, it } from 'vitest';
import {
  isSecondarySetType, isSetType, normalizeRestSeconds, restSecondsForSetType, setTypeOf,
} from './set-type';

describe('set types', () => {
  it('accepts only the four known types', () => {
    expect(['WARMUP', 'NORMAL', 'FAILURE', 'DROP'].every(isSetType)).toBe(true);
    expect(isSetType('warmup')).toBe(false);
    expect(isSetType('')).toBe(false);
    expect(isSetType(null)).toBe(false);
    expect(isSetType(3)).toBe(false);
  });

  it('treats warm-up and drop as secondary sets', () => {
    expect(isSecondarySetType('WARMUP')).toBe(true);
    expect(isSecondarySetType('DROP')).toBe(true);
    expect(isSecondarySetType('NORMAL')).toBe(false);
    expect(isSecondarySetType('FAILURE')).toBe(false);
  });

  it('derives the type from legacy isWarmup data without rewriting it', () => {
    expect(setTypeOf({ isWarmup: true })).toBe('WARMUP');
    expect(setTypeOf({ isWarmup: false })).toBe('NORMAL');
    expect(setTypeOf({ setType: 'FAILURE', isWarmup: false })).toBe('FAILURE');
    expect(setTypeOf({ setType: 'DROP', isWarmup: true })).toBe('DROP');
    expect(setTypeOf({ setType: 'nonsense', isWarmup: true })).toBe('WARMUP');
  });
});

describe('set rest duration', () => {
  it('keeps the configured rest for working and failure sets', () => {
    expect(restSecondsForSetType(120, 'NORMAL')).toBe(120);
    expect(restSecondsForSetType(120, 'FAILURE')).toBe(120);
    expect(restSecondsForSetType(180, 'NORMAL')).toBe(180);
  });

  it('halves the rest for warm-up and drop sets', () => {
    expect(restSecondsForSetType(120, 'WARMUP')).toBe(60);
    expect(restSecondsForSetType(120, 'DROP')).toBe(60);
    expect(restSecondsForSetType(180, 'WARMUP')).toBe(90);
    expect(restSecondsForSetType(240, 'DROP')).toBe(120);
  });

  it('never returns less than thirty seconds', () => {
    expect(restSecondsForSetType(30, 'WARMUP')).toBe(30);
    expect(restSecondsForSetType(45, 'WARMUP')).toBe(30);
    expect(restSecondsForSetType(60, 'DROP')).toBe(30);
  });

  it('snaps every value to the fifteen second grid', () => {
    for (const base of [45, 75, 105, 135, 165]) {
      for (const rest of [restSecondsForSetType(base, 'NORMAL'), restSecondsForSetType(base, 'WARMUP')]) {
        expect(rest % 15).toBe(0);
        expect(rest).toBeGreaterThanOrEqual(30);
        expect(rest).toBeLessThanOrEqual(600);
      }
    }
  });

  it('clamps an out-of-range base instead of producing an unusable rest', () => {
    expect(restSecondsForSetType(0, 'NORMAL')).toBe(30);
    expect(restSecondsForSetType(-120, 'NORMAL')).toBe(30);
    expect(restSecondsForSetType(601, 'NORMAL')).toBe(600);
    expect(restSecondsForSetType(5000, 'NORMAL')).toBe(600);
    expect(restSecondsForSetType(5000, 'WARMUP')).toBe(300);
    expect(() => restSecondsForSetType(Number.NaN, 'NORMAL')).toThrow(RangeError);
    expect(() => normalizeRestSeconds(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
