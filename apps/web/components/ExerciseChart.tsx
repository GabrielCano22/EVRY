'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { requestOrThrow } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';

type Progress = components['schemas']['ExerciseProgress'];
type Period = Progress['period']['key'];

const dateLabel = (date: string) => new Date(date).toLocaleDateString('es-CO', {
  timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric',
});

export function ExerciseChart({ exerciseId, period = '30d' }: { exerciseId: string; period?: Period }) {
  const userId = useAutenticacion((state) => state.usuario?.id);
  const query = useInfiniteQuery({
    queryKey: ['exercise-progress', userId, exerciseId, period],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ period, limit: '10' });
      if (pageParam) params.set('cursor', pageParam);
      return requestOrThrow<Progress>(
        `/progress/exercises/${encodeURIComponent(exerciseId)}?${params}`, { signal },
      );
    },
    getNextPageParam: (last) => last.history.nextCursor ?? undefined,
  });
  const data = query.data?.pages[0];
  const history = [...new Map(query.data?.pages.flatMap((page) => page.history.items)
    .map((item) => [item.workoutId, item]) ?? []).values()];
  const points = data?.points.filter((point) => point.estimated1RMKg !== null).map((point) => ({
    date: dateLabel(point.completedAt), estimated1RM: point.estimated1RMKg,
  })) ?? [];

  return <div className="space-y-md rounded-xl border border-white/5 bg-surface-container p-md">
    <h3 className="text-headline-md">Evolución e historial</h3>
    {query.isPending && <p role="status">Cargando evolución…</p>}
    {query.isError && <p role="alert" className="text-error">
      No pudimos cargar la evolución.{' '}
      <button type="button" className="underline" onClick={() => void query.refetch()}>Reintentar evolución</button>
    </p>}
    {data && <>
      <p>{data.summary.sessionsCount} sesiones · {data.summary.workingSetsCount} series de trabajo · {data.summary.volumeKg.toLocaleString('es-CO')} kg de volumen</p>
      <p>1RM estimado: {data.summary.estimated1RM ? `${data.summary.estimated1RM.valueKg} kg (Epley)` : 'Datos insuficientes'}</p>
      {points.length === 0 ? <p>Sin datos de carga para graficar.</p> : <>
        <div className="h-72" aria-label="Evolución del 1RM estimado">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid stroke="#45515e" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#A1ABB7', fontSize: 11 }} />
              <YAxis tick={{ fill: '#A1ABB7', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#17212a', border: '1px solid #45515e', borderRadius: 8 }} />
              <Area name="1RM estimado (kg)" type="monotone" dataKey="estimated1RM" stroke="#70B7FF" fill="#007AFF" fillOpacity={0.2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary className="cursor-pointer underline">Ver datos de la gráfica</summary>
          <ul>{points.map((point, index) => <li key={index}>{point.date}: {point.estimated1RM} kg</li>)}</ul>
        </details>
      </>}
      <h4 className="text-headline-sm">Sesiones del periodo</h4>
      {history.length === 0 ? <p>No hay sesiones registradas para este ejercicio.</p> : <ul className="space-y-md">
        {history.map((workout) => <li key={workout.workoutId} className="rounded-lg bg-surface-container-low p-sm">
          <h5 className="font-semibold">{workout.workoutName}</h5>
          <p className="text-sm text-on-surface-variant">{dateLabel(workout.endedAt)}</p>
          <ul className="mt-xs space-y-xs">
            {workout.sets.map((set) => <li key={set.id} className="text-sm">
              Serie {set.order + 1}: {set.weightKg === null ? 'Sin carga' : `${set.weightKg} kg`}
              {set.reps !== null ? ` × ${set.reps} repeticiones` : ''}
              {set.durationS !== null ? ` · ${set.durationS} s` : ''}
              {set.rpe !== null ? ` · RPE ${set.rpe}` : ''}
            </li>)}
          </ul>
        </li>)}
      </ul>}
      {query.hasNextPage && <button type="button" disabled={query.isFetchingNextPage}
        className="rounded-lg border border-outline px-md py-sm disabled:opacity-50"
        onClick={() => void query.fetchNextPage()}>
        {query.isFetchingNextPage ? 'Cargando sesiones…' : 'Cargar más sesiones'}
      </button>}
    </>}
  </div>;
}
