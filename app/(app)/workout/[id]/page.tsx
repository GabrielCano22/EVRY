'use client';
import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, request } from '@/lib/api';
import type { Entrenamiento, Ejercicio, SerieEntrenamiento, Recomendacion, SerieObjetivo } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { ExerciseMedia } from '@/components/ExerciseMedia';
import { formatearFechaHora } from '@/lib/utils';
import { getExerciseInstruction } from '@/lib/exercise-media';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

const ACCIONES_ESPANOL: Record<Recomendacion['action'], string> = {
  PROGRESS: 'Progresar',
  HOLD: 'Mantener',
  DELOAD: 'Bajar carga',
  NEW: 'Nuevo',
};

const FASES_ESPANOL: Record<string, string> = {
  MENSTRUAL: 'Menstrual',
  FOLLICULAR: 'Folicular',
  OVULATION: 'Ovulación',
  LUTEAL: 'Lútea',
};

interface EjercicioEnSesion {
  id: string;
  exercise?: Ejercicio;
  series: SerieEntrenamiento[];
  targetSets?: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  seriesPlan?: SerieObjetivo[] | null;
}

export default function DetalleEntrenamiento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entrenamiento, setEntrenamiento] = useState<Entrenamiento | null>(null);
  const [seleccionando, setSeleccionando] = useState(false);
  const [ejercicioActivo, setEjercicioActivo] = useState<Ejercicio | null>(null);
  const [recomendacion, setRecomendacion] = useState<Recomendacion | null>(null);
  const [peso, setPeso] = useState(20);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState(7);
  const [resetTimer, setResetTimer] = useState(0);
  const [guardandoSerie, setGuardandoSerie] = useState(false);
  const [errorSerie, setErrorSerie] = useState<string | null>(null);

  async function recargar() {
    const result = await request<Entrenamiento>(`/workouts/${id}`);
    if (result.ok) setEntrenamiento(result.data);
    else if (result.error.code !== 'aborted') setErrorSerie(result.error.message);
  }
  useEffect(() => {
    void recargar();
  }, [id]);

  async function seleccionarEjercicio(ejercicio: Ejercicio) {
    setErrorSerie(null);
    const detalleResult = await request<Ejercicio>(`/exercises/${ejercicio.id}`);
    if (!detalleResult.ok) {
      if (detalleResult.error.code !== 'aborted') setErrorSerie(detalleResult.error.message);
      return;
    }
    const detalle = detalleResult.data;
    setEjercicioActivo(detalle);
    setSeleccionando(false);
    const plan = entrenamiento?.routine?.exercises.find((item) => item.exerciseId === detalle.id)?.seriesPlan ?? null;
    const numeroSerie = entrenamiento?.sets.filter((serie) => serie.exerciseId === detalle.id).length ?? 0;
    const objetivo = plan?.[numeroSerie] ?? plan?.at(-1);
    {
      const result = await request<Recomendacion>(`/adaptive/recommend/${detalle.id}`);
      if (result.ok) {
        const rec = result.data;
      setRecomendacion(rec);
      if (objetivo?.weightKg !== undefined) setPeso(objetivo.weightKg ?? 0);
      else if (rec.targetWeightKg !== null) setPeso(rec.targetWeightKg);
      if (objetivo?.reps !== undefined) setReps(objetivo.reps ?? 0);
      else if (rec.targetReps !== null) setReps(rec.targetReps);
      } else {
      setRecomendacion(null);
      if (result.error.code !== 'aborted') setErrorSerie(result.error.message);
      if (objetivo?.weightKg !== undefined) setPeso(objetivo.weightKg ?? 0);
      if (objetivo?.reps !== undefined) setReps(objetivo.reps ?? 0);
      }
    }
  }

  async function registrarSerie() {
    if (!ejercicioActivo || !entrenamiento || guardandoSerie) return;
    const orden =
      entrenamiento.sets.filter((s) => s.exerciseId === ejercicioActivo.id).length + 1;
    setGuardandoSerie(true);
    setErrorSerie(null);
    try {
      await api<SerieEntrenamiento>(`/workouts/${id}/sets`, {
        method: 'POST',
        json: { exerciseId: ejercicioActivo.id, order: orden, weightKg: peso, reps, rpe },
      });
      setResetTimer((k) => k + 1);
      await recargar();
    } catch (error: any) {
      setErrorSerie(error?.message ?? 'No se pudo registrar la serie. Inténtalo de nuevo.');
    } finally {
      setGuardandoSerie(false);
    }
  }

  async function finalizar() {
    await api(`/workouts/${id}/finish`, { method: 'POST', json: {} });
    router.push('/dashboard');
  }

  const agrupado = useMemo(() => {
    if (!entrenamiento) return new Map<string, SerieEntrenamiento[]>();
    const mapa = new Map<string, SerieEntrenamiento[]>();
    for (const serie of entrenamiento.sets) {
      const lista = mapa.get(serie.exerciseId) ?? [];
      lista.push(serie);
      mapa.set(serie.exerciseId, lista);
    }
    return mapa;
  }, [entrenamiento]);

  const ejerciciosEnSesion = useMemo<EjercicioEnSesion[]>(() => {
    if (!entrenamiento) return [];

    const ejerciciosPlaneados: EjercicioEnSesion[] = (entrenamiento.routine?.exercises ?? []).map((item) => ({
      id: item.exerciseId,
      exercise: item.exercise,
      series: agrupado.get(item.exerciseId) ?? [],
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      targetWeightKg: item.targetWeightKg,
      seriesPlan: item.seriesPlan,
    }));
    const idsPlaneados = new Set(ejerciciosPlaneados.map((item) => item.id));

    for (const [exerciseId, series] of agrupado) {
      if (!idsPlaneados.has(exerciseId)) {
        ejerciciosPlaneados.push({
          id: exerciseId,
          exercise: series[0]?.exercise,
          series,
        });
      }
    }

    return ejerciciosPlaneados;
  }, [agrupado, entrenamiento]);

  if (!entrenamiento) return <p className="text-on-surface-variant">Cargando…</p>;
  const finalizada = !!entrenamiento.endedAt;
  const volumenTotal = entrenamiento.sets
    .filter((s) => !s.isWarmup)
    .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

  return (
    <div className="space-y-lg">
      <header className="flex justify-between items-start gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {entrenamiento.name}
          </h1>
          <p className="font-body-md text-on-surface-variant flex items-center gap-xs">
            <Icon name="calendar_today" size={14} />
            {formatearFechaHora(entrenamiento.startedAt)}
            {finalizada && (
              <span className="ml-sm px-sm py-xs bg-secondary/20 text-secondary font-grotesk text-[10px] tracking-wider rounded">
                FINALIZADA
              </span>
            )}
          </p>
        </div>
        {!finalizada && (
          <Button variant="outline" onClick={finalizar}>
            <Icon name="check_circle" size={16} />
            Finalizar
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-8 space-y-lg">
          {!finalizada && ejercicioActivo && <RestTimer key={resetTimer} seconds={120} />}

          {ejerciciosEnSesion.map((item, idx) => {
            const { exercise: ejercicio, series } = item;
            return (
              <div
                key={item.id}
                className="bg-surface-container rounded-xl overflow-hidden border border-white/5"
              >
                <div className="p-md bg-surface-container-high border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-md">
                    {ejercicio && <ExerciseMedia exercise={ejercicio} />}
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-grotesk font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h2 className="font-headline-md text-lg text-on-surface">
                        {ejercicio ? traducirNombreEjercicio(ejercicio.name) : 'Ejercicio'}
                      </h2>
                      {item.targetSets && (
                        <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant">
                          Objetivo: {item.targetSets} × {item.targetReps ?? '—'}
                          {item.targetWeightKg ? ` · ${item.targetWeightKg} kg` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {!finalizada && ejercicio && ejercicioActivo?.id !== ejercicio.id && (
                    <button
                      type="button"
                      onClick={() => seleccionarEjercicio(ejercicio)}
                      className="rounded-lg border border-primary/30 px-sm py-xs font-grotesk text-[10px] tracking-wider text-primary transition-colors hover:bg-primary/10"
                    >
                      {series.length > 0 ? 'Añadir serie' : 'Empezar'}
                    </button>
                  )}
                </div>
                <div className="p-md">
                  {item.seriesPlan && item.seriesPlan.length > 0 && (
                    <div className="mb-md rounded-lg border border-primary/15 bg-primary/5 p-sm">
                      <p className="mb-xs font-grotesk text-[10px] uppercase tracking-wider text-primary">
                        Objetivo por serie
                      </p>
                      <div className="grid grid-cols-1 gap-xs sm:grid-cols-2">
                        {item.seriesPlan.map((objetivo, numero) => (
                          <div key={`${item.id}-objetivo-${numero}`} className="flex items-center justify-between rounded bg-background/40 px-sm py-xs text-xs text-on-surface-variant">
                            <span>Serie {numero + 1}</span>
                            <span className="tabular-nums text-on-surface">
                              {objetivo.reps ?? '—'} rep{objetivo.reps === 1 ? '' : 's'} ·{' '}
                              {objetivo.weightKg === null || objetivo.weightKg === undefined ? 'Peso libre' : `${objetivo.weightKg} kg`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {series.length === 0 ? (
                    <p className="rounded-lg bg-surface-container-low px-md py-sm text-sm text-on-surface-variant">
                      Aún no registras series para este ejercicio.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-unit px-sm mb-sm font-grotesk text-label-caps tracking-wider text-on-surface-variant uppercase">
                        <div className="col-span-1 text-center">N°</div>
                        <div className="col-span-4 text-center">KG</div>
                        <div className="col-span-3 text-center">Repeticiones</div>
                        <div className="col-span-2 text-center">RPE</div>
                        <div className="col-span-2 text-center">
                          <Icon name="check" size={14} />
                        </div>
                      </div>
                      {[...series]
                        .sort((a, b) => a.order - b.order)
                        .map((serie, i) => (
                          <div
                            key={serie.id}
                            className="grid grid-cols-12 gap-unit items-center p-sm rounded-lg mb-unit hover:bg-surface-container-high/30 transition-colors"
                          >
                            <div className="col-span-1 text-center font-grotesk text-on-surface">
                              {i + 1}
                            </div>
                            <div className="col-span-4 text-center font-grotesk text-on-surface tabular-nums">
                              {serie.weightKg ?? '—'}
                            </div>
                            <div className="col-span-3 text-center font-grotesk text-on-surface tabular-nums">
                              {serie.reps ?? '—'}
                            </div>
                            <div className="col-span-2 text-center font-grotesk text-on-surface-variant tabular-nums">
                              {serie.rpe ?? '—'}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                                <Icon name="check" fill size={14} />
                              </div>
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!finalizada && !ejercicioActivo && (
            <button
              onClick={() => setSeleccionando(true)}
              className="w-full py-md rounded-xl border border-primary text-primary hover:bg-primary/5 transition-all font-grotesk text-label-caps flex items-center justify-center gap-xs tracking-wider uppercase"
            >
              <Icon name="add_circle" />
              Agregar ejercicio
            </button>
          )}

          {seleccionando && (
            <ExercisePicker
              onPick={seleccionarEjercicio}
              onClose={() => setSeleccionando(false)}
              idsExcluidos={ejerciciosEnSesion.map((ejercicio) => ejercicio.id)}
            />
          )}

          {!finalizada && ejercicioActivo && (
            <div className="bg-surface-container rounded-xl p-lg border border-white/5">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-md">
                  <ExerciseMedia exercise={ejercicioActivo} variant="detail" className="hidden h-20 w-20 sm:block" />
                  <div>
                  <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary block">
                    Registrando
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    {traducirNombreEjercicio(ejercicioActivo.name)}
                  </h3>
                  </div>
                </div>
                <button
                  onClick={() => setEjercicioActivo(null)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name="close" />
                </button>
              </div>

              {getExerciseInstruction(ejercicioActivo).length > 0 && (
                <div className="mb-md rounded-lg border border-white/5 bg-surface-container-low p-md">
                  <div className="mb-sm flex items-center gap-xs">
                    <Icon name="menu_book" size={16} className="text-primary" />
                    <span className="font-grotesk text-label-caps tracking-wider text-primary">Técnica</span>
                  </div>
                  <ol className="list-decimal space-y-xs pl-lg text-sm leading-relaxed text-on-surface-variant">
                    {getExerciseInstruction(ejercicioActivo).map((paso, index) => (
                      <li key={`${index}-${paso}`}>{paso}</li>
                    ))}
                  </ol>
                  {ejercicioActivo.attribution && (
                    <p className="mt-sm text-[10px] text-outline">{ejercicioActivo.attribution}</p>
                  )}
                </div>
              )}

              {recomendacion && (
                <div className="p-md bg-secondary/15 border border-secondary/30 rounded-lg mb-md">
                  <div className="flex items-center gap-sm mb-xs">
                    <Icon name="auto_awesome" className="text-secondary" size={16} />
                    <span className="font-grotesk text-label-caps tracking-wider uppercase text-secondary">
                      Sugerencia · {ACCIONES_ESPANOL[recomendacion.action]} ·{' '}
                      {(recomendacion.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ul className="text-xs text-on-surface-variant space-y-xs">
                    {recomendacion.rationale.map((r, i) => (
                      <li key={i}>· {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-lg">
                <div>
                  <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-sm block uppercase">
                    Peso
                  </span>
                  <Stepper value={peso} step={2.5} min={0} onChange={setPeso} suffix="KG" />
                </div>
                <div>
                  <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-sm block uppercase">
                    Repeticiones
                  </span>
                  <Stepper value={reps} step={1} min={0} max={100} onChange={setReps} />
                </div>
                <div>
                  <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-sm block uppercase">
                    RPE (esfuerzo percibido)
                  </span>
                  <Stepper value={rpe} step={1} min={1} max={10} onChange={setRpe} />
                </div>
                <Button onClick={registrarSerie} loading={guardandoSerie} size="lg" className="w-full">
                  <Icon name="check" fill />
                  Registrar serie
                </Button>
                {errorSerie && (
                  <p role="alert" className="text-center text-sm text-error">
                    {errorSerie}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-md">
          <div className="bg-surface-container rounded-xl p-md border border-white/5">
            <h3 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mb-sm">
              Volumen de la sesión
            </h3>
            <div className="flex items-end gap-sm mb-md">
              <span className="font-grotesk text-display-lg text-on-surface leading-none">
                {Math.round(volumenTotal).toLocaleString('es-CO')}
              </span>
              <span className="font-grotesk text-label-caps text-on-surface-variant pb-1">KG</span>
            </div>
            <p className="font-body-md text-xs text-on-surface-variant mt-sm">
              {entrenamiento.sets.length} series totales · {agrupado.size} ejercicios
            </p>
          </div>

          {entrenamiento.cyclePhase && (
            <div className="bg-surface-container rounded-xl p-md border border-tertiary/20">
              <h3 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mb-sm flex items-center gap-xs">
                <Icon name="cyclone" size={14} /> Fase del ciclo
              </h3>
              <p className="font-headline-md text-tertiary">
                {FASES_ESPANOL[entrenamiento.cyclePhase] ?? entrenamiento.cyclePhase}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
