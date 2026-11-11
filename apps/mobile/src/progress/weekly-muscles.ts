import { civilDate, parseCivilDate, timestampToLocalCivil, type CivilDate } from '@evry/domain';
import type { components } from '@evry/api-client';
import type { LocalWorkout, LocalWorkoutSet } from '../training/workout-domain';
import { summarizeRecordedMuscles } from '../training/muscle-summary';

type Workout = components['schemas']['Workout'];
type MuscleGroup = components['schemas']['ExerciseListItemDto']['muscleGroup'];

/** Inclusive Monday-to-today interval in the application's Bogotá civil calendar. */
export function currentWeekRange(today: CivilDate) {
  const { year, month, day } = parseCivilDate(today);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const from = civilDate(`${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`);
  return { from, to: today };
}

export function weeklyMuscleSummary(
  workouts: readonly Workout[],
  activeSets: readonly LocalWorkoutSet[],
  activeExercises: readonly { id: string; muscleGroup: MuscleGroup }[],
  range: { from: CivilDate; to: CivilDate },
  pendingWorkouts: readonly LocalWorkout[] = [],
) {
  const counts = new Map<MuscleGroup, number>();
  let unclassifiedSets = 0;
  const add = (summary: ReturnType<typeof summarizeRecordedMuscles>) => {
    for (const { muscleGroup, workingSets } of summary.groups) counts.set(muscleGroup, (counts.get(muscleGroup) ?? 0) + workingSets);
    unclassifiedSets += summary.unclassifiedSets;
  };
  const localIds = new Set(pendingWorkouts.map((workout) => workout.clientId));
  for (const workout of workouts) {
    if (workout.status !== 'COMPLETED' || !workout.endedAt || workout.cancelledAt) continue;
    if (workout.clientId && localIds.has(workout.clientId)) continue;
    const ended = timestampToLocalCivil(workout.endedAt);
    if (ended < range.from || ended > range.to) continue;
    add(summarizeRecordedMuscles(workout.sets, workout.sets.map((set) => set.exercise)));
  }
  for (const workout of pendingWorkouts) {
    if (workout.status !== 'COMPLETED' || !workout.endedAt || workout.cancelledAt) continue;
    const ended = timestampToLocalCivil(workout.endedAt);
    if (ended < range.from || ended > range.to) continue;
    add(summarizeRecordedMuscles(workout.sets, activeExercises));
  }
  const inWeek = activeSets.filter((set) => {
    // A set only happened once it is ticked; unchecked rows stay out of the week.
    if (set.completedAt === null) return false;
    try { const day = timestampToLocalCivil(set.completedAt); return day >= range.from && day <= range.to; }
    catch { return false; }
  });
  add(summarizeRecordedMuscles(inWeek, activeExercises));
  return { groups: [...counts].map(([muscleGroup, workingSets]) => ({ muscleGroup, workingSets })), unclassifiedSets };
}
