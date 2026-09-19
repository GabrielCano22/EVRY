import type { ExerciseDetail } from '@/lib/training-api';
import type { ExerciseProgress } from '@/lib/progress-api';

export const detail: ExerciseDetail = {
  id: 'squat', name: 'Sentadilla', sourceId: null, muscleGroup: 'QUADS', equipment: 'BARBELL',
  category: 'upper legs', bodyPart: 'upper legs', target: 'quads', secondaryMuscles: ['glutes'],
  equipmentLabel: 'barbell', isCustom: false, ownerId: null, isCompound: true, tags: [],
  description: 'Ejercicio de piernas.', mediaId: 'squat', imagePath: '/media/squat.jpg',
  gifPath: '/media/squat.gif', imageUrl: '/media/squat.jpg', gifUrl: '/media/squat.gif',
  attribution: 'Fuente del catálogo', instructions: null,
  instructionSteps: { es: ['Desciende con control.'] }, createdAt: '2026-09-01T00:00:00Z',
};
export const progress: ExerciseProgress = {
  exerciseId: 'squat', period: { key: '30d', from: '2026-08-01', to: '2026-08-30', timezone: 'America/Bogota' },
  summary: { sessionsCount: 2, workingSetsCount: 2, volumeKg: 100, bestWeight: null, repetitionRecord: null, estimated1RM: null },
  comparison: { period: { from: '2026-07-02', to: '2026-07-31' },
    previous: { sessionsCount: 1, workingSetsCount: 1, volumeKg: 50, bestWeightKg: null, estimated1RMKg: null },
    delta: { sessionsCount: 1, workingSetsCount: 1, volumeKg: 50, bestWeightKg: null, estimated1RMKg: null } },
  points: [], history: { items: [{ workoutId: 'w1', workoutName: 'Primera sesión', startedAt: '2026-08-30T12:00:00Z', endedAt: '2026-08-30T13:00:00Z', sets: [] }], page: 1, limit: 10, total: 2, hasMore: true, nextCursor: 'opaque-token' },
};
export const account = { id: 'detail-a', email: 'a@example.test', name: 'Ana', biologicalSex: 'PREFER_NOT_SAY' as const, birthDate: null, goals: [], trackCycle: false, avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-09-01' };
