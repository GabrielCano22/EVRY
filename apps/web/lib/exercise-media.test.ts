import { afterEach, expect, it, vi } from 'vitest';
import { getExerciseMediaUrl } from './exercise-media';

afterEach(() => {
  vi.unstubAllEnvs();
});

it('resuelve medios relativos con el origen derivado de la variable pública canónica', () => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', ' https://media.example.test/api/ ');

  expect(getExerciseMediaUrl('/media/exercises/images/squat.jpg')).toBe(
    'https://media.example.test/media/exercises/images/squat.jpg',
  );
});
