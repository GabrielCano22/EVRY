'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAutenticacion } from '@/lib/auth-store';
import { request } from '@/lib/api';
import type { InfoFase, ResumenProgreso, Entrenamiento } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ReadinessCheckin } from '@/components/ReadinessCheckin';
import { formatearFechaHora, cn } from '@/lib/utils';
import { compareCivil, formatCivilDate, parseCivilDate, timestampToLocalCivil, todayCivil } from '@/lib/civil-date';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';
import { fraseDelDia as obtenerFraseDelDia } from '@/lib/motivacion';

const FASES_ESPANOL: Record<string, string> = {
  MENSTRUAL: 'Menstrual',
  FOLLICULAR: 'Folicular',
  OVULATION: 'Ovulación',
  LUTEAL: 'Lútea',
};

/* const FRASES_GENERALES = [
  '"El dolor que sientes hoy es la fuerza que sentirás mañana."',
  '"No se trata de ser perfecta, se trata de ser mejor que ayer."',
  '"Tu cuerpo puede aguantar casi cualquier cosa. Es a tu mente a la que tienes que convencer."',
  '"La disciplina pesa gramos. El arrepentimiento pesa toneladas."',
  '"Pequeños pasos cada día construyen grandes cambios."',
  '"Escucha a tu cuerpo. Respeta tu biología. Entrena con cabeza."',
  '"Una hora hoy. Un cuerpo nuevo en seis meses."',
  '"No compitas con nadie más que con quien fuiste ayer."',
  '"La constancia vence al talento cuando el talento no es constante."',
  '"Cada serie cuenta. Cada repetición suma."',
  '"Entrena con ciencia, no solo con esfuerzo."',
  '"El descanso también es entrenamiento."',
  '"Los récords se rompen un kilo a la vez."',
  '"Fuerte por dentro, fuerte por fuera."',
];

const FRASES_CICLO = [
  '"Escucha tu cuerpo: adaptar la intensidad también es progresar."',
  '"Tu ciclo no limita tu fuerza; te enseña a entrenar con inteligencia."',
  '"Descansar cuando lo necesitas es parte de alcanzar tu mejor versión."',
]; */

function calcularRacha(entrenamientos: Entrenamiento[]): number {
  // Días consecutivos hacia atrás desde hoy con al menos una sesión finalizada
  const dias = new Set<number>();
  for (const e of entrenamientos) {
    if (!e.endedAt) continue;
    dias.add(numeroDiaCivil(timestampToLocalCivil(e.startedAt)));
  }
  const hoy = numeroDiaCivil(todayCivil());
  let racha = 0;
  // Permitir que hoy aún no haya entrenado: empezamos desde ayer si hoy no hay
  let cursor = dias.has(hoy) ? hoy : hoy - 1;
  while (dias.has(cursor)) {
    racha++;
    cursor--;
  }
  return racha;
}

function numeroDiaCivil(fecha: ReturnType<typeof todayCivil>): number {
  const { year, month, day } = parseCivilDate(fecha);
  const adjustedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const monthIndex = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * monthIndex + 2) / 5) + day - 1;
  return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
}

export default function PaginaInicio() {
  const { usuario } = useAutenticacion();
  const [fase, setFase] = useState<InfoFase | null>(null);
  const [resumen, setResumen] = useState<ResumenProgreso | null>(null);
  const [recientes, setRecientes] = useState<Entrenamiento[]>([]);
  const [puntajeReadiness, setPuntajeReadiness] = useState<number | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);

  const muestraCiclo = !!usuario?.trackCycle;

  useEffect(() => {
    let activo = true;
    setEstadoCarga('cargando');
    Promise.all([
      muestraCiclo ? request<InfoFase | null>('/cycle/today') : Promise.resolve({ ok: true as const, data: null }),
      request<ResumenProgreso>('/progress/overview'),
      request<Entrenamiento[]>('/workouts?take=20'),
      request<{ score: number; date: string } | null>('/readiness/latest'),
    ]).then(([f, r, ent, rd]) => {
      if (!activo) return;
      if (!f.ok || !r.ok || !ent.ok || !rd.ok) {
        if (activo) setEstadoCarga('error');
        return;
      }
      setFase(f.data);
      setResumen(r.data);
      setRecientes(ent.data);
      if (rd.data && compareCivil(timestampToLocalCivil(rd.data.date), todayCivil()) === 0)
        setPuntajeReadiness(rd.data.score);
      setEstadoCarga('listo');
    });
    return () => {
      activo = false;
    };
  }, [muestraCiclo, intento]);

  const fechaHoy = formatCivilDate(todayCivil(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const racha = useMemo(() => calcularRacha(recientes), [recientes]);
  const top3 = useMemo(
    () => (resumen?.topExercises ?? []).slice().sort((a, b) => b.bestWeight - a.bestWeight).slice(0, 3),
    [resumen],
  );
  const ultimas5 = useMemo(
    () => recientes.filter((e) => e.endedAt).slice(0, 5),
    [recientes],
  );
  const esMujer = usuario?.biologicalSex === 'FEMALE';
  const frase = useMemo(
    () => obtenerFraseDelDia(esMujer, muestraCiclo),
    [esMujer, muestraCiclo],
  );

  return (
    <div className="animate-fade-in space-y-lg">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-xs leading-tight">
            Resumen
          </h2>
          <p className="text-on-surface-variant font-body-md">
            Hola, {usuario?.name?.split(' ')[0]}. A entrenar.
          </p>
        </div>
        <div className="text-right">
          <div className="font-grotesk text-numeric-data text-primary">{fechaHoy}</div>
        </div>
      </div>

      {estadoCarga === 'cargando' && (
        <div role="status" className="flex items-center gap-sm rounded-xl border border-white/5 bg-surface-container-low p-md text-sm text-on-surface-variant">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Preparando tu resumen…
        </div>
      )}
      {estadoCarga === 'error' && (
        <div role="alert" className="flex flex-col items-start justify-between gap-sm rounded-xl border border-error/30 bg-error/10 p-md text-sm text-error sm:flex-row sm:items-center">
          <span>No pudimos cargar todos tus datos. Puedes intentarlo de nuevo.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</Button>
        </div>
      )}

      {/* Frase motivacional */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-xl p-lg border-l-4 border-primary relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="relative flex items-start gap-md">
          <Icon name="format_quote" className="text-primary" size={32} />
          <div>
          <p aria-live="polite" className="font-lexend italic text-body-lg text-on-surface leading-snug">{frase}</p>
            <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant text-[10px] mt-xs">
              Frase del día
            </p>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className={cn('grid gap-md', muestraCiclo ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3')}>
        <TarjetaMetrica
          icono="local_fire_department"
          fillIcono
          color="primary"
          etiqueta="Racha"
          valor={racha.toString()}
          sufijo={racha === 1 ? 'día' : 'días'}
          extra={racha === 0 ? '¡Empieza hoy!' : 'Mantén el ritmo'}
        />
        <TarjetaMetrica
          icono="event"
          color="primary"
          etiqueta="Sesiones 30D"
          valor={(resumen?.workoutsCompleted ?? 0).toString()}
          extra={`${Math.round(resumen?.volumeKg ?? 0).toLocaleString('es-CO')} kg en total`}
        />
        <TarjetaMetrica
          icono="battery_charging_full"
          color="secondary"
          etiqueta="Estado del día"
          valor={puntajeReadiness !== null ? Math.round(puntajeReadiness).toString() : '—'}
          sufijo="/100"
          extra={puntajeReadiness === null ? 'Sin registro de hoy' : puntajeReadiness >= 75 ? 'Empuja' : puntajeReadiness >= 50 ? 'Mantén' : 'Descansa'}
        />
        {muestraCiclo && (
          <TarjetaMetrica
            icono="cyclone"
            color="tertiary"
            etiqueta="Fase del ciclo"
            valor={fase ? FASES_ESPANOL[fase.phase] : '—'}
            extra={fase ? `Día ${fase.dayOfCycle}/${fase.cycleLength}` : 'Sin datos'}
            esTexto
          />
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-md">
        <Link href="/workout">
          <Button size="lg" className="w-full">
            <Icon name="play_arrow" size={20} />
            Iniciar sesión
          </Button>
        </Link>
        <Link href="/workout">
          <Button variant="outline" size="lg" className="w-full">
            <Icon name="calendar_view_week" size={20} />
            Mis rutinas
          </Button>
        </Link>
      </div>

      <ReadinessCheckin />

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* 3 mejores ejercicios */}
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <Icon name="emoji_events" className="text-secondary" />
              3 mejores ejercicios
            </h3>
            <Link
              href="/progress"
              className="font-grotesk text-label-caps tracking-wider uppercase text-primary hover:text-primary-fixed text-[10px]"
            >
              Ver todos
            </Link>
          </div>

          {top3.length === 0 ? (
            <p className="font-body-md text-on-surface-variant text-sm text-center py-md">
              Termina algunas sesiones para ver tus mejores marcas.
            </p>
          ) : (
            <ul className="space-y-sm">
              {top3.map((ej, idx) => (
                <li
                  key={ej.exerciseId}
                  className="flex items-center gap-md p-sm bg-surface-container rounded-lg"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center font-grotesk font-bold text-lg',
                      idx === 0 && 'bg-secondary/20 text-secondary',
                      idx === 1 && 'bg-primary/20 text-primary',
                      idx === 2 && 'bg-tertiary/20 text-tertiary',
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface truncate">{traducirNombreEjercicio(ej.name)}</p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      {ej.sessionsCount} sesiones · 1RM est. {ej.estimated1RM.toFixed(1)}kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-grotesk text-numeric-data text-on-surface tabular-nums leading-none">
                      {ej.bestWeight}
                    </p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      KG × {ej.bestReps}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimas 5 sesiones */}
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <Icon name="history" className="text-primary" />
              Últimas 5 sesiones
            </h3>
            <Link
              href="/workout"
              className="font-grotesk text-label-caps tracking-wider uppercase text-primary hover:text-primary-fixed text-[10px]"
            >
              Historial
            </Link>
          </div>

          {ultimas5.length === 0 ? (
            <p className="font-body-md text-on-surface-variant text-sm text-center py-md">
              Sin sesiones aún.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {ultimas5.map((e) => {
                const vol = e.sets
                  .filter((s) => !s.isWarmup)
                  .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/workout/${e.id}`}
                      className="flex items-center gap-md py-sm hover:bg-surface-container/40 rounded-lg px-sm -mx-sm transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon name="fitness_center" className="text-primary" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-on-surface truncate">{e.name}</p>
                        <div className="flex gap-md mt-px">
                          <span className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                            {formatearFechaHora(e.startedAt)}
                          </span>
                          <span className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                            {e.sets.length} series
                          </span>
                        </div>
                      </div>
                      {vol > 0 && (
                        <span className="font-grotesk text-xs text-on-surface-variant tabular-nums">
                          {Math.round(vol).toLocaleString('es-CO')} kg
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Card de fase del ciclo (solo mujeres) */}
      {muestraCiclo && fase && (
        <div className="bg-surface-container-low rounded-xl p-lg border border-tertiary/20 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl"></div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-md">
            <div className="flex items-center gap-md">
              <div className="w-14 h-14 rounded-xl bg-tertiary/20 border border-tertiary/30 flex items-center justify-center shrink-0">
                <Icon name="cyclone" className="text-tertiary" size={28} />
              </div>
              <div>
                <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant text-[10px]">
                  Fase actual
                </span>
                <p className="font-headline-lg text-tertiary leading-tight">
                  {FASES_ESPANOL[fase.phase]}
                </p>
                <p className="font-grotesk text-xs text-on-surface-variant tracking-wider">
                  Día {fase.dayOfCycle} de {fase.cycleLength}
                </p>
              </div>
            </div>
            <div className="md:ml-auto md:max-w-md">
              <p className="font-body-md text-on-surface text-sm">{fase.trainingHint}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaMetrica({
  icono,
  fillIcono,
  color,
  etiqueta,
  valor,
  sufijo,
  extra,
  esTexto,
}: {
  icono: string;
  fillIcono?: boolean;
  color: 'primary' | 'secondary' | 'tertiary';
  etiqueta: string;
  valor: string;
  sufijo?: string;
  extra?: string;
  esTexto?: boolean;
}) {
  const cls =
    color === 'primary'
      ? 'text-primary bg-primary/10'
      : color === 'secondary'
      ? 'text-secondary bg-secondary/10'
      : 'text-tertiary bg-tertiary/10';
  return (
    <div className="bg-surface-container-low rounded-xl p-md border border-white/5 relative overflow-hidden">
      <div className={cn('absolute -right-4 -top-4 w-32 h-32 rounded-full blur-2xl', cls)}></div>
      <div className="relative">
        <div className="flex items-center gap-xs mb-sm">
          <Icon
            name={icono}
            fill={fillIcono}
            className={
              color === 'primary'
                ? 'text-primary'
                : color === 'secondary'
                ? 'text-secondary'
                : 'text-tertiary'
            }
            size={18}
          />
          <h3 className="font-grotesk text-label-caps tracking-wider uppercase text-on-surface-variant text-[10px]">
            {etiqueta}
          </h3>
        </div>
        <div className="flex items-baseline gap-xs">
          <span
            className={cn(
              'text-on-surface',
              esTexto ? 'font-headline-md text-headline-md' : 'font-display-lg text-display-lg',
            )}
          >
            {valor}
          </span>
          {sufijo && (
            <span className="font-grotesk text-label-caps text-on-surface-variant tracking-wider">
              {sufijo}
            </span>
          )}
        </div>
        {extra && (
          <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider mt-xs">
            {extra}
          </p>
        )}
      </div>
    </div>
  );
}
