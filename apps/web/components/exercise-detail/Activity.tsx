'use client';

import { lazy, Suspense, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getExerciseProgress, type ProgressPeriod } from '@/lib/progress-api';

const ProgressPlot = lazy(() => import('./ProgressPlot'));
type Props = { accountId: string; exerciseId: string };
const periods: { value: ProgressPeriod; label: string }[] = [
  { value: '30d', label: '30 días' }, { value: '90d', label: '90 días' },
  { value: '6m', label: '6 meses' }, { value: '1y', label: '1 año' }, { value: 'all', label: 'Todo' },
];
const number = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 2 });

export function ExerciseDetailProgress({ accountId, exerciseId }: Props) {
  const [period, setPeriod] = useState<ProgressPeriod>('30d');
  const query = useQuery({ queryKey: ['exercise-detail-progress', accountId, exerciseId, period],
    queryFn: ({ signal }) => getExerciseProgress(exerciseId, { period, limit: 10 }, signal) });
  const data = query.data;
  return <>
    <label className="grid gap-xs">Periodo del ejercicio
      <select value={period} onChange={event => setPeriod(event.target.value as ProgressPeriod)} className="rounded-lg border border-outline bg-surface-container p-sm">
        {periods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
    {query.isPending && <p role="status">Cargando progreso…</p>}
    {query.isError && <p role="alert">No pudimos cargar el progreso. <button type="button" className="underline" onClick={() => void query.refetch()}>Reintentar progreso</button></p>}
    {data && <>
      {data.summary.sessionsCount === 0 && <p>No hay sesiones completadas en este periodo.</p>}
      <p>{data.summary.sessionsCount} sesiones · {data.summary.workingSetsCount} series de trabajo · {number(data.summary.volumeKg)} kg de volumen</p>
      <p>Mejor carga: {data.summary.bestWeight ? `${number(data.summary.bestWeight.weightKg)} kg` : 'Sin registro'}</p>
      <p>1RM estimado: {data.summary.estimated1RM ? `${number(data.summary.estimated1RM.valueKg)} kg (Epley)` : 'Datos insuficientes'}</p>
      {data.comparison ? <p>{data.comparison.delta.volumeKg > 0 ? '+' : ''}{number(data.comparison.delta.volumeKg)} kg frente al periodo anterior ({data.comparison.period.from} – {data.comparison.period.to})</p> : <p>Sin periodo anterior comparable.</p>}
      <Suspense fallback={<p role="status">Cargando gráfica…</p>}><ProgressPlot points={data.points} /></Suspense>
    </>}
  </>;
}

export function ExerciseDetailHistory({ accountId, exerciseId }: Props) {
  const query = useInfiniteQuery({
    queryKey: ['exercise-detail-history', accountId, exerciseId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getExerciseProgress(exerciseId, { period: 'all', limit: 10, ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: last => last.history.hasMore ? last.history.nextCursor ?? undefined : undefined,
  });
  const history = [...new Map(query.data?.pages.flatMap(page => page.history.items).map(session => [session.workoutId, session]) ?? []).values()];
  return <>
    {query.isPending && <p role="status">Cargando historial…</p>}
    {query.isError && !query.data && <p role="alert">No pudimos cargar el historial. <button type="button" className="underline" onClick={() => void query.refetch()}>Reintentar historial</button></p>}
    {query.isRefetchError && !query.isFetchNextPageError && <p role="alert">No pudimos actualizar el historial. Las sesiones guardadas siguen disponibles. <button type="button" className="underline" onClick={() => void query.refetch()}>Reintentar actualización</button></p>}
    {query.isFetchNextPageError && <p role="alert">No pudimos cargar más sesiones. Los resultados anteriores siguen disponibles. <button type="button" className="underline" onClick={() => void query.fetchNextPage()}>Reintentar página</button></p>}
    {query.data && history.length === 0 && <p>No hay sesiones registradas para este ejercicio.</p>}
    <ul className="space-y-md">{history.map(session => <li key={session.workoutId} className="rounded-lg bg-surface-container p-md">
      <h3 className="font-semibold">{session.workoutName}</h3>
      <p>{new Date(session.endedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p>
      <ul>{session.sets.map(set => <li key={set.id}>
        Serie {set.order + 1}: {set.weightKg === null ? 'Sin carga' : `${set.weightKg} kg`}
        {set.reps !== null ? ` × ${set.reps} repeticiones` : ''}{set.durationS !== null ? ` · ${set.durationS} s` : ''}{set.rpe !== null ? ` · RPE ${set.rpe}` : ''}
      </li>)}</ul>
    </li>)}</ul>
    {query.hasNextPage && !query.isFetchNextPageError && <button type="button" disabled={query.isFetchingNextPage} className="rounded-lg border border-outline px-md py-sm" onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Cargando sesiones…' : 'Cargar más sesiones'}</button>}
  </>;
}
