import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiClient, refreshMobileSession } from '@/src/api/client';
import { buildOverviewCards, signedMetric } from '@/src/progress/progress-view';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

type Period = '30d' | '90d' | '6m' | '1y' | 'all';
type ProgressOverview = components['schemas']['ProgressOverview'];

const periods: { key: Period; label: string }[] = [
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '6m', label: '6 meses' },
  { key: '1y', label: '1 año' },
  { key: 'all', label: 'Todo' },
];

async function loadOverview(period: Period): Promise<ProgressOverview> {
  let response = await apiClient.GET('/progress/overview', { params: { query: { period } } });
  if (response.response.status === 401 && await refreshMobileSession()) {
    response = await apiClient.GET('/progress/overview', { params: { query: { period } } });
  }
  if (!response.data || response.error) throw new Error('No se pudo cargar el progreso.');
  return response.data;
}

export default function ProgressScreen() {
  const [period, setPeriod] = useState<Period>('30d');
  const query = useQuery({ queryKey: ['progress', period], queryFn: () => loadOverview(period) });
  const overview = query.data;

  return (
    <Screen>
      <Text style={textStyles.title}>Progreso</Text>
      <Text style={textStyles.muted}>Métricas del periodo seleccionado contra el periodo anterior equivalente.</Text>
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
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={textStyles.error}>No pudimos cargar el progreso.</Text>
          <PrimaryButton onPress={() => void query.refetch()}>Reintentar</PrimaryButton>
        </View>
      ) : null}

      {overview ? (
        <>
          <View style={styles.grid}>
            {buildOverviewCards(overview.summary).map((card) => (
              <View key={card.label} style={styles.metricCard}>
                <Text style={textStyles.muted}>{card.label}</Text>
                <Text style={textStyles.heading}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={textStyles.heading}>Cambio frente al periodo anterior</Text>
            {overview.comparison ? (
              <>
                <Text style={textStyles.body}>{signedMetric(overview.comparison.delta.sessionsCompleted)} sesiones</Text>
                <Text style={textStyles.body}>{signedMetric(overview.comparison.delta.volumeKg)} kg de volumen</Text>
                <Text style={textStyles.muted}>Las cifras negativas indican menos actividad, no un juicio sobre tu entrenamiento.</Text>
              </>
            ) : <Text style={textStyles.muted}>El periodo completo no tiene una ventana anterior comparable.</Text>}
          </View>

          <View style={styles.card}>
            <Text style={textStyles.heading}>Distribución muscular</Text>
            {overview.muscleDistribution.length === 0 ? <Text style={textStyles.muted}>Aún no hay series útiles en este periodo.</Text> : null}
            {overview.muscleDistribution.map((item) => (
              <View key={item.muscleGroup} style={styles.row}>
                <Text style={textStyles.body}>{item.muscleGroup}</Text>
                <Text style={textStyles.muted}>{item.workingSets} series · {item.percentage}%</Text>
              </View>
            ))}
          </View>

          {overview.records.length > 0 ? (
            <View style={styles.card}>
              <Text style={textStyles.heading}>Récords del periodo</Text>
              {overview.records.slice(0, 5).map((record) => (
                <View key={`${record.exerciseId}-${record.kind}`} style={styles.row}>
                  <Text style={textStyles.body}>{record.exerciseName}</Text>
                  <Text style={textStyles.muted}>{record.value} · {record.kind.replaceAll('_', ' ')}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 4, minWidth: '46%', padding: 16 },
  period: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  periodSelected: { backgroundColor: theme.colors.primary },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodText: { color: theme.colors.textMuted, fontWeight: '700' },
  periodTextSelected: { color: '#ffffff', fontWeight: '700' },
  row: { borderTopColor: theme.colors.surfaceHigh, borderTopWidth: 1, gap: 2, paddingTop: 10 },
});
