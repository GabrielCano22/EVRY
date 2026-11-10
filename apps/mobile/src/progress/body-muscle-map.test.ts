import { bodyMapParts, muscleShade } from './body-muscle-map';

it('uses bounded relative levels without inventing activity', () => {
  expect(muscleShade(0, 8)).toBe('#4A505A');
  expect(muscleShade(1, 9)).toBe('#245F94');
  expect(muscleShade(4, 9)).toBe('#197CC8');
  expect(muscleShade(9, 9)).toBe('#168DFF');
  expect(muscleShade(Number.NaN, 9)).toBe('#4A505A');
  expect(muscleShade(2, 0)).toBe('#4A505A');
});

it('maps only known primary groups and does not color whole-body or cardio regions', () => {
  expect(bodyMapParts([
    { muscleGroup: 'CHEST', workingSets: 3 },
    { muscleGroup: 'CORE', workingSets: 1 },
    { muscleGroup: 'FULL_BODY', workingSets: 200 },
    { muscleGroup: 'CARDIO', workingSets: 200 },
  ])).toEqual([
    { slug: 'chest', color: '#168DFF' },
    { slug: 'abs', color: '#245F94' },
    { slug: 'obliques', color: '#245F94' },
  ]);
});

it('ignores invalid values and combines duplicate groups deterministically', () => {
  expect(bodyMapParts([
    { muscleGroup: 'BACK', workingSets: 1 },
    { muscleGroup: 'BACK', workingSets: 2 },
    { muscleGroup: 'CHEST', workingSets: Number.NaN },
    { muscleGroup: 'BICEPS', workingSets: -1 },
    { muscleGroup: '__proto__' as 'CHEST', workingSets: 4 },
  ])).toEqual([{ slug: 'upper-back', color: '#168DFF' }, { slug: 'lower-back', color: '#168DFF' }]);
});
