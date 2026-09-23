'use client';

import { useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { UpdateWorkoutSetInput, WorkoutSet } from '@/lib/training-api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function inputValue(value: number | null) {
  return value === null ? '' : String(value);
}

function nullableNumber(value: string) {
  return value.trim() === '' ? null : Number(value);
}

export function SetEditDialog({
  ordinal,
  pending,
  error,
  set,
  onClose,
  onSubmit,
}: {
  ordinal: number;
  pending: boolean;
  error: string | null;
  set: WorkoutSet;
  onClose: () => void;
  onSubmit: (input: UpdateWorkoutSetInput) => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLFormElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [weight, setWeight] = useState(inputValue(set.weightKg));
  const [reps, setReps] = useState(inputValue(set.reps));
  const [duration, setDuration] = useState(inputValue(set.durationS));
  const [rpe, setRpe] = useState(inputValue(set.rpe));
  const [warmup, setWarmup] = useState(set.isWarmup);
  const [technique, setTechnique] = useState(
    set.techniqueStable === null ? 'unknown' : set.techniqueStable ? 'stable' : 'unstable',
  );

  useLayoutEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const siblings = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay.current,
    );
    const previous = siblings.map((element) => ({
      element,
      inert: element.inert,
      hidden: element.getAttribute('aria-hidden'),
    }));
    for (const { element } of previous) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      for (const { element, inert, hidden } of previous) {
        element.inert = inert;
        if (hidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', hidden);
      }
    };
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape' && !pending) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
    ) ?? []]
      .filter((element) => element.tabIndex >= 0)
      .sort((left, right) => (
        left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      ));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      weightKg: nullableNumber(weight),
      reps: nullableNumber(reps),
      durationS: nullableNumber(duration),
      rpe: nullableNumber(rpe),
      isWarmup: warmup,
      techniqueStable: technique === 'unknown' ? null : technique === 'stable',
    });
  }

  return createPortal(
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-lg"
    >
      <form
        ref={panel}
        onKeyDownCapture={handleKeyDown}
        onSubmit={submit}
        className="w-full max-w-xl space-y-md rounded-t-2xl border border-white/10 bg-background p-lg shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-md">
          <h2 id={titleId} className="font-headline-md text-headline-md text-on-surface">
            Editar serie {ordinal}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg px-sm py-xs text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input autoFocus label="Peso (kg)" type="number" min="0" step="0.5" value={weight} disabled={pending} onChange={(event) => setWeight(event.target.value)} />
          <Input label="Repeticiones" type="number" min="0" max="1000" step="1" value={reps} disabled={pending} onChange={(event) => setReps(event.target.value)} />
          <Input label="Duración (segundos)" type="number" min="0" max="86400" step="1" value={duration} disabled={pending} onChange={(event) => setDuration(event.target.value)} />
          <Input label="RPE" type="number" min="1" max="10" step="0.5" value={rpe} disabled={pending} onChange={(event) => setRpe(event.target.value)} />
        </div>
        <label className="flex min-h-11 items-center gap-sm text-sm text-on-surface">
          <input type="checkbox" checked={warmup} disabled={pending} onChange={(event) => setWarmup(event.target.checked)} />
          Serie de calentamiento
        </label>
        <label className="block text-sm text-on-surface" htmlFor={`${titleId}-technique`}>
          <span className="mb-xs block text-on-surface-variant">Técnica</span>
          <select
            id={`${titleId}-technique`}
            value={technique}
            disabled={pending}
            onChange={(event) => setTechnique(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface-container px-md py-sm outline-none focus:border-primary"
          >
            <option value="unknown">Sin registrar</option>
            <option value="stable">Estable</option>
            <option value="unstable">Inestable</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-sm">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="submit" loading={pending}>
            {error ? 'Reintentar guardar cambios' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
