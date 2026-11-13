import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { PeriodKey } from '@evry/domain';
import { withMobileAuth, apiError, type MobileSession } from '../api/client';
import { loadExercises } from '../catalog/catalog';
import { AppIcon } from '../ui/icon';
import { Card, ListRow, PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { ExerciseProgressDetails } from './ExerciseProgressDetails';

export function ExerciseProgressPanel({ session, period }: { session: MobileSession; period: PeriodKey }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const catalog = useQuery({ queryKey: ['progress-exercises', session.userId, search, page],
    queryFn: ({ signal }) => loadExercises(session, { search, page, signal }), enabled: !selected });
  const detail = useInfiniteQuery({
    queryKey: ['exercise-progress', session.userId, selected?.id, period],
    enabled: Boolean(selected), initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const response = await withMobileAuth((client) => client.GET('/progress/exercises/{id}', {
        params: { path: { id: selected!.id }, query: { period, limit: 20, ...(pageParam ? { cursor: pageParam } : {}) } }, signal,
      }), session);
      if (!response.data || response.error) throw apiError(response.error, 'No se pudo cargar el ejercicio.', response.response.status);
      return response.data;
    },
    getNextPageParam: (last) => last.history.hasMore ? last.history.nextCursor ?? undefined : undefined,
  });
  const first = detail.data?.pages[0];
  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <AppIcon color={theme.colors.primary} name="bar_chart" size={19} />
        </View>
        <Text style={styles.title}>Progreso por ejercicio</Text>
      </View>

      {!selected ? <>
        <View style={styles.searchRow}>
          <AppIcon color={theme.colors.textDim} name="search" size={18} />
          <TextInput
            accessibilityLabel="Buscar ejercicio para ver progreso"
            autoCapitalize="none"
            maxLength={80}
            onChangeText={(value) => { setSearch(value); setPage(1); }}
            placeholder="Buscar un ejercicio"
            placeholderTextColor={theme.colors.textDim}
            style={styles.searchInput}
            value={search}
          />
        </View>

        {catalog.isPending ? <Text style={textStyles.muted}>Cargando ejercicios…</Text> : null}
        {catalog.isError ? <Card tone="error">
          <Text accessibilityRole="alert" style={textStyles.error}>{catalog.error.message}</Text>
          <PrimaryButton onPress={() => void catalog.refetch()} variant="secondary">Reintentar catálogo</PrimaryButton>
        </Card> : null}
        {catalog.data?.notice ? <Text style={textStyles.muted}>{catalog.data.notice}</Text> : null}
        {catalog.data?.items.length === 0 ? <Card style={styles.empty}>
          <Text style={textStyles.muted}>No hay ejercicios para esta búsqueda.</Text>
        </Card> : null}
        {catalog.data?.items.length ? <View style={styles.list}>
          {catalog.data.items.map((exercise) => (
            <ListRow
              key={exercise.id}
              leading={<View style={styles.listIcon}><AppIcon color={theme.colors.primary} name="fitness_center" size={17} /></View>}
              onPress={() => setSelected(exercise)}
              title={exercise.name}
              trailing={<AppIcon color={theme.colors.textDim} name="chevron_right" size={18} />}
            />
          ))}
        </View> : null}

        {(page > 1 || catalog.data?.hasMore) ? <View style={styles.pagination}>
          {page > 1 ? <PrimaryButton compact onPress={() => setPage(page - 1)} style={styles.pageButton} variant="secondary">Página anterior</PrimaryButton> : null}
          {catalog.data?.hasMore ? <PrimaryButton compact onPress={() => setPage(page + 1)} style={styles.pageButton} variant="secondary">Página siguiente</PrimaryButton> : null}
        </View> : null}
      </> : <>
        <Card style={styles.selectedCard}>
          <View style={styles.selectedRow}>
            <View style={styles.selectedIcon}>
              <AppIcon color={theme.colors.primary} name="fitness_center" size={20} />
            </View>
            <View style={styles.selectedCopy}>
              <Text style={styles.selectedEyebrow}>EJERCICIO</Text>
              <Text style={styles.selectedName}>{selected.name}</Text>
            </View>
          </View>
          <PrimaryButton compact onPress={() => setSelected(null)} variant="secondary">Cambiar ejercicio</PrimaryButton>
        </Card>

        {detail.isPending ? <Text style={textStyles.muted}>Cargando historial…</Text> : null}
        {first ? <ExerciseProgressDetails
          comparison={first.comparison}
          history={detail.data!.pages.flatMap((item) => item.history.items)}
          points={first.points}
          summary={first.summary}
        /> : null}
        {detail.isError ? <Card tone="error">
          <Text accessibilityRole="alert" style={textStyles.error}>{detail.error.message}</Text>
          <PrimaryButton onPress={() => void (detail.isFetchNextPageError ? detail.fetchNextPage() : detail.refetch())} variant="secondary">
            Reintentar historial
          </PrimaryButton>
        </Card> : null}
        {detail.hasNextPage ? <PrimaryButton disabled={detail.isFetching} onPress={() => void detail.fetchNextPage()}>
          {detail.isFetchingNextPage ? 'Cargando…' : 'Cargar más sesiones'}
        </PrimaryButton> : null}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: theme.spacing.sm },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  titleIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  searchRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: 13,
  },
  searchInput: { color: theme.colors.text, flex: 1, fontSize: 15, minHeight: 48, paddingVertical: 10 },
  list: { gap: 6 },
  listIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  empty: { padding: theme.spacing.md },
  pagination: { flexDirection: 'row', gap: theme.spacing.sm },
  pageButton: { flex: 1 },
  selectedCard: { gap: theme.spacing.sm },
  selectedRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  selectedIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectedCopy: { flex: 1, gap: 1 },
  selectedEyebrow: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  selectedName: { color: theme.colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
});
