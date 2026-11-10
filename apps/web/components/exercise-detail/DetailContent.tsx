'use client';

import { useLayoutEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ExerciseDetail } from '@/lib/training-api';
import { exerciseGifUrl, getExerciseInstruction } from '@/lib/exercise-media';
import { etiquetaEquipo, etiquetaGrupoMuscular, traducirCategoria, traducirNombreEjercicio, traducirValorEjercicio } from '@/lib/exercise-i18n';
import { ExerciseMedia } from '../ExerciseMedia';
import { ModuleContent } from './ModuleContent';
const loadMap = () => import('../MapaMuscular');
const loadActivity = () => import('./Activity');


export type Tab = 'summary' | 'progress' | 'history' | 'instructions';
export type DetailContentProps = { exerciseId: string; accountId: string; initialTab: Tab; id: string; onTitle: (title: string) => void; onContentRetry: () => void; metadata: UseQueryResult<ExerciseDetail, Error> };
const tabs: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Resumen' }, { key: 'progress', label: 'Progreso' },
  { key: 'history', label: 'Historial' }, { key: 'instructions', label: 'Indicaciones' },
];

export default function DetailContent({ exerciseId, accountId, initialTab, id, onTitle, onContentRetry, metadata }: DetailContentProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const exercise = metadata.data;
  useLayoutEffect(() => {
    onTitle(exercise ? traducirNombreEjercicio(exercise.name) : 'Ficha de ejercicio');
  }, [exercise, onTitle]);
  return <>
      <div role="tablist" aria-label="Información del ejercicio" className="grid grid-cols-4 border-b border-outline/30">
        {tabs.map((item, index) => <button key={item.key} id={`${id}-${item.key}`} role="tab" type="button"
          aria-selected={tab === item.key} aria-controls={`${id}-panel-${item.key}`} tabIndex={tab === item.key ? 0 : -1}
          className="min-w-0 px-1 py-md text-sm aria-selected:bg-primary/10 aria-selected:text-primary"
          onClick={() => setTab(item.key)} onKeyDown={event => {
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : null;
            if (next !== null) { event.preventDefault(); setTab(tabs[next].key); document.getElementById(`${id}-${tabs[next].key}`)?.focus(); }
          }}>{item.label}</button>)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-lg">
        {tabs.map(item => <section key={item.key} role="tabpanel" hidden={tab !== item.key} id={`${id}-panel-${item.key}`} aria-labelledby={`${id}-${item.key}`} tabIndex={0} className="space-y-md">
          {tab === item.key && <>
            {(tab === 'summary' || tab === 'instructions') && <>
              {metadata.isPending && <p role="status">Cargando ejercicio…</p>}
              {metadata.isError && <p role="alert">No pudimos cargar el ejercicio. <button type="button" className="underline" onClick={() => void metadata.refetch()}>Reintentar ejercicio</button></p>}
              {exercise && (tab === 'summary' ? <Summary exercise={exercise} onContentRetry={onContentRetry} /> : <Instructions exercise={exercise} />)}
            </>}
            {tab === 'progress' && <ModuleContent load={loadActivity} loading="Cargando progreso…" failure="No pudimos cargar el progreso." beforeRetry={onContentRetry}>
              {module => <module.ExerciseDetailProgress accountId={accountId} exerciseId={exerciseId} onContentRetry={onContentRetry} />}
            </ModuleContent>}
            {tab === 'history' && <ModuleContent load={loadActivity} loading="Cargando historial…" failure="No pudimos cargar el historial." beforeRetry={onContentRetry}>
              {module => <module.ExerciseDetailHistory accountId={accountId} exerciseId={exerciseId} />}
            </ModuleContent>}
          </>}
        </section>)}
      </div>
  </>;
}

function Summary({ exercise, onContentRetry }: { exercise: ExerciseDetail; onContentRetry: () => void }) {
  const [playing, setPlaying] = useState(false);
  return <>
    <ExerciseMedia exercise={playing ? exercise : { ...exercise, gifPath: null, gifUrl: null }} variant="detail" />
    {exerciseGifUrl(exercise) && <button type="button" aria-pressed={playing} className="rounded-lg border border-primary px-md py-sm text-primary" onClick={() => setPlaying(value => !value)}>{playing ? 'Detener GIF' : 'Reproducir GIF'}</button>}
    {exercise.attribution && <p className="text-xs text-on-surface-variant">{exercise.attribution}</p>}
    {exercise.description && <p>{exercise.description}</p>}
    <dl className="grid grid-cols-2 gap-sm text-sm">
      <dt>Grupo muscular</dt><dd>{etiquetaGrupoMuscular(exercise.muscleGroup)}</dd>
      <dt>Equipo</dt><dd>{etiquetaEquipo(exercise.equipment)}</dd>
      {exercise.target && <><dt>Músculo objetivo</dt><dd>{traducirValorEjercicio(exercise.target)}</dd></>}
      {exercise.category && <><dt>Categoría</dt><dd>{traducirCategoria(exercise.category)}</dd></>}
      <dt>Tipo</dt><dd>{exercise.isCustom ? 'Personalizado' : 'Catálogo'} · {exercise.isCompound ? 'Compuesto' : 'Aislado'}</dd>
    </dl>
    <ModuleContent load={loadMap} loading="Cargando mapa muscular…" failure="No pudimos cargar el mapa muscular." beforeRetry={onContentRetry}>
      {module => <module.MapaMuscular ejercicios={[exercise]} />}
    </ModuleContent>
  </>;
}

function Instructions({ exercise }: { exercise: ExerciseDetail }) {
  const steps = getExerciseInstruction(exercise);
  return <>
    {steps.length ? <ol className="list-decimal space-y-sm pl-lg">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>Sin indicaciones disponibles.</p>}
    <p className="rounded-lg border border-outline/30 p-md text-sm">Realiza el movimiento con control y detente si sientes dolor. Si tienes dudas sobre la técnica, consulta a un profesional.</p>
    {exercise.attribution && <p className="text-xs text-on-surface-variant">{exercise.attribution}</p>}
  </>;
}
