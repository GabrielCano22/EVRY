'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Ejercicio, Rutina } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Icon } from './ui/Icon';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseMedia } from './ExerciseMedia';
import { cn } from '@/lib/utils';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface ItemRutina {
  exerciseId: string;
  exercise: Ejercicio;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  notes?: string;
}

interface Props {
  titulo: string;
  diaInicial?: number | null;
  rutinaExistente?: Rutina;
  onListo: () => void;
  onCancelar: () => void;
}

export function EditorRutina({ titulo, diaInicial, rutinaExistente, onListo, onCancelar }: Props) {
  const [nombre, setNombre] = useState(rutinaExistente?.name ?? '');
  const [dia, setDia] = useState<number | null>(
    rutinaExistente ? rutinaExistente.dayOfWeek : diaInicial ?? null,
  );
  const [items, setItems] = useState<ItemRutina[]>(
    rutinaExistente?.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      exercise: e.exercise!,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeightKg: e.targetWeightKg,
      notes: e.notes ?? undefined,
    })) ?? [],
  );
  const [seleccionando, setSeleccionando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregarEjercicio(ej: Ejercicio) {
    setItems((arr) => [
      ...arr,
      { exerciseId: ej.id, exercise: ej, targetSets: 3, targetReps: 10, targetWeightKg: null },
    ]);
    setSeleccionando(false);
  }

  function actualizar(idx: number, parche: Partial<ItemRutina>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...parche } : it)));
  }

  function quitar(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function mover(idx: number, delta: number) {
    const nuevoIdx = idx + delta;
    if (nuevoIdx < 0 || nuevoIdx >= items.length) return;
    const copia = [...items];
    [copia[idx], copia[nuevoIdx]] = [copia[nuevoIdx], copia[idx]];
    setItems(copia);
  }

  async function guardar() {
    setError(null);
    if (!nombre.trim()) return setError('Ponle un nombre a la rutina.');
    if (items.length === 0) return setError('Agrega al menos un ejercicio.');

    setGuardando(true);
    const payload = {
      name: nombre.trim(),
      dayOfWeek: dia,
      exercises: items.map((it, i) => ({
        exerciseId: it.exerciseId,
        order: i,
        targetSets: it.targetSets,
        targetReps: it.targetReps ?? undefined,
        targetWeightKg: it.targetWeightKg ?? undefined,
        notes: it.notes,
      })),
    };
    try {
      if (rutinaExistente) {
        await api(`/routines/${rutinaExistente.id}`, { method: 'PATCH', json: payload });
      } else {
        await api('/routines', { method: 'POST', json: payload });
      }
      onListo();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la rutina.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-lg max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{titulo}</h1>
          <p className="font-body-md text-on-surface-variant">
            Define los ejercicios y series objetivo de esta rutina.
          </p>
        </div>
        <button
          onClick={onCancelar}
          className="w-10 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="bg-surface-container rounded-xl p-lg border border-white/5 space-y-md">
        <Input
          label="Nombre de la rutina"
          icon="title"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Pierna fuerte"
        />

        <div>
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm block">
            Día de la semana (opcional)
          </span>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-xs">
            <button
              type="button"
              onClick={() => setDia(null)}
              className={cn(
                'py-sm px-xs rounded-lg font-grotesk text-label-caps tracking-wider border transition-all',
                dia === null
                  ? 'bg-primary border-primary text-on-primary'
                  : 'bg-surface-container-low border-white/10 text-on-surface-variant hover:border-white/30',
              )}
            >
              Sin día
            </button>
            {DIAS.map((nombreDia, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setDia(idx)}
                className={cn(
                  'py-sm px-xs rounded-lg font-grotesk text-label-caps tracking-wider border transition-all',
                  dia === idx
                    ? 'bg-primary border-primary text-on-primary'
                    : 'bg-surface-container-low border-white/10 text-on-surface-variant hover:border-white/30',
                )}
              >
                {nombreDia.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl p-lg border border-white/5">
        <div className="flex justify-between items-center mb-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">Ejercicios</h2>
          <Button onClick={() => setSeleccionando(true)} variant="outline" size="sm">
            <Icon name="add" size={16} />
            Agregar
          </Button>
        </div>

        {items.length === 0 && (
          <p className="font-body-md text-on-surface-variant text-center py-md">
            Aún no hay ejercicios. Agrega el primero.
          </p>
        )}

        <ul className="space-y-sm">
          {items.map((it, idx) => (
            <li
              key={`${it.exerciseId}-${idx}`}
              className="bg-surface-container-low rounded-lg p-md border border-white/5"
            >
              <div className="flex justify-between items-start mb-sm">
                <div className="flex items-center gap-sm">
                  <ExerciseMedia exercise={it.exercise} />
                  <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-grotesk font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-body-lg text-on-surface">{it.exercise.name}</p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      {it.exercise.muscleGroup} · {it.exercise.equipment}
                    </p>
                  </div>
                </div>
                <div className="flex gap-xs">
                  <button
                    onClick={() => mover(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-bright"
                  >
                    <Icon name="arrow_upward" size={14} />
                  </button>
                  <button
                    onClick={() => mover(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="w-7 h-7 rounded bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-bright"
                  >
                    <Icon name="arrow_downward" size={14} />
                  </button>
                  <button
                    onClick={() => quitar(idx)}
                    className="w-7 h-7 rounded bg-error/10 text-error hover:bg-error/20"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-sm">
                <CampoNumero
                  etiqueta="Series"
                  valor={it.targetSets}
                  onChange={(v) => actualizar(idx, { targetSets: v })}
                  min={1}
                  max={20}
                />
                <CampoNumero
                  etiqueta="Reps"
                  valor={it.targetReps ?? 0}
                  onChange={(v) => actualizar(idx, { targetReps: v || null })}
                  min={0}
                  max={100}
                />
                <CampoNumero
                  etiqueta="Peso (kg)"
                  valor={it.targetWeightKg ?? 0}
                  onChange={(v) => actualizar(idx, { targetWeightKg: v || null })}
                  min={0}
                  max={500}
                  paso={2.5}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-md flex items-start gap-sm">
          <Icon name="error" className="text-error mt-px" size={18} />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="flex gap-sm">
        <Button onClick={onCancelar} variant="secondary" size="lg" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={guardar} loading={guardando} size="lg" className="flex-1">
          <Icon name="save" />
          Guardar rutina
        </Button>
      </div>

      {seleccionando && (
        <ExercisePicker onPick={agregarEjercicio} onClose={() => setSeleccionando(false)} />
      )}
    </div>
  );
}

function CampoNumero({
  etiqueta,
  valor,
  onChange,
  min,
  max,
  paso = 1,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  paso?: number;
}) {
  return (
    <div>
      <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-xs block uppercase">
        {etiqueta}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-background border border-white/10 rounded text-center font-grotesk text-on-surface py-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
      />
    </div>
  );
}
