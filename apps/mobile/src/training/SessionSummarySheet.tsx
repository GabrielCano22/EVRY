import { setTypeOf } from '@evry/domain';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppIcon } from '../ui/icon';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { formatDuration } from './format-rest';
import type { LocalWorkout } from './workout-domain';
import type { ExerciseInsight } from './use-exercise-insights';

export interface SessionSummaryExercise {
  id: string;
  name: string;
  bestWeightKg: number | null;
  bestReps: number | null;
  previousBestWeightKg: number | null;
  record: boolean;
}

export interface SessionSummary {
  name: string;
  durationMs: number;
  volumeKg: number;
  completedSets: number;
  exercises: SessionSummaryExercise[];
  records: number;
}

function bestWeight(values: readonly (number | null)[]): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  return valid.length > 0 ? Math.max(...valid) : null;
}

/**
 * Captures the session before `finishWorkout` clears it. A record is claimed
 * only when there is a real previous best to compare against; a first session
 * is progress, not a record.
 */
export function buildSessionSummary(
  workout: LocalWorkout,
  info: Map<string, { name: string }>,
  insights: Record<string, ExerciseInsight>,
  now = Date.now(),
): SessionSummary {
  const completed = workout.sets.filter((set) => set.completedAt !== null
    && setTypeOf(set) !== 'WARMUP'
    && ((set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0));
  const volumeKg = completed.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const ids = [...new Set(completed.map((set) => set.exerciseId))];
  const exercises = ids.map((id) => {
    const sets = completed.filter((set) => set.exerciseId === id);
    const sessionBest = bestWeight(sets.map((set) => set.weightKg));
    const previousBest = bestWeight((insights[id]?.previous ?? []).map((set) => set.weightKg));
    const bestSet = sets.reduce<{ weight: number | null; reps: number | null }>((best, set) => {
      if (set.weightKg === null) return best;
      if (best.weight === null || set.weightKg > best.weight) return { weight: set.weightKg, reps: set.reps };
      return best;
    }, { weight: null, reps: null });
    return {
      id,
      name: info.get(id)?.name ?? 'Ejercicio',
      bestWeightKg: sessionBest,
      bestReps: bestSet.reps,
      previousBestWeightKg: previousBest,
      record: sessionBest !== null && previousBest !== null && sessionBest > previousBest,
    };
  });
  return {
    name: workout.name,
    durationMs: Math.max(0, now - new Date(workout.startedAt).getTime()),
    volumeKg,
    completedSets: completed.length,
    exercises,
    records: exercises.filter((exercise) => exercise.record).length,
  };
}

export function SessionSummarySheet({ summary, onClose }: {
  summary: SessionSummary | null;
  onClose: () => void;
}) {
  return <BottomSheet
    footer={<PrimaryButton onPress={onClose}>Hecho</PrimaryButton>}
    onClose={onClose}
    subtitle="Guardada en este dispositivo; se sincronizará al reconectar."
    title="Sesión completada"
    visible={summary !== null}
  >
    {summary ? <View style={styles.body}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <AppIcon color={theme.colors.success} name="check" size={26} />
        </View>
        <Text style={styles.heroTitle}>{summary.name}</Text>
        <Text style={textStyles.muted}>Buen trabajo. Esto es lo que registraste.</Text>
      </View>
      <View style={styles.metrics}>
        <Metric label="Duración" value={formatDuration(summary.durationMs)} />
        <Metric label="Volumen" value={`${summary.volumeKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`} />
        <Metric label="Series" value={String(summary.completedSets)} />
      </View>
      {summary.records > 0 ? <View style={styles.records}>
        <View style={styles.recordsHeader}>
          <AppIcon color={theme.colors.warning} name="emoji_events" size={19} />
          <Text style={styles.recordsTitle}>{summary.records === 1 ? 'Nuevo récord' : `${summary.records} nuevos récords`}</Text>
        </View>
        {summary.exercises.filter((exercise) => exercise.record).map((exercise) => <View key={exercise.id} style={styles.recordRow}>
          <Text style={styles.recordName}>{exercise.name}</Text>
          <Text style={styles.recordValue}>{exercise.bestWeightKg} kg</Text>
          <Text style={styles.recordPrevious}>antes {exercise.previousBestWeightKg} kg</Text>
        </View>)}
      </View> : <Text style={textStyles.muted}>
        Sin récords nuevos hoy. La sesión quedó guardada y cuenta para tu progreso.
      </Text>}
      {summary.exercises.length > 0 ? <View style={styles.exerciseList}>
        <Text style={styles.exerciseListTitle}>Mejor serie por ejercicio</Text>
        {summary.exercises.map((exercise) => <View key={exercise.id} style={styles.exerciseRow}>
          <Text numberOfLines={1} style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseValue}>
            {exercise.bestWeightKg !== null ? `${exercise.bestWeightKg} kg` : 'Sin peso'}
            {exercise.bestReps !== null ? ` × ${exercise.bestReps}` : ''}
          </Text>
        </View>)}
      </View> : null}
    </View> : null}
  </BottomSheet>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing.md },
  hero: { alignItems: 'center', gap: 4, paddingTop: theme.spacing.xs },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radii.full,
    height: 58,
    justifyContent: 'center',
    marginBottom: 4,
    width: 58,
  },
  heroTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  metrics: { flexDirection: 'row', gap: theme.spacing.sm },
  metric: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.lg,
    flex: 1,
    gap: 3,
    padding: 10,
  },
  metricLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { color: theme.colors.text, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800' },
  records: { backgroundColor: theme.colors.warningSoft, borderRadius: theme.radii.lg, gap: 6, padding: theme.spacing.md },
  recordsHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  recordsTitle: { color: theme.colors.warning, fontSize: 15, fontWeight: '800' },
  recordRow: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recordName: { color: theme.colors.text, flex: 1, fontSize: 14, fontWeight: '700' },
  recordValue: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  recordPrevious: { color: theme.colors.textMuted, fontSize: 11 },
  exerciseList: { gap: 6 },
  exerciseListTitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  exerciseRow: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: 8,
  },
  exerciseName: { color: theme.colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
  exerciseValue: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '700' },
});
