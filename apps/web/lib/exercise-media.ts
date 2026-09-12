import type { components } from '@evry/api-client';
import { resolveApiOrigin } from './api-origin';

type ExerciseEntity = components['schemas']['ExerciseEntity'];
type ExerciseListItem = components['schemas']['ExerciseListItemDto'];

export type ExerciseMediaSource = Pick<ExerciseEntity, 'imagePath' | 'gifPath'>
  & Partial<Pick<ExerciseListItem, 'imageUrl' | 'gifUrl'>>;

export type ExerciseInstructionSource = {
  instructions?: unknown;
  instructionSteps?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getExerciseMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${resolveApiOrigin()}/${url.trim().replace(/^\/+/, '')}`;
}

export function getExerciseInstruction(exercise: ExerciseInstructionSource, locale = 'es') {
  const localized = (value: unknown) => {
    if (!isRecord(value)) return undefined;
    return locale in value ? value[locale] : 'en' in value ? value.en : undefined;
  };
  const steps = localized(exercise.instructionSteps);
  if (Array.isArray(steps)) return steps.filter((step): step is string => typeof step === 'string');
  const text = localized(exercise.instructions);
  return typeof text === 'string' && text ? [text] : [];
}

export function exerciseImageUrl(exercise: ExerciseMediaSource) {
  return getExerciseMediaUrl(exercise.imageUrl ?? exercise.imagePath);
}

export function exerciseGifUrl(exercise: ExerciseMediaSource) {
  return getExerciseMediaUrl(exercise.gifUrl ?? exercise.gifPath);
}
