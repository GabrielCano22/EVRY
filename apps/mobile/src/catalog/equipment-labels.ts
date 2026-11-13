import type { components } from '@evry/api-client';

type Equipment = components['schemas']['ExerciseListItemDto']['equipment'];

const labels: Record<Equipment, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Mancuernas',
  MACHINE: 'Máquina',
  CABLE: 'Polea',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Pesa rusa',
  BAND: 'Banda elástica',
  OTHER: 'Otro',
};

export function equipmentLabel(equipment: Equipment): string {
  return Object.prototype.hasOwnProperty.call(labels, equipment) ? labels[equipment] : 'Otro';
}

export const EQUIPMENT_OPTIONS = Object.keys(labels) as Equipment[];
