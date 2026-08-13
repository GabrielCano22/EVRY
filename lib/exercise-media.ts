import type { Ejercicio } from './types';

function apiOrigin() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').trim();
  return apiUrl.replace(/\/api(?:\/.*)?\/?$/, '').replace(/\/$/, '');
}

export function getExerciseMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiOrigin()}/${url.trim().replace(/^\/+/, '')}`;
}

export function getExerciseInstruction(exercise: Ejercicio, locale = 'es') {
  const steps = exercise.instructionSteps?.[locale] ?? exercise.instructionSteps?.en;
  if (steps?.length) return steps;
  const text = exercise.instructions?.[locale] ?? exercise.instructions?.en;
  return text ? [text] : [];
}

export function exerciseImageUrl(exercise: Ejercicio) {
  return getExerciseMediaUrl(exercise.imageUrl ?? exercise.imagePath);
}

export function exerciseGifUrl(exercise: Ejercicio) {
  return getExerciseMediaUrl(exercise.gifUrl ?? exercise.gifPath);
}
