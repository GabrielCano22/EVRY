import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Text, TextInput, View } from 'react-native';
import type { PeriodKey } from '@evry/domain';
import { withMobileAuth, apiError, type MobileSession } from '../api/client';
import { loadExercises } from '../catalog/catalog';
import { PrimaryButton, textStyles } from '../ui/components';
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
  return <View style={{ gap: 12 }}>
    <Text style={textStyles.heading}>Progreso por ejercicio</Text>
    {!selected ? <>
      <TextInput accessibilityLabel="Buscar ejercicio para ver progreso" maxLength={80} value={search}
        onChangeText={(value) => { setSearch(value); setPage(1); }}
        style={{ color: theme.colors.text, backgroundColor: theme.colors.surfaceHigh, padding: 12, minHeight: 48, borderRadius: 8 }} />
      {catalog.isPending ? <Text style={textStyles.muted}>Cargando ejercicios…</Text> : null}
      {catalog.isError ? <><Text accessibilityRole="alert" style={textStyles.error}>{catalog.error.message}</Text><PrimaryButton onPress={() => void catalog.refetch()}>Reintentar catálogo</PrimaryButton></> : null}
      {catalog.data?.notice ? <Text style={textStyles.muted}>{catalog.data.notice}</Text> : null}
      {catalog.data?.items.length === 0 ? <Text style={textStyles.muted}>No hay ejercicios para esta búsqueda.</Text> : null}
      {catalog.data?.items.map((exercise) => <PrimaryButton key={exercise.id} onPress={() => setSelected(exercise)}>{exercise.name}</PrimaryButton>)}
      {page > 1 ? <PrimaryButton onPress={() => setPage(page - 1)}>Página anterior</PrimaryButton> : null}
      {catalog.data?.hasMore ? <PrimaryButton onPress={() => setPage(page + 1)}>Página siguiente</PrimaryButton> : null}
    </> : <>
      <Text style={textStyles.body}>{selected.name}</Text>
      <PrimaryButton onPress={() => setSelected(null)}>Cambiar ejercicio</PrimaryButton>
      {detail.isPending ? <Text style={textStyles.muted}>Cargando historial…</Text> : null}
      {first ? <ExerciseProgressDetails summary={first.summary} comparison={first.comparison} points={first.points}
        history={detail.data!.pages.flatMap((item) => item.history.items)} /> : null}
      {detail.isError ? <><Text accessibilityRole="alert" style={textStyles.error}>{detail.error.message}</Text>
        <PrimaryButton onPress={() => void (detail.isFetchNextPageError ? detail.fetchNextPage() : detail.refetch())}>Reintentar historial</PrimaryButton></> : null}
      {detail.hasNextPage ? <PrimaryButton disabled={detail.isFetching} onPress={() => void detail.fetchNextPage()}>
        {detail.isFetchingNextPage ? 'Cargando…' : 'Cargar más sesiones'}
      </PrimaryButton> : null}
    </>}
  </View>;
}
