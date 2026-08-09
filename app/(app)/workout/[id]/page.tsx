'use client';
import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Entrenamiento, Ejercicio, SerieEntrenamiento, Recomendacion } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { ExerciseMedia } from '@/components/ExerciseMedia';
import { formatearFechaHora } from '@/lib/utils';
import { getExerciseInstruction } from '@/lib/exercise-media';

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

  async function recargar() {
    const datos = await api<Entrenamiento>(`/workouts/${id}`);
    setEntrenamiento(datos);
  }
  useEffect(() => {
    recargar().catch(() => router.replace('/workout'));
  }, [id]);

  async function seleccionarEjercicio(ejercicio: Ejercicio) {
    const detalle = await api<Ejercicio>(`/exercises/${ejercicio.id}`).catch(() => ejercicio);
    setEjercicioActivo(detalle);
    setSeleccionando(false);
    try {
      const rec = await api<Recomendacion>(`/adaptive/recommend/${detalle.id}`);
      setRecomendacion(rec);
      if (rec.targetWeightKg) setPeso(rec.targetWeightKg);
      if (rec.targetReps) setReps(rec.targetReps);
    } catch {
      setRecomendacion(null);
    }
  }

  async function registrarSerie() {
    if (!ejercicioActivo || !entrenamiento) return;
    const orden =
      entrenamiento.sets.filter((s) => s.exerciseId === ejercicioActivo.id).length + 1;
    await api<SerieEntrenamiento>(`/workouts/${id}/sets`, {
      method: 'POST',
      json: { exerciseId: ejercicioActivo.id, order: orden, weightKg: peso, reps, rpe },
    });
    setResetTimer((k) => k + 1);
    await recargar();
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

          {[...agrupado.entries()].map(([idEjercicio, series], idx) => {
            const ejercicio = series[0].exercise;
            return (
              <div
                key={idEjercicio}
                className="bg-surface-container rounded-xl overflow-hidden border border-white/5"
              >
                <div className="p-md bg-surface-container-high border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-md">
                    {ejercicio && <ExerciseMedia exercise={ejercicio} />}
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-grotesk font-bold">
                      {idx + 1}
                    </div>
                    <h2 className="font-headline-md text-lg text-on-surface">{ejercicio?.name}</h2>
                  </div>
                </div>
                <div className="p-md">
                  <div className="grid grid-cols-12 gap-unit px-sm mb-sm font-grotesk text-label-caps tracking-wider text-on-surface-variant uppercase">
                    <div className="col-span-1 text-center">N°</div>
                    <div className="col-span-4 text-center">KG</div>
                    <div className="col-span-3 text-center">Reps</div>
                    <div className="col-span-2 text-center">RPE</div>
                    <div className="col-span-2 text-center">
                      <Icon name="check" size={14} />
                    </div>
                  </div>
                  {series
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
                    {ejercicioActivo.name}
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
                <Button onClick={registrarSerie} size="lg" className="w-full">
                  <Icon name="check" fill />
                  Registrar serie
                </Button>
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
