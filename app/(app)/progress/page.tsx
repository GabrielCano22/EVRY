'use client';
import { useEffect, useState } from 'react';
import { request } from '@/lib/api';
import { remoteFromResult, type RemoteData } from '@/lib/remote-data';
import type { ResumenProgreso } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { ExerciseChart } from '@/components/ExerciseChart';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { cn } from '@/lib/utils';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

export default function PaginaProgreso() {
  const [estado, setEstado] = useState<RemoteData<ResumenProgreso>>({ status: 'loading' });
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    void request<ResumenProgreso>('/progress/overview').then((result) => {
      const next = remoteFromResult(result, { isEmpty: (data) => data.topExercises.length === 0 });
      setEstado(next);
      if (result.ok) setSeleccionado(result.data.topExercises[0]?.exerciseId ?? null);
    });
  }, []);

  if (estado.status === 'loading' || estado.status === 'idle') return <p role="status" className="text-on-surface-variant">Cargando…</p>;
  if (estado.status === 'error') return <div role="alert" className="text-error">No pudimos cargar tu progreso. <button type="button" onClick={() => location.reload()} className="underline">Reintentar</button></div>;
  if (!('data' in estado)) return null;
  const datos = estado.data;

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Progreso</h1>
        <p className="font-body-md text-on-surface-variant">
          Tu rendimiento de los últimos 30 días.
        </p>
      </header>

      <div className="grid gap-md lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,.95fr)]">
        <div className="animate-rise rounded-xl border border-white/5 bg-surface-container-low p-md">
          <CalendarioActividad />
        </div>
        <ResumenPeriodo datos={datos} seleccionado={seleccionado} />
      </div>

      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        <TarjetaEstadistica
          icono="event"
          etiqueta="Sesiones"
          valor={datos.workoutsCompleted.toString()}
          acento="primary"
        />
        <TarjetaEstadistica
          icono="weight"
          etiqueta="Volumen"
          valor={`${Math.round(datos.volumeKg).toLocaleString('es-CO')}`}
          sufijo="KG"
          acento="secondary"
        />
        <TarjetaEstadistica
          icono="trending_up"
          etiqueta="Récords"
          valor={datos.topExercises.filter((e) => e.trendSlope > 0).length.toString()}
          acento="tertiary"
        />
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        <div className="lg:col-span-5 animate-rise" style={{ animationDelay: '120ms' }}>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-md">
            Mejores ejercicios
          </h2>
          <div className="bg-surface-container-low rounded-xl border border-white/5 divide-y divide-white/5">
            {datos.topExercises.length === 0 ? (
              <p className="p-lg text-on-surface-variant text-center font-body-md">
                Sin datos. Termina algunas sesiones.
              </p>
            ) : (
              datos.topExercises.map((ej) => (
                <button
                  key={ej.exerciseId}
                  onClick={() => setSeleccionado(ej.exerciseId)}
                  className={cn(
                    'w-full text-left p-md flex justify-between items-center transition-colors',
                    seleccionado === ej.exerciseId
                      ? 'bg-primary/10'
                      : 'hover:bg-surface-container/40',
                  )}
                >
                  <div>
                    <p className="font-body-lg text-on-surface">{traducirNombreEjercicio(ej.name)}</p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      {ej.bestWeight}kg × {ej.bestReps} · {ej.sessionsCount} sesiones
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-grotesk text-numeric-data text-on-surface tabular-nums">
                      {ej.estimated1RM.toFixed(1)}
                    </p>
                    <p
                      className={cn(
                        'font-grotesk text-[10px] tracking-wider flex items-center gap-1 justify-end',
                        ej.trendSlope > 0
                          ? 'text-secondary'
                          : ej.trendSlope < 0
                          ? 'text-error'
                          : 'text-on-surface-variant',
                      )}
                    >
                      <Icon
                        name={
                          ej.trendSlope > 0
                            ? 'trending_up'
                            : ej.trendSlope < 0
                            ? 'trending_down'
                            : 'trending_flat'
                        }
                        size={12}
                      />
                      1RM
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-7 animate-rise" style={{ animationDelay: '180ms' }}>
          {seleccionado && <ExerciseChart exerciseId={seleccionado} />}
        </div>
      </div>
    </div>
  );
}

function ResumenPeriodo({
  datos,
  seleccionado,
}: {
  datos: ResumenProgreso;
  seleccionado: string | null;
}) {
  const ejercicio = datos.topExercises.find((item) => item.exerciseId === seleccionado) ?? datos.topExercises[0];
  const records = datos.topExercises.filter((item) => item.trendSlope > 0).length;
  const objetivo = Math.max(datos.workoutsCompleted + 1, 3);
  const avance = Math.min(100, Math.round((datos.workoutsCompleted / objetivo) * 100));

  return (
    <aside className="animate-rise flex h-full flex-col justify-between rounded-xl border border-white/5 bg-surface-container-low p-lg" style={{ animationDelay: '70ms' }}>
      <div>
        <div className="flex items-start justify-between gap-md">
          <div>
            <p className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-primary">Lectura de tu progreso</p>
            <h2 className="mt-xs font-headline-md text-white">Este mes vas construyendo ritmo</h2>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="auto_awesome" size={20} /></span>
        </div>

        <div className="mt-lg rounded-xl border border-white/5 bg-background/50 p-md">
          <div className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm"><Icon name="flag" className="text-secondary" size={20} /><span className="text-sm text-white">Objetivo de sesiones</span></div>
            <span className="font-grotesk text-sm tabular-nums text-on-surface-variant">{datos.workoutsCompleted}/{objetivo}</span>
          </div>
          <div className="mt-sm h-2 overflow-hidden rounded-full bg-surface-container-high" aria-label={`${avance}% del objetivo de sesiones`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avance}>
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-500" style={{ width: `${avance}%` }} />
          </div>
          <p className="mt-sm text-xs leading-relaxed text-on-surface-variant">Una sesión consistente esta semana vale más que una semana perfecta y difícil de repetir.</p>
        </div>

        <div className="mt-md grid grid-cols-2 gap-sm">
          <div className="rounded-xl bg-background/50 p-md"><span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Récords al alza</span><strong className="mt-xs block font-display-lg text-3xl text-white">{records}</strong><span className="text-xs text-on-surface-variant">ejercicios</span></div>
          <div className="rounded-xl bg-background/50 p-md"><span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Volumen total</span><strong className="mt-xs block font-display-lg text-3xl text-white">{Math.round(datos.volumeKg).toLocaleString('es-CO')}</strong><span className="text-xs text-on-surface-variant">kilogramos</span></div>
        </div>

        {ejercicio && (
          <div className="mt-md rounded-xl border border-secondary/20 bg-secondary/5 p-md">
            <div className="flex items-center gap-sm"><Icon name="insights" className="text-secondary" size={19} /><span className="text-[10px] uppercase tracking-[0.16em] text-secondary">Tu foco</span></div>
            <p className="mt-sm truncate font-headline-md text-white">{traducirNombreEjercicio(ejercicio.name)}</p>
            <p className="mt-xs text-xs text-on-surface-variant">Mejor marca {ejercicio.bestWeight} kg × {ejercicio.bestReps} · {ejercicio.sessionsCount} sesiones</p>
          </div>
        )}
      </div>

      <div className="mt-lg flex flex-col gap-sm sm:flex-row lg:flex-col xl:flex-row">
        <a href="/workout" className="inline-flex min-h-11 flex-1 items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm font-grotesk text-label-caps uppercase tracking-wider text-on-primary transition-colors hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon name="play_arrow" size={18} /> Iniciar sesión</a>
        <a href="/workout" className="inline-flex min-h-11 flex-1 items-center justify-center gap-xs rounded-lg border border-white/10 px-md py-sm font-grotesk text-label-caps uppercase tracking-wider text-on-surface-variant transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Icon name="calendar_view_week" size={18} /> Ver rutinas</a>
      </div>
    </aside>
  );
}

function TarjetaEstadistica({
  icono,
  etiqueta,
  valor,
  sufijo,
  acento,
}: {
  icono: string;
  etiqueta: string;
  valor: string;
  sufijo?: string;
  acento: 'primary' | 'secondary' | 'tertiary';
}) {
  const colorAcento =
    acento === 'primary'
      ? 'text-primary bg-primary/10'
      : acento === 'secondary'
      ? 'text-secondary bg-secondary/10'
      : 'text-tertiary bg-tertiary/10';
  return (
    <div className="bg-surface-container-low rounded-xl p-md border border-white/5 relative overflow-hidden">
      <div
        className={cn(
          'absolute -right-4 -top-4 w-32 h-32 rounded-full blur-2xl',
          colorAcento,
        )}
      ></div>
      <div className="relative">
        <div className="flex items-center gap-sm mb-md">
          <Icon
            name={icono}
            className={
              acento === 'primary'
                ? 'text-primary'
                : acento === 'secondary'
                ? 'text-secondary'
                : 'text-tertiary'
            }
          />
          <h3 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
            {etiqueta}
          </h3>
        </div>
        <div className="flex items-baseline gap-sm">
          <span className="font-display-lg text-display-lg text-on-surface">{valor}</span>
          {sufijo && (
            <span className="font-grotesk text-label-caps text-on-surface-variant">{sufijo}</span>
          )}
        </div>
      </div>
    </div>
  );
}
