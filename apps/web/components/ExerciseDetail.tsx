'use client';

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAutenticacion } from '@/lib/auth-store';
import { getExercise, trainingKeys } from '@/lib/training-api';
import type { DetailContentProps, Tab } from './exercise-detail/DetailContent';

type Selection = { exerciseId: string; tab: Tab; trigger: HTMLElement };
const DetailContext = createContext<((selection: Selection) => void) | null>(null);

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
  // Fetch metadata concurrently with the content chunk, not after it downloads.
  // This observer exists only while the drawer is open and consumes its signal.
  const metadata = useQuery({
    queryKey: trainingKeys.exerciseDetail(accountId, selection.exerciseId),
    queryFn: ({ signal }) => getExercise(selection.exerciseId, signal),
  });
  const [title, setTitle] = useState('Ficha de ejercicio');
  const [Content, setContent] = useState<ComponentType<DetailContentProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    import('./exercise-detail/DetailContent').then(exports => {
      if (mounted) setContent(() => exports.default);
    }).catch(() => { if (mounted) setLoadFailed(true); });
    return () => { mounted = false; };
  }, [attempt]);
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId();
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
  return createPortal(<div ref={overlay} className="fixed inset-0 z-[80] flex justify-end bg-black/60" onMouseDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) close(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
      className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-on-surface shadow-2xl md:max-w-xl md:border-l md:border-outline/30 motion-reduce:transition-none">
      <header className="flex items-center justify-between gap-md border-b border-outline/30 p-lg">
        <h2 id={`${id}-title`} className="text-headline-md">{title}</h2>
        <button ref={closeButton} type="button" aria-label="Cerrar ficha" onClick={close} className="rounded-lg border border-outline px-md py-sm">Cerrar</button>
      </header>
      {Content ? <Content exerciseId={selection.exerciseId} accountId={accountId} initialTab={selection.tab} id={id} onTitle={setTitle} onContentRetry={() => closeButton.current?.focus({ preventScroll: true })} metadata={metadata} />
        : <div className="p-lg">{loadFailed
          ? <p role="alert">No pudimos cargar la ficha. <button type="button" className="underline" onClick={() => { closeButton.current?.focus({ preventScroll: true }); setLoadFailed(false); setAttempt(value => value + 1); }}>Reintentar ficha</button></p>
          : <p role="status">Cargando ejercicio…</p>}</div>}
    </div>
  </div>, document.body);
}
