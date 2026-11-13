import { useState } from 'react';
import { useSessionStore } from '@/src/auth/session-store';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { withMobileAuth, type MobileSession } from '@/src/api/client';
import { buildOverviewCards, signedMetric } from '@/src/progress/progress-view';
import { Card, PrimaryButton, Screen, ScreenHeader, SectionHeader, textStyles } from '@/src/ui/components';
import { AppIcon } from '@/src/ui/icon';
import { theme } from '@/src/ui/theme';
import { ExerciseProgressPanel } from '@/src/progress/ExerciseProgressPanel';
import { muscleGroupLabel } from '@/src/catalog/muscle-labels';
import { WeeklyMuscleMap } from '@/src/progress/WeeklyMuscleMap';
import { ActivityCalendar } from '@/src/progress/ActivityCalendar';

type Period = '30d' | '90d' | '6m' | '1y' | 'all';
type ProgressOverview = components['schemas']['ProgressOverview'];

const periods: { key: Period; label: string }[] = [
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '6m', label: '6 meses' },
  { key: '1y', label: '1 año' },
  { key: 'all', label: 'Todo' },
];

async function loadOverview(session: MobileSession, period: Period, signal: AbortSignal): Promise<ProgressOverview> {
  const response = await withMobileAuth((client) => client.GET('/progress/overview', { params: { query: { period } }, signal }), session);
  if (!response.data || response.error) throw new Error('No se pudo cargar el progreso.');
  return response.data;
}

export default function ProgressScreen() {
  const session = useSessionStore((state) => state.session)!;
  const sex = useSessionStore((state) => state.user?.biologicalSex);
  const trackCycle = useSessionStore((state) => state.user?.trackCycle ?? false);
  const [period, setPeriod] = useState<Period>('30d');
  const query = useQuery({ queryKey: ['progress', period], queryFn: ({ signal }) => loadOverview(session, period, signal) });
  const overview = query.data;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="TU EVOLUCIÓN"
        subtitle="Métricas del periodo seleccionado contra el periodo anterior equivalente."
        title="Progreso"
      />
      <ActivityCalendar key={`${session.userId}:${session.version}`} session={session} streakDays={overview?.streakDays ?? null} trackCycle={trackCycle} />
      <View accessibilityRole="tablist" style={styles.periods}>
        {periods.map((option) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: period === option.key }}
            key={option.key}
            onPress={() => setPeriod(option.key)}
            style={[styles.period, period === option.key && styles.periodSelected]}
          >
            <Text style={period === option.key ? styles.periodTextSelected : styles.periodText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? <Text style={textStyles.muted}>Cargando métricas…</Text> : null}
      {query.isError ? (
        <Card style={styles.errorCard} tone="error">
          <Text accessibilityRole="alert" style={textStyles.error}>No pudimos cargar el progreso.</Text>
          <PrimaryButton onPress={() => void query.refetch()} variant="secondary">Reintentar</PrimaryButton>
        </Card>
      ) : null}

      <WeeklyMuscleMap session={session} sex={sex} />

      {overview ? (
        <>
          <View style={styles.grid}>
            {buildOverviewCards(overview.summary).map((card) => (
              <View key={card.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{card.label}</Text>
                <Text style={styles.metricValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <Card style={styles.card}>
            <View style={styles.cardTitleRow}>
              <AppIcon color={theme.colors.primary} name="trending_up" size={19} />
              <Text style={styles.cardTitle}>Cambio frente al periodo anterior</Text>
            </View>
            {overview.comparison ? (
              <>
                <Text style={textStyles.body}>{signedMetric(overview.comparison.delta.sessionsCompleted)} sesiones</Text>
                <Text style={textStyles.body}>{signedMetric(overview.comparison.delta.volumeKg)} kg de volumen</Text>
                <Text style={styles.caption}>Las cifras negativas indican menos actividad, no un juicio sobre tu entrenamiento.</Text>
              </>
            ) : <Text style={textStyles.muted}>El periodo completo no tiene una ventana anterior comparable.</Text>}
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardTitleRow}>
              <AppIcon color={theme.colors.primary} name="bar_chart" size={19} />
              <Text style={styles.cardTitle}>Distribución muscular</Text>
            </View>
            <Text style={textStyles.muted}>Series útiles por grupo muscular principal durante el periodo seleccionado.</Text>
            {overview.muscleDistribution.length === 0 ? <Text style={textStyles.muted}>Aún no hay series útiles en este periodo.</Text> : null}
            {overview.muscleDistribution.map((item) => (
              <View key={item.muscleGroup} style={styles.row}>
                <View style={styles.distributionHeader}>
                  <Text style={textStyles.body}>{muscleGroupLabel(item.muscleGroup)}</Text>
                  <Text style={styles.rowMeta}>{item.workingSets} series · {item.percentage}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, item.percentage))}%` }]} />
                </View>
              </View>
            ))}
          </Card>

          {overview.records.length > 0 ? (
            <Card style={styles.card}>
              <View style={styles.cardTitleRow}>
                <AppIcon color={theme.colors.warning} name="emoji_events" size={19} />
                <Text style={styles.cardTitle}>Récords del periodo</Text>
              </View>
              {overview.records.slice(0, 5).map((record) => (
                <View key={`${record.exerciseId}-${record.kind}`} style={styles.row}>
                  <Text style={textStyles.body}>{record.exerciseName}</Text>
                  <Text style={styles.rowMeta}>{record.value} · {record.kind.replaceAll('_', ' ')}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
      <SectionHeader detail="Historial y récords por ejercicio." title="Detalle" />
      <ExerciseProgressPanel key={`${session.userId}:${session.version}`} session={session} period={period} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardTitle: { color: theme.colors.text, flex: 1, fontSize: 17, fontWeight: '700' },
  errorCard: { gap: theme.spacing.sm },
  barFill: { backgroundColor: theme.colors.primary, borderRadius: 99, height: 6 },
  barTrack: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 99, height: 6, overflow: 'hidden' },
  distributionHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minWidth: '46%',
    padding: theme.spacing.md,
  },
  metricLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  metricValue: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  period: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  periodSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  periodText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  periodTextSelected: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: '700' },
  row: { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 6, paddingTop: 10 },
  rowMeta: { color: theme.colors.textMuted, fontSize: 12 },
  caption: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
});
