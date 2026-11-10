import type { components } from '@evry/api-client';

type MuscleGroup = components['schemas']['MuscleDistribution']['muscleGroup'];

const labels: Record<MuscleGroup, string> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebrazos',
  CORE: 'Abdomen',
  QUADS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CALVES: 'Pantorrillas',
  FULL_BODY: 'Cuerpo completo',
  CARDIO: 'Cardio',
};

export function muscleGroupLabel(group: MuscleGroup): string {
  return Object.prototype.hasOwnProperty.call(labels, group) ? labels[group] : 'Grupo sin clasificar';
}

const targetLabels = new Map<string, string>([
  ['abs', 'Abdomen'], ['biceps', 'Bíceps'], ['calves', 'Pantorrillas'],
  ['delts', 'Deltoides'], ['forearms', 'Antebrazos'], ['glutes', 'Glúteos'],
  ['hamstrings', 'Isquiotibiales'], ['lats', 'Dorsales'], ['pectorals', 'Pectorales'],
  ['quads', 'Cuádriceps'], ['traps', 'Trapecios'], ['triceps', 'Tríceps'],
]);

export function muscleTargetLabel(target: string | null, group: MuscleGroup): string {
  const value = target?.trim();
  return value ? (targetLabels.get(value.toLowerCase()) ?? value) : muscleGroupLabel(group);
}
