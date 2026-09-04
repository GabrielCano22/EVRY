'use client';

import { useDeferredValue, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { requestOrThrow } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

const ExerciseChart = dynamic(() => import('@/components/ExerciseChart').then((module) => module.ExerciseChart), {
  ssr: false,
  loading: () => <p role="status">Cargando gráfica…</p>,
});
type Overview = components['schemas']['ProgressOverview'];
type Period = Overview['period']['key'];
type Exercise = Pick<components['schemas']['ExerciseListItemDto'], 'id' | 'name'>;
const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 días' }, { value: '90d', label: '90 días' },
  { value: '6m', label: '6 meses' }, { value: '1y', label: '1 año' }, { value: 'all', label: 'Todo' },
];
const number = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 2 });

export function ProgressPage() {
  const userId = useAutenticacion((state) => state.usuario?.id);
  const [period, setPeriod] = useState<Period>('30d');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const overview = useQuery({
    queryKey: ['progress', userId, period],
    queryFn: ({ signal }) => requestOrThrow<Overview>(`/progress/overview?period=${period}`, { signal }),
  });
  const catalog = useQuery({
    queryKey: ['progress-exercise-search', userId, deferredSearch],
    enabled: deferredSearch.length > 0,
    queryFn: ({ signal }) => requestOrThrow<components['schemas']['ExercisePageDto']>(
      `/exercises?q=${encodeURIComponent(deferredSearch)}&limit=30`, { signal },
    ),
  });
  const data = overview.data;
  const recordExercises = data ? [...new Map(data.records.map((record) => [
    record.exerciseId, { id: record.exerciseId, name: record.exerciseName },
  ])).values()] : [];
  const exercise = selected ?? recordExercises[0] ?? null;

  return (
    <div className="space-y-lg">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Progreso</h1>
          <p className="text-on-surface-variant">Sesiones completadas y cambios reales entre periodos.</p>
        </div>
        <label className="grid gap-xs text-sm">Periodo de progreso
          <select className="rounded-lg border border-outline bg-surface-container p-sm" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </header>
      {overview.isPending && <p role="status">Cargando progreso…</p>}
      {overview.isError && <div role="alert" className="text-error">
        No pudimos cargar tu progreso. {data && 'Los datos visibles son de la última consulta correcta.'}{' '}
        <button type="button" className="underline" onClick={() => void overview.refetch()}>Reintentar progreso</button>
      </div>}
      {data && <>
        {overview.isFetching && <p role="status">Actualizando progreso…</p>}
        {data.summary.sessionsCompleted === 0 && <p>No hay sesiones completadas en este periodo.</p>}
        {!data.comparison && <p className="text-on-surface-variant">Sin periodo anterior comparable.</p>}
        <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Sesiones completadas" value={data.summary.sessionsCompleted} delta={data.comparison?.delta.sessionsCompleted} />
          <Metric label="Volumen" value={data.summary.volumeKg} delta={data.comparison?.delta.volumeKg} unit="kg" />
          <Metric label="Días activos" value={data.summary.activeDays} delta={data.comparison?.delta.activeDays} />
          <Metric label="Frecuencia semanal" value={data.summary.weeklyFrequency} delta={data.comparison?.delta.weeklyFrequency} />
        </div>
        <div className="grid gap-lg lg:grid-cols-2">
          <CalendarioActividad />
          <section className="space-y-sm rounded-xl bg-surface-container p-md" aria-label="Distribución muscular">
            <h2 className="text-headline-md">Series por grupo muscular</h2>
            {data.muscleDistribution.length === 0 && <p>Sin series de trabajo en este periodo.</p>}
            {data.muscleDistribution.map((item) => <p key={item.muscleGroup} className="flex justify-between gap-sm">
              <span>{item.muscleGroup}</span><span>{item.workingSets} series · {number(item.percentage)}%</span>
            </p>)}
          </section>
        </div>
        <section className="space-y-md" aria-label="Progreso por ejercicio">
          <h2 className="text-headline-md">Progreso por ejercicio</h2>
          <label className="grid gap-xs">Buscar ejercicio
            <input type="search" maxLength={80} value={search} onChange={(event) => setSearch(event.target.value)}
              className="rounded-lg border border-outline bg-surface-container p-sm" />
          </label>
          {deferredSearch && catalog.isPending && <p role="status">Buscando ejercicios…</p>}
          {deferredSearch && catalog.isError && <p role="alert">No se pudo buscar. <button type="button" className="underline" onClick={() => void catalog.refetch()}>Reintentar búsqueda</button></p>}
          {deferredSearch && catalog.data?.items.length === 0 && <p>Sin resultados.</p>}
          <div className="flex flex-wrap gap-sm">
            {(deferredSearch ? catalog.data?.items ?? [] : recordExercises).map((item) => <button
              key={item.id} type="button" aria-pressed={exercise?.id === item.id}
              className="rounded-lg border border-outline px-md py-sm aria-pressed:bg-primary/20"
              onClick={() => setSelected(item)}>{traducirNombreEjercicio(item.name)}</button>)}
          </div>
          {exercise ? <>
            <h3 className="text-headline-sm">{traducirNombreEjercicio(exercise.name)}</h3>
            <ExerciseChart exerciseId={exercise.id} period={period} />
          </> : <p>Busca un ejercicio para consultar su evolución e historial.</p>}
        </section>
        <section className="space-y-sm" aria-label="Récords del periodo">
          <h2 className="text-headline-md">Récords del periodo</h2>
          {data.records.length === 0 ? <p>No se registraron nuevos récords.</p> : <ul className="space-y-sm">
            {data.records.map((record) => <li key={`${record.exerciseId}-${record.kind}`}>
              {traducirNombreEjercicio(record.exerciseName)}: {number(record.value)} {record.kind === 'REPS' ? 'repeticiones' : 'kg'}
              {record.kind === 'ESTIMATED_1RM' ? ' (1RM estimado)' : record.kind === 'WEIGHT' ? ' (carga)' : ''}
            </li>)}
          </ul>}
        </section>
      </>}
    </div>
  );
}

function Metric({ label, value, delta, unit = '' }: { label: string; value: number; delta?: number; unit?: string }) {
  return <div role="group" aria-label={label} className="rounded-xl border border-white/5 bg-surface-container p-md">
    <h2 className="text-sm text-on-surface-variant">{label}</h2>
    <p className="text-3xl font-semibold tabular-nums">{number(value)}{unit && <span className="ml-xs text-sm">{unit}</span>}</p>
    {delta !== undefined && <p className="mt-sm text-sm text-on-surface-variant">{delta > 0 ? '+' : ''}{number(delta)} {unit} frente al periodo anterior</p>}
  </div>;
}
