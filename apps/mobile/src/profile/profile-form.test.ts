import type { CurrentUser } from '../api/client';
import {
  createProfileDraft,
  restoreCycleLengths,
  validateProfileDraft,
  type ProfileDraft,
} from './profile-form';

const user: CurrentUser = {
  id: 'user-1',
  email: 'profile@example.com',
  name: 'Ada',
  biologicalSex: 'FEMALE',
  birthDate: '1994-02-15T00:00:00.000Z',
  goals: ['STRENGTH'],
  trackCycle: false,
  avgCycleLen: 28,
  avgPeriodLen: 5,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function draft(changes: Partial<ProfileDraft> = {}): ProfileDraft {
  return { ...createProfileDraft(user), ...changes };
}

it('initializes every editable field from the generated current user without sharing goals', () => {
  const result = createProfileDraft(user);

  expect(result).toEqual({
    name: 'Ada',
    biologicalSex: 'FEMALE',
    birthDate: '1994-02-15',
    goals: ['STRENGTH'],
    trackCycle: false,
    avgCycleLen: '28',
    avgPeriodLen: '5',
  });
  expect(result.goals).not.toBe(user.goals);
});

it('normalizes every editable field into one complete generated update body', () => {
  const result = validateProfileDraft(draft({
    name: '  Ada Lovelace  ',
    biologicalSex: 'OTHER',
    birthDate: '1995-03-04',
    goals: ['HYPERTROPHY', 'MOBILITY'],
    trackCycle: true,
    avgCycleLen: '30',
    avgPeriodLen: '6',
  }), '2026-09-09');

  expect(result).toEqual({
    errors: {},
    input: {
      name: 'Ada Lovelace',
      biologicalSex: 'OTHER',
      birthDate: '1995-03-04',
      goals: ['HYPERTROPHY', 'MOBILITY'],
      trackCycle: true,
      avgCycleLen: 30,
      avgPeriodLen: 6,
    },
  });
});

it.each([
  ['   ', 'El nombre es obligatorio.'],
  ['a'.repeat(121), 'El nombre debe tener máximo 120 caracteres.'],
])('rejects the invalid name %p', (name, message) => {
  expect(validateProfileDraft(draft({ name }), '2026-09-09').errors.name).toBe(message);
});

it.each([
  ['1994/02/15', 'Escribe una fecha válida en formato YYYY-MM-DD.'],
  ['2026-02-30', 'Escribe una fecha válida en formato YYYY-MM-DD.'],
  ['2026-09-10', 'La fecha de nacimiento no puede ser futura.'],
])('rejects the invalid birth date %p', (birthDate, message) => {
  expect(validateProfileDraft(draft({ birthDate }), '2026-09-09').errors.birthDate).toBe(message);
});

it('accepts an empty birth date and the current civil day', () => {
  expect(validateProfileDraft(draft({ birthDate: '' }), '2026-09-09').input?.birthDate).toBeNull();
  expect(validateProfileDraft(draft({ birthDate: '2026-09-09' }), '2026-09-09').errors.birthDate).toBeUndefined();
});

it('rejects duplicate or non-generated goals', () => {
  expect(validateProfileDraft(draft({ goals: ['STRENGTH', 'STRENGTH'] }), '2026-09-09').errors.goals)
    .toBe('Selecciona objetivos válidos sin repetirlos.');
  expect(validateProfileDraft(draft({ goals: ['NOT_A_GOAL' as 'STRENGTH'] }), '2026-09-09').errors.goals)
    .toBe('Selecciona objetivos válidos sin repetirlos.');
});

it.each([
  ['19', '5', 'El ciclo promedio debe estar entre 20 y 45 días.'],
  ['46', '5', 'El ciclo promedio debe estar entre 20 y 45 días.'],
  ['28.5', '5', 'El ciclo promedio debe estar entre 20 y 45 días.'],
  ['28', '1', 'El periodo promedio debe estar entre 2 y 10 días.'],
  ['28', '11', 'El periodo promedio debe estar entre 2 y 10 días.'],
])('rejects invalid tracked cycle lengths %p and %p', (avgCycleLen, avgPeriodLen, message) => {
  const result = validateProfileDraft(draft({ trackCycle: true, avgCycleLen, avgPeriodLen }), '2026-09-09');

  expect(Object.values(result.errors)).toContain(message);
  expect(result.input).toBeUndefined();
});

it('does not block a disabled tracker on stale lengths and normalizes them to safe defaults', () => {
  const result = validateProfileDraft(draft({ trackCycle: false, avgCycleLen: '', avgPeriodLen: '99' }), '2026-09-09');

  expect(result.errors).toEqual({});
  expect(result.input).toMatchObject({ trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5 });
});

it('restores valid hidden lengths from the canonical user when tracking is enabled again', () => {
  const restored = restoreCycleLengths(draft({ trackCycle: false, avgCycleLen: '19', avgPeriodLen: '11' }), user);

  expect(restored).toMatchObject({ trackCycle: true, avgCycleLen: '28', avgPeriodLen: '5' });
});

it('uses defaults when both hidden and canonical cycle lengths are invalid', () => {
  const restored = restoreCycleLengths(
    draft({ trackCycle: false, avgCycleLen: '', avgPeriodLen: '' }),
    { ...user, avgCycleLen: 99, avgPeriodLen: 99 },
  );

  expect(restored).toMatchObject({ trackCycle: true, avgCycleLen: '28', avgPeriodLen: '5' });
});
