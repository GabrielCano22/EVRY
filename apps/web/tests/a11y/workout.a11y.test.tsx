import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { expect, test, vi } from 'vitest';
import { SetEditDialog } from '@/components/workouts/SetEditDialog';
import type { WorkoutSet } from '@/lib/training-api';

const set: WorkoutSet = {
  id: 'set-a',
  workoutId: 'workout-a',
  exerciseId: 'exercise-a',
  order: 1,
  weightKg: 40,
  reps: 8,
  durationS: null,
  rpe: 7,
  isWarmup: false,
  completedAt: '2026-09-22T12:00:00.000Z',
  clientMutationId: 'mutation-a',
  clientId: null,
  revision: 1,
  techniqueStable: true,
  updatedAt: '2026-09-22T12:00:00.000Z',
  exercise: {
    id: 'exercise-a', sourceId: null, name: 'barbell squat', muscleGroup: 'QUADS',
    equipment: 'BARBELL', category: 'upper legs', bodyPart: 'upper legs', target: 'quads',
    secondaryMuscles: [], equipmentLabel: 'barbell', isCustom: false, ownerId: null,
    isCompound: true, tags: [], description: null, mediaId: null, imagePath: null, gifPath: null,
    attribution: null, instructions: null, instructionSteps: null,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
};

test('set editor has a named modal and labelled controls without detectable violations', async () => {
  render(
    <SetEditDialog
      ordinal={1}
      set={set}
      pending={false}
      error={null}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
    />,
  );

  const dialog = screen.getByRole('dialog', { name: 'Editar serie 1' });
  const results = await axe(dialog, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations).toHaveLength(0);
});
