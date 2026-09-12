import { afterEach, expect, it, vi } from 'vitest';
import { getExerciseInstruction, getExerciseMediaUrl } from './exercise-media';

afterEach(() => {
  vi.unstubAllEnvs();
});

it('resuelve medios relativos con el origen derivado de la variable pública canónica', () => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', ' https://media.example.test/api/ ');

  expect(getExerciseMediaUrl('/media/exercises/images/squat.jpg')).toBe(
    'https://media.example.test/media/exercises/images/squat.jpg',
  );
});

it('lee pasos localizados desde el JSON generado y usa inglés como respaldo', () => {
  expect(getExerciseInstruction({
    instructionSteps: { es: ['Ajusta la barra.', 'Desciende con control.'] },
  })).toEqual(['Ajusta la barra.', 'Desciende con control.']);

  expect(getExerciseInstruction({
    instructions: { en: 'Keep a neutral spine.' },
  })).toEqual(['Keep a neutral spine.']);
});

it('ignora instrucciones JSON malformadas sin inventar contenido', () => {
  expect(getExerciseInstruction({
    instructionSteps: { es: ['Paso válido', 42, null] },
    instructions: { es: ['no es texto'] },
  })).toEqual(['Paso válido']);
  expect(getExerciseInstruction({ instructionSteps: 'inválido' })).toEqual([]);
});
