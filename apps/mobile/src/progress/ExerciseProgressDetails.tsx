import { StyleSheet, Text, View } from 'react-native';
import type { components } from '@evry/api-client';
import { AppIcon } from '../ui/icon';
import { Card, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { signedMetric } from './progress-view';

type Progress = components['schemas']['ExerciseProgress'];
const date = (value: string) => new Date(value).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
const metric = (value: number | null) => value === null ? 'Sin datos' : `${value} kg`;

export function ExerciseProgressDetails({ summary, comparison, points, history }: Pick<Progress, 'summary' | 'comparison' | 'points'> & { history: Progress['history']['items'] }) {
  return <View style={styles.container}>
    <Card style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <AppIcon color={theme.colors.primary} name="insights" size={19} />
        </View>
        <Text style={styles.cardTitle}>Resumen del ejercicio</Text>
      </View>
      <Text style={textStyles.body}>{summary.sessionsCount} sesiones · {summary.workingSetsCount} series · {summary.volumeKg} kg de volumen</Text>
      <View style={styles.records}>
        <RecordRow
          icon="monitor_weight"
          label="Mejor peso"
          value={summary.bestWeight ? `${summary.bestWeight.weightKg} kg` : 'Sin récord de peso'}
          muted={!summary.bestWeight}
        />
        <RecordRow
          icon="stacked_bar_chart"
          label="Mejor serie"
          value={summary.repetitionRecord ? `${summary.repetitionRecord.reps} repeticiones` : 'Sin récord de repeticiones'}
          muted={!summary.repetitionRecord}
        />
        <RecordRow
          icon="trending_up"
          label="1RM estimado"
          value={summary.estimated1RM ? `${summary.estimated1RM.valueKg} kg` : 'Sin estimación de 1RM'}
          muted={!summary.estimated1RM}
        />
      </View>
    </Card>

    <Card style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <AppIcon color={theme.colors.primary} name="compare_arrows" size={19} />
        </View>
        <Text style={styles.cardTitle}>Frente al periodo anterior</Text>
      </View>
      {comparison ? <>
        <Text style={textStyles.body}>{signedMetric(comparison.delta.sessionsCount)} sesiones</Text>
        <Text style={textStyles.body}>{signedMetric(comparison.delta.volumeKg)} kg de volumen</Text>
        <Text style={styles.caption}>Las cifras negativas indican menos actividad, no un juicio sobre tu entrenamiento.</Text>
      </> : <Text style={textStyles.muted}>Sin periodo anterior comparable.</Text>}
    </Card>

    <Card style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <AppIcon color={theme.colors.primary} name="show_chart" size={19} />
        </View>
        <Text style={styles.cardTitle}>Evolución</Text>
      </View>
      {points.length === 0 ? <Text style={textStyles.muted}>Sin actividad en este periodo.</Text> : null}
      {points.map((point) => <View key={`${point.from}:${point.to}`} style={styles.point}>
        <Text style={styles.pointDate}>{date(point.from)} – {date(point.to)}</Text>
        <Text style={textStyles.body}>{point.sessionsCount} sesiones · {point.volumeKg} kg de volumen</Text>
        <Text style={textStyles.muted}>Máximo: {metric(point.maxWeightKg)} · 1RM estimado: {metric(point.estimated1RMKg)}</Text>
      </View>)}
    </Card>

    <Card style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <AppIcon color={theme.colors.primary} name="history" size={19} />
        </View>
        <Text style={styles.cardTitle}>Historial</Text>
      </View>
      {history.length === 0 ? <Text style={textStyles.muted}>Sin sesiones registradas en este periodo.</Text> : null}
      {history.map((workout) => <View key={workout.workoutId} style={styles.workout}>
        <Text style={styles.workoutName}>{workout.workoutName} · {date(workout.endedAt)}</Text>
        {workout.sets.map((set) => <View key={set.id} style={styles.setRow}>
          {set.weightKg !== null ? <Text style={styles.setChip}>{set.weightKg} kg</Text> : null}
          {set.reps !== null ? <Text style={styles.setChip}>{set.reps} repeticiones</Text> : null}
          {set.durationS !== null ? <Text style={styles.setChip}>{set.durationS} s</Text> : null}
          {set.rpe !== null ? <Text style={styles.setChip}>RPE {set.rpe}</Text> : null}
        </View>)}
      </View>)}
    </Card>
  </View>;
}

function RecordRow({ icon, label, value, muted }: {
  icon: Parameters<typeof AppIcon>[0]['name'];
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <View style={styles.recordRow}>
      <View style={[styles.recordIcon, muted && styles.recordIconMuted]}>
        <AppIcon color={muted ? theme.colors.textDim : theme.colors.primary} name={icon} size={16} />
      </View>
      <Text style={styles.recordLabel}>{label}</Text>
      <Text style={[styles.recordValue, muted && styles.recordValueMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cardTitle: { color: theme.colors.text, flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  records: { gap: 6 },
  recordRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  recordIconMuted: { backgroundColor: theme.colors.surfaceHighest },
  recordLabel: { color: theme.colors.textMuted, flex: 1, fontSize: 12, fontWeight: '600' },
  recordValue: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  recordValueMuted: { color: theme.colors.textDim, fontWeight: '600' },
  caption: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
  point: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingTop: theme.spacing.sm,
  },
  pointDate: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  workout: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: theme.spacing.sm,
  },
  workoutName: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  setRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setChip: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
