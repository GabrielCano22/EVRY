import type { Exercise } from '../catalog/catalog';
import type { LocalWorkoutSet } from './workout-domain';

type MuscleGroup = Exercise['muscleGroup'];
type ExerciseMuscle = Pick<Exercise, 'id' | 'muscleGroup'>;
type RecordedSet = Pick<LocalWorkoutSet, 'exerciseId' | 'reps' | 'durationS' | 'isWarmup'>;

export function summarizeRecordedMuscles(sets: readonly RecordedSet[], exercises: readonly ExerciseMuscle[]) {
  const byExercise = new Map(exercises.map((exercise) => [exercise.id, exercise.muscleGroup]));
  const counts = new Map<MuscleGroup, number>();
  let unclassifiedSets = 0;
  for (const set of sets) {
    if (set.isWarmup || !((set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0)) continue;
    const group = byExercise.get(set.exerciseId);
    if (!group) { unclassifiedSets += 1; continue; }
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return {
    groups: [...counts.entries()].map(([muscleGroup, workingSets]) => ({ muscleGroup, workingSets }))
      .sort((a, b) => b.workingSets - a.workingSets || a.muscleGroup.localeCompare(b.muscleGroup)),
    unclassifiedSets,
  };
}
