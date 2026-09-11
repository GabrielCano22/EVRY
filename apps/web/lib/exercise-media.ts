import type { Ejercicio } from './types';
import { resolveApiOrigin } from './api-origin';

export type ExerciseMediaSource = Pick<
  Ejercicio,
  'imageUrl' | 'imagePath' | 'gifUrl' | 'gifPath'
>;

export function getExerciseMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${resolveApiOrigin()}/${url.trim().replace(/^\/+/, '')}`;
}

export function getExerciseInstruction(exercise: Ejercicio, locale = 'es') {
  const steps = exercise.instructionSteps?.[locale] ?? exercise.instructionSteps?.en;
  if (steps?.length) return steps;
  const text = exercise.instructions?.[locale] ?? exercise.instructions?.en;
  return text ? [text] : [];
}

export function exerciseImageUrl(exercise: ExerciseMediaSource) {
  return getExerciseMediaUrl(exercise.imageUrl ?? exercise.imagePath);
}

export function exerciseGifUrl(exercise: ExerciseMediaSource) {
  return getExerciseMediaUrl(exercise.gifUrl ?? exercise.gifPath);
}
