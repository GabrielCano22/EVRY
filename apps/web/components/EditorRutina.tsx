'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import {
  createRoutine,
  trainingKeys,
  updateRoutine,
  type CreateRoutineInput,
  type ExerciseListItem,
  type Routine,
  type UpdateRoutineInput,
} from '@/lib/training-api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Icon } from './ui/Icon';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseMedia } from './ExerciseMedia';
import { cn } from '@/lib/utils';
import { MapaMuscular } from './MapaMuscular';
import {
  etiquetaEquipo,
  etiquetaGrupoMuscular,
  traducirNombreEjercicio,
} from '@/lib/exercise-i18n';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface ItemRutina {
  exerciseId: string;
  exercise: ExerciseListItem | Routine['exercises'][number]['exercise'];
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  seriesPlan: SerieObjetivo[];
  notes?: string;
}

type SerieObjetivo = { reps: number | null; weightKg: number | null };

function crearPlan(series: number, reps: number | null, peso: number | null): SerieObjetivo[] {
  return Array.from({ length: Math.max(1, series) }, () => ({ reps, weightKg: peso }));
}

function normalizarPlan(
  plan: unknown,
  series: number,
  reps: number | null,
  peso: number | null,
): SerieObjetivo[] {
  const planValido = Array.isArray(plan)
    ? plan.flatMap((objetivo) => {
        if (!objetivo || typeof objetivo !== 'object') return [];
        const repsObjetivo = 'reps' in objetivo && typeof objetivo.reps === 'number'
          ? objetivo.reps
          : null;
        const pesoObjetivo = 'weightKg' in objetivo && typeof objetivo.weightKg === 'number'
          ? objetivo.weightKg
          : null;
        return [{ reps: repsObjetivo, weightKg: pesoObjetivo }];
      })
    : [];
  const base = planValido.length ? planValido : crearPlan(series, reps, peso);
  return base.slice(0, Math.max(1, series)).concat(
    Array.from({ length: Math.max(0, series - base.length) }, () => ({
      reps: base.at(-1)?.reps ?? reps,
      weightKg: base.at(-1)?.weightKg ?? peso,
    })),
  );
}

interface Props {
  titulo: string;
  diaInicial?: number | null;
  rutinaExistente?: Routine;
  onListo: () => void;
  onCancelar: () => void;
}

export function EditorRutina({ titulo, diaInicial, rutinaExistente, onListo, onCancelar }: Props) {
  const accountId = useAutenticacion((state) => state.usuario?.id);
  const queryClient = useQueryClient();
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
      seriesPlan: normalizarPlan(e.seriesPlan, e.targetSets, e.targetReps, e.targetWeightKg),
      notes: e.notes ?? undefined,
    })) ?? [],
  );
  const [seleccionando, setSeleccionando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const guardarRutina = useMutation({
    mutationFn: async () => {
      const exercises = items.map((item, order) => {
        const firstSet = item.seriesPlan[0];
        return {
          exerciseId: item.exerciseId,
          order,
          targetSets: item.targetSets,
          ...(firstSet?.reps == null ? {} : { targetReps: firstSet.reps }),
          ...(firstSet?.weightKg == null ? {} : { targetWeightKg: firstSet.weightKg }),
          seriesPlan: item.seriesPlan,
          notes: item.notes ?? null,
        };
      });
      if (rutinaExistente) {
        const body: UpdateRoutineInput = {
          name: nombre.trim(),
          dayOfWeek: dia,
          notes: rutinaExistente.notes,
          exercises,
        };
        return updateRoutine(rutinaExistente.id, body);
      }
      const body: CreateRoutineInput = {
        name: nombre.trim(),
        ...(dia === null ? {} : { dayOfWeek: dia }),
        notes: null,
        exercises,
      };
      return createRoutine(body);
    },
    onSuccess: async () => {
      if (accountId) {
        await queryClient.invalidateQueries({ queryKey: trainingKeys.routines(accountId) });
      }
      onListo();
    },
  });

  const apiError = guardarRutina.error instanceof ApiError ? guardarRutina.error : null;
  const errorNombre = apiError?.fieldErrors?.name?.[0];
  const errorRemoto = guardarRutina.isError
    ? apiError?.message ?? 'No se pudo guardar la rutina.'
    : null;
  const error = errorLocal ?? errorRemoto;

  function agregarEjercicio(ej: ExerciseListItem) {
    if (items.some((item) => item.exerciseId === ej.id)) {
      setErrorLocal('Este ejercicio ya fue seleccionado para este día de entrenamiento.');
      return;
    }
    setErrorLocal(null);
    guardarRutina.reset();
    setItems((arr) => [
      ...arr,
      {
        exerciseId: ej.id,
        exercise: ej,
        targetSets: 3,
        targetReps: 10,
        targetWeightKg: null,
        seriesPlan: crearPlan(3, 10, null),
      },
    ]);
    setSeleccionando(false);
  }

  function cambiarNumeroDeSeries(idx: number, valor: number | null) {
    const cantidad = Math.max(1, Math.min(20, valor ?? 1));
    setItems((arr) =>
      arr.map((it, i) =>
        i === idx
          ? {
              ...it,
              targetSets: cantidad,
              seriesPlan: normalizarPlan(it.seriesPlan, cantidad, it.targetReps, it.targetWeightKg),
            }
          : it,
      ),
    );
  }

  function cambiarObjetivoDeSerie(idx: number, serie: number, parche: Partial<SerieObjetivo>) {
    setItems((arr) =>
      arr.map((it, i) =>
        i === idx
          ? {
              ...it,
              seriesPlan: it.seriesPlan.map((objetivo, numero) =>
                numero === serie ? { ...objetivo, ...parche } : objetivo,
              ),
              targetReps: serie === 0 && parche.reps !== undefined ? parche.reps : it.targetReps,
              targetWeightKg:
                serie === 0 && parche.weightKg !== undefined ? parche.weightKg : it.targetWeightKg,
            }
          : it,
      ),
    );
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

  function guardar() {
    setErrorLocal(null);
    guardarRutina.reset();
    if (!nombre.trim()) return setErrorLocal('Ponle un nombre a la rutina.');
    if (items.length === 0) return setErrorLocal('Agrega al menos un ejercicio.');
    guardarRutina.mutate();
  }

  return (
    <div className="space-y-lg">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{titulo}</h1>
          <p className="font-body-md text-on-surface-variant">
            Define los ejercicios y series objetivo de esta rutina.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cerrar editor de rutina"
          className="w-10 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center"
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="bg-surface-container rounded-xl p-lg border border-white/5 space-y-md">
        <Input
          label="Nombre de la rutina"
          error={errorNombre}
          icon="title"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (guardarRutina.isError) guardarRutina.reset();
          }}
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

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-lg">
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
                    <p className="font-body-lg text-on-surface">
                      {traducirNombreEjercicio(it.exercise.name)}
                    </p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      {etiquetaGrupoMuscular(it.exercise.muscleGroup)} · {etiquetaEquipo(it.exercise.equipment)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-xs">
                  <button
                    type="button"
                    onClick={() => mover(idx, -1)}
                    aria-label="Subir ejercicio"
                    disabled={idx === 0}
                    className="w-7 h-7 rounded bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-bright"
                  >
                    <Icon name="arrow_upward" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(idx, 1)}
                    aria-label="Bajar ejercicio"
                    disabled={idx === items.length - 1}
                    className="w-7 h-7 rounded bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-bright"
                  >
                    <Icon name="arrow_downward" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => quitar(idx)}
                    aria-label={`Eliminar ${traducirNombreEjercicio(it.exercise.name)}`}
                    className="w-7 h-7 rounded bg-error/10 text-error hover:bg-error/20"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
                <CampoNumero
                  etiqueta="Series"
                  valor={it.targetSets}
                  onChange={(v) => cambiarNumeroDeSeries(idx, v)}
                  min={1}
                  max={20}
                />
              </div>
              <div className="mt-md space-y-xs rounded-lg border border-white/5 bg-background/50 p-sm">
                <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-sm px-xs text-[10px] uppercase tracking-wider text-on-surface-variant">
                  <span>Serie</span>
                  <span>Repeticiones</span>
                  <span>Peso (kg)</span>
                </div>
                {it.seriesPlan.map((serie, numero) => (
                  <div key={`${it.exerciseId}-serie-${numero}`} className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-sm">
                    <span className="pb-xs text-center font-grotesk text-sm text-primary">{numero + 1}</span>
                    <CampoNumero
                      etiqueta=""
                      valor={serie.reps}
                      onChange={(valor) => cambiarObjetivoDeSerie(idx, numero, { reps: valor })}
                      min={0}
                      max={100}
                    />
                    <CampoNumero
                      etiqueta=""
                      valor={serie.weightKg}
                      onChange={(valor) => cambiarObjetivoDeSerie(idx, numero, { weightKg: valor })}
                      min={0}
                      max={500}
                      paso={2.5}
                    />
                  </div>
                ))}
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
        <Button onClick={guardar} loading={guardarRutina.isPending} size="lg" className="flex-1">
          <Icon name="save" />
          Guardar rutina
        </Button>
      </div>

      </div>
      <aside className="lg:sticky lg:top-lg lg:self-start">
        <MapaMuscular ejercicios={items.map((item) => item.exercise)} />
      </aside>
      </div>

      {seleccionando && (
        <ExercisePicker
          onPick={agregarEjercicio}
          onClose={() => setSeleccionando(false)}
          idsExcluidos={items.map((item) => item.exerciseId)}
        />
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
  valor: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  paso?: number;
}) {
  const [texto, setTexto] = useState(valor === null ? '' : String(valor));
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => {
    if (!enfocado) setTexto(valor === null ? '' : String(valor));
  }, [enfocado, valor]);

  function cambiarTexto(nuevoTexto: string) {
    if (!/^[0-9]*([.,][0-9]*)?$/.test(nuevoTexto)) return;
    setTexto(nuevoTexto);
    if (nuevoTexto.trim() === '') {
      onChange(null);
      return;
    }
    const numero = Number(nuevoTexto.replace(',', '.'));
    if (Number.isFinite(numero)) onChange(numero);
  }

  function normalizarAlSalir() {
    setEnfocado(false);
    const numero = texto.trim() === '' ? null : Number(texto.replace(',', '.'));
    if (numero === null || !Number.isFinite(numero)) {
      onChange(null);
      setTexto('');
      return;
    }
    const limitado = Math.min(max, Math.max(min, numero));
    const escalado = paso === 1 ? Math.round(limitado) : Math.round(limitado / paso) * paso;
    onChange(escalado);
    setTexto(String(escalado));
  }

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
        value={texto}
        onFocus={() => setEnfocado(true)}
        onBlur={normalizarAlSalir}
        onChange={(e) => cambiarTexto(e.target.value)}
        inputMode="decimal"
        className="w-full bg-background border border-white/10 rounded text-center font-grotesk text-on-surface py-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
      />
    </div>
  );
}
