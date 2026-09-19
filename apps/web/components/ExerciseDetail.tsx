'use client';

import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAutenticacion } from '@/lib/auth-store';
import { getExercise, trainingKeys, type ExerciseDetail } from '@/lib/training-api';
import { exerciseGifUrl, getExerciseInstruction } from '@/lib/exercise-media';
import { etiquetaEquipo, etiquetaGrupoMuscular, traducirCategoria, traducirNombreEjercicio, traducirValorEjercicio } from '@/lib/exercise-i18n';
import { ExerciseMedia } from './ExerciseMedia';
import { MapaMuscular } from './MapaMuscular';
import { ExerciseDetailProgress, ExerciseDetailHistory } from './exercise-detail/Activity';

type Tab = 'summary' | 'progress' | 'history' | 'instructions';
type Selection = { exerciseId: string; tab: Tab; trigger: HTMLElement };
const DetailContext = createContext<((selection: Selection) => void) | null>(null);
const tabs: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Resumen' }, { key: 'progress', label: 'Progreso' },
  { key: 'history', label: 'Historial' }, { key: 'instructions', label: 'Indicaciones' },
];

export function ExerciseDetailProvider({ children }: { children: ReactNode }) {
  const accountId = useAutenticacion(state => state.usuario?.id);
  return <AccountDetailProvider key={accountId ?? 'anonymous'} accountId={accountId}>{children}</AccountDetailProvider>;
}

function AccountDetailProvider({ accountId, children }: { accountId?: string; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const close = useCallback(() => setSelection(null), []);
  return <DetailContext.Provider value={setSelection}>
    {children}
    {selection && accountId && <DetailDialog key={selection.exerciseId} selection={selection} accountId={accountId} close={close} />}
  </DetailContext.Provider>;
}

export function ExerciseDetailButton({ exerciseId, tab = 'summary', children, className = '', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { exerciseId: string; tab?: Tab }) {
  const open = useContext(DetailContext);
  return <button {...props} type="button" className={`text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className}`}
    onClick={event => { event.stopPropagation(); open?.({ exerciseId, tab, trigger: event.currentTarget }); }}>{children}</button>;
}

function DetailDialog({ selection, accountId, close }: { selection: Selection; accountId: string; close: () => void }) {
  const [tab, setTab] = useState<Tab>(selection.tab);
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const metadata = useQuery({
    queryKey: trainingKeys.exerciseDetail(accountId, selection.exerciseId),
    queryFn: ({ signal }) => getExercise(selection.exerciseId, signal),
  });
  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const siblings = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay.current);
    const previous = siblings.map(element => ({ element, inert: element.inert, hidden: element.getAttribute('aria-hidden') }));
    for (const { element } of previous) { element.inert = true; element.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []]
        .filter(element => element.tabIndex >= 0 && !element.closest('[hidden]'))
        .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.body.style.overflow = originalOverflow;
      for (const { element, inert, hidden } of previous) {
        element.inert = inert;
        if (hidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', hidden);
      }
      if (selection.trigger.isConnected) selection.trigger.focus({ preventScroll: true });
    };
  }, [close, selection.trigger]);
  const exercise = metadata.data;
  return createPortal(<div ref={overlay} className="fixed inset-0 z-[80] flex justify-end bg-black/60" onMouseDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) close(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
      className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-on-surface shadow-2xl md:max-w-xl md:border-l md:border-outline/30 motion-reduce:transition-none">
      <header className="flex items-center justify-between gap-md border-b border-outline/30 p-lg">
        <h2 id={`${id}-title`} className="text-headline-md">{exercise ? traducirNombreEjercicio(exercise.name) : 'Ficha de ejercicio'}</h2>
        <button ref={closeButton} type="button" aria-label="Cerrar ficha" onClick={close} className="rounded-lg border border-outline px-md py-sm">Cerrar</button>
      </header>
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
              {exercise && (tab === 'summary' ? <Summary exercise={exercise} /> : <Instructions exercise={exercise} />)}
            </>}
            {tab === 'progress' && <ExerciseDetailProgress accountId={accountId} exerciseId={selection.exerciseId} />}
            {tab === 'history' && <ExerciseDetailHistory accountId={accountId} exerciseId={selection.exerciseId} />}
          </>}
        </section>)}
      </div>
    </div>
  </div>, document.body);
}

function Summary({ exercise }: { exercise: ExerciseDetail }) {
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
    <MapaMuscular ejercicios={[exercise]} />
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
