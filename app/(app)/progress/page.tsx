'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ResumenProgreso } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { ExerciseChart } from '@/components/ExerciseChart';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { cn } from '@/lib/utils';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

export default function PaginaProgreso() {
  const [datos, setDatos] = useState<ResumenProgreso | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    api<ResumenProgreso>('/progress/overview').then((d) => {
      setDatos(d);
      setSeleccionado(d.topExercises[0]?.exerciseId ?? null);
    });
  }, []);

  if (!datos) return <p className="text-on-surface-variant">Cargando…</p>;

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Progreso</h1>
        <p className="font-body-md text-on-surface-variant">
          Tu rendimiento de los últimos 30 días.
        </p>
      </header>

      <CalendarioActividad />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-5">
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

        <div className="lg:col-span-7">
          {seleccionado && <ExerciseChart exerciseId={seleccionado} />}
        </div>
      </div>
    </div>
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
