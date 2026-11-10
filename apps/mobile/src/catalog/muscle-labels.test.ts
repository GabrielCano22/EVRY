import { muscleGroupLabel, muscleTargetLabel } from './muscle-labels';

it('uses natural Spanish names without changing the muscle identifiers', () => {
  expect(muscleGroupLabel('CHEST')).toBe('Pecho');
  expect(muscleGroupLabel('QUADS')).toBe('Cuádriceps');
  expect(muscleGroupLabel('HAMSTRINGS')).toBe('Isquiotibiales');
  expect(muscleGroupLabel('FULL_BODY')).toBe('Cuerpo completo');
  expect(muscleGroupLabel('__proto__' as 'CHEST')).toBe('Grupo sin clasificar');
});

it('translates known catalog targets and preserves unknown or custom wording', () => {
  expect(muscleTargetLabel('quads', 'QUADS')).toBe('Cuádriceps');
  expect(muscleTargetLabel(' LATS ', 'BACK')).toBe('Dorsales');
  expect(muscleTargetLabel('Cuádriceps', 'QUADS')).toBe('Cuádriceps');
  expect(muscleTargetLabel('zona personalizada', 'BACK')).toBe('zona personalizada');
  expect(muscleTargetLabel('__proto__', 'BACK')).toBe('__proto__');
  expect(muscleTargetLabel(null, 'BACK')).toBe('Espalda');
});
