import type { components } from '@evry/api-client';
import { apiError, assertCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';

export type CreateRoutineInput = components['schemas']['CreateRoutineDto'];
export type UpdateRoutineInput = components['schemas']['UpdateRoutineDto'];
export type Routine = components['schemas']['Routine'];

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === 'number' && Number.isFinite(value) || value === null;
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  const item = record(value);
  return Boolean(item && Object.values(item).every(isJsonValue));
}

function isExerciseEntity(value: unknown): boolean {
  const item = record(value);
  const muscleGroups = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'CORE', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'FULL_BODY', 'CARDIO'];
  const equipment = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER'];
  return Boolean(item && typeof item.id === 'string' && isNullableString(item.sourceId) && typeof item.name === 'string' &&
    typeof item.muscleGroup === 'string' && muscleGroups.includes(item.muscleGroup) &&
    typeof item.equipment === 'string' && equipment.includes(item.equipment) && isNullableString(item.category) &&
    isNullableString(item.bodyPart) && isNullableString(item.target) && Array.isArray(item.secondaryMuscles) && item.secondaryMuscles.every((item) => typeof item === 'string') &&
    isNullableString(item.equipmentLabel) && typeof item.isCustom === 'boolean' && isNullableString(item.ownerId) &&
    typeof item.isCompound === 'boolean' && Array.isArray(item.tags) && item.tags.every((item) => typeof item === 'string') &&
    isNullableString(item.description) && isNullableString(item.mediaId) && isNullableString(item.imagePath) &&
    isNullableString(item.gifPath) && isNullableString(item.attribution) && isJsonValue(item.instructions) &&
    isJsonValue(item.instructionSteps) && typeof item.createdAt === 'string');
}

function isSeriesPlan(value: unknown): boolean {
  return value === null || Array.isArray(value) && value.every((plan) => {
    const item = record(plan);
    return Boolean(item && (!Object.hasOwn(item, 'reps') || isNullableNumber(item.reps)) &&
      (!Object.hasOwn(item, 'weightKg') || isNullableNumber(item.weightKg)));
  });
}

function isRoutineExercise(value: unknown): boolean {
  const item = record(value);
  return Boolean(item && typeof item.id === 'string' && typeof item.routineId === 'string' &&
    typeof item.exerciseId === 'string' && typeof item.order === 'number' && Number.isFinite(item.order) &&
    typeof item.targetSets === 'number' && Number.isFinite(item.targetSets) &&
    isNullableNumber(item.targetReps) && isNullableNumber(item.targetWeightKg) &&
    isNullableString(item.notes) && isSeriesPlan(item.seriesPlan) && isExerciseEntity(item.exercise));
}

function isRoutine(value: unknown): value is Routine {
  const item = record(value);
  return Boolean(item && typeof item.id === 'string' && typeof item.userId === 'string' &&
    typeof item.name === 'string' && isNullableNumber(item.dayOfWeek) && isNullableString(item.notes) &&
    typeof item.createdAt === 'string' && typeof item.updatedAt === 'string' && Array.isArray(item.exercises) &&
    item.exercises.every(isRoutineExercise));
}

function mutationError(error: unknown, fallback: string, status: number): Error {
  return apiError(error, fallback, status);
}

export async function createRoutine(session: MobileSession, body: CreateRoutineInput): Promise<Routine> {
  assertCurrentMobileSession(session);
  const response = await withMobileAuth((client) => client.POST('/routines', { body }), session);
  assertCurrentMobileSession(session);
  if (!response.response.ok || response.error) throw mutationError(response.error, 'No se pudo crear la rutina.', response.response.status);
  if (!isRoutine(response.data)) throw mutationError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió una rutina incompatible. Reintenta.' }, '', response.response.status);
  return response.data;
}

export async function updateRoutine(session: MobileSession, id: string, body: UpdateRoutineInput): Promise<Routine> {
  assertCurrentMobileSession(session);
  const response = await withMobileAuth((client) => client.PATCH('/routines/{id}', { params: { path: { id } }, body }), session);
  assertCurrentMobileSession(session);
  if (!response.response.ok || response.error) throw mutationError(response.error, 'No se pudo actualizar la rutina.', response.response.status);
  if (!isRoutine(response.data)) throw mutationError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió una rutina incompatible. Reintenta.' }, '', response.response.status);
  return response.data;
}

export async function deleteRoutine(session: MobileSession, id: string): Promise<void> {
  assertCurrentMobileSession(session);
  const response = await withMobileAuth((client) => client.DELETE('/routines/{id}', { params: { path: { id } } }), session);
  assertCurrentMobileSession(session);
  if (!response.response.ok || response.error) throw mutationError(response.error, 'No se pudo eliminar la rutina.', response.response.status);
  if (response.data?.ok !== true) throw mutationError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió una respuesta incompatible. Reintenta.' }, '', response.response.status);
}
