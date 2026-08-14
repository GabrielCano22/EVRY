'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAutenticacion } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { InfoFase, ResumenProgreso, Entrenamiento } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ReadinessCheckin } from '@/components/ReadinessCheckin';
import { formatearFechaHora, cn } from '@/lib/utils';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

const FASES_ESPANOL: Record<string, string> = {
  MENSTRUAL: 'Menstrual',
  FOLLICULAR: 'Folicular',
  OVULATION: 'OvulaciÃ³n',
  LUTEAL: 'LÃºtea',
};

const FRASES_GENERALES = [
  '"El dolor que sientes hoy es la fuerza que sentirÃ¡s maÃ±ana."',
  '"No se trata de ser perfecta, se trata de ser mejor que ayer."',
  '"Tu cuerpo puede aguantar casi cualquier cosa. Es a tu mente a la que tienes que convencer."',
  '"La disciplina pesa gramos. El arrepentimiento pesa toneladas."',
  '"PequeÃ±os pasos cada dÃ­a construyen grandes cambios."',
  '"Escucha a tu cuerpo. Respeta tu biologÃ­a. Entrena con cabeza."',
  '"Una hora hoy. Un cuerpo nuevo en seis meses."',
  '"No compitas con nadie mÃ¡s que con quien fuiste ayer."',
  '"La constancia vence al talento cuando el talento no es constante."',
  '"Cada serie cuenta. Cada repeticiÃ³n suma."',
  '"Entrena con ciencia, no solo con esfuerzo."',
  '"El descanso tambiÃ©n es entrenamiento."',
  '"Los rÃ©cords se rompen un kilo a la vez."',
  '"Fuerte por dentro, fuerte por fuera."',
];

const FRASES_CICLO = [
  '"Escucha tu cuerpo: adaptar la intensidad tambiÃ©n es progresar."',
  '"Tu ciclo no limita tu fuerza; te enseÃ±a a entrenar con inteligencia."',
  '"Descansar cuando lo necesitas es parte de alcanzar tu mejor versiÃ³n."',
];

function fraseDelDia(esMujer: boolean): string {
  const inicioAnio = new Date(new Date().getFullYear(), 0, 0).getTime();
  const ahora = Date.now();
  const diaDelAnio = Math.floor((ahora - inicioAnio) / 86400000);
  const frases = esMujer ? [...FRASES_GENERALES, ...FRASES_CICLO] : FRASES_GENERALES;
  return frases[diaDelAnio % frases.length];
}

function calcularRacha(entrenamientos: Entrenamiento[]): number {
  // DÃ­as consecutivos hacia atrÃ¡s desde hoy con al menos una sesiÃ³n finalizada
  const dias = new Set<string>();
  for (const e of entrenamientos) {
    if (!e.endedAt) continue;
    dias.add(new Date(e.startedAt).toISOString().slice(0, 10));
  }
  let racha = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Permitir que hoy aÃºn no haya entrenado: empezamos desde ayer si hoy no hay
  if (!dias.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dias.has(cursor.toISOString().slice(0, 10))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

export default function PaginaInicio() {
  const { usuario } = useAutenticacion();
  const [fase, setFase] = useState<InfoFase | null>(null);
  const [resumen, setResumen] = useState<ResumenProgreso | null>(null);
  const [recientes, setRecientes] = useState<Entrenamiento[]>([]);
  const [puntajeReadiness, setPuntajeReadiness] = useState<number | null>(null);

  const muestraCiclo = !!usuario?.trackCycle && usuario.biologicalSex === 'FEMALE';

  useEffect(() => {
    Promise.all([
      muestraCiclo ? api<InfoFase | null>('/cycle/today').catch(() => null) : Promise.resolve(null),
      api<ResumenProgreso>('/progress/overview').catch(() => null),
      api<Entrenamiento[]>('/workouts?take=20').catch(() => []),
      api<{ score: number; date: string } | null>('/readiness/latest').catch(() => null),
    ]).then(([f, r, ent, rd]) => {
      setFase(f);
      setResumen(r);
      setRecientes(ent ?? []);
      if (rd && new Date(rd.date).toDateString() === new Date().toDateString())
        setPuntajeReadiness(rd.score);
    });
  }, [muestraCiclo]);

  const fechaHoy = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const racha = useMemo(() => calcularRacha(recientes), [recientes]);
  const top3 = useMemo(
    () => (resumen?.topExercises ?? []).slice().sort((a, b) => b.bestWeight - a.bestWeight).slice(0, 3),
    [resumen],
  );
  const ultimas5 = useMemo(
    () => recientes.filter((e) => e.endedAt).slice(0, 5),
    [recientes],
  );
  const frase = useMemo(() => fraseDelDia(muestraCiclo), [muestraCiclo]);

  return (
    <div className="space-y-lg">
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

      {/* Frase motivacional */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-xl p-lg border-l-4 border-primary relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="relative flex items-start gap-md">
          <Icon name="format_quote" className="text-primary" size={32} />
          <div>
            <p className="font-lexend italic text-body-lg text-on-surface leading-snug">{frase}</p>
            <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant text-[10px] mt-xs">
              Frase del dÃ­a
            </p>
          </div>
        </div>
      </div>

      {/* MÃ©tricas principales */}
      <div className={cn('grid gap-md', muestraCiclo ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3')}>
        <TarjetaMetrica
          icono="local_fire_department"
          fillIcono
          color="primary"
          etiqueta="Racha"
          valor={racha.toString()}
          sufijo={racha === 1 ? 'dÃ­a' : 'dÃ­as'}
          extra={racha === 0 ? 'Â¡Empieza hoy!' : 'MantÃ©n el ritmo'}
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
          etiqueta="Estado del dÃ­a"
          valor={puntajeReadiness !== null ? Math.round(puntajeReadiness).toString() : 'â€”'}
          sufijo="/100"
          extra={puntajeReadiness === null ? 'Sin registro de hoy' : puntajeReadiness >= 75 ? 'Empuja' : puntajeReadiness >= 50 ? 'MantÃ©n' : 'Descansa'}
        />
        {muestraCiclo && (
          <TarjetaMetrica
            icono="cyclone"
            color="tertiary"
            etiqueta="Fase del ciclo"
            valor={fase ? FASES_ESPANOL[fase.phase] : 'â€”'}
            extra={fase ? `DÃ­a ${fase.dayOfCycle}/${fase.cycleLength}` : 'Sin datos'}
            esTexto
          />
        )}
      </div>

      {/* Acciones rÃ¡pidas */}
      <div className="grid grid-cols-2 gap-md">
        <Link href="/workout">
          <Button size="lg" className="w-full">
            <Icon name="play_arrow" size={20} />
            Iniciar sesiÃ³n
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
                      {ej.sessionsCount} sesiones Â· 1RM est. {ej.estimated1RM.toFixed(1)}kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-grotesk text-numeric-data text-on-surface tabular-nums leading-none">
                      {ej.bestWeight}
                    </p>
                    <p className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                      KG Ã— {ej.bestReps}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ãšltimas 5 sesiones */}
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <Icon name="history" className="text-primary" />
              Ãšltimas 5 sesiones
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
              Sin sesiones aÃºn.
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
                  DÃ­a {fase.dayOfCycle} de {fase.cycleLength}
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
  sufijv÷_u¶‰žËkºwµçUÉÁ¼t°(€l½qˆ¡É½±±•È¥qˆ½¤°€É½‘¥±±¼t°(€l½qˆ¡Í…Ü¥qˆ½¤°€Í¥•ÉÉ„t°(€l½qˆ¡•áÑ•¹Í¥½¸¥qˆ½¤°€•áÑ•¹Í§Í¸t°(€l½qˆ¡É…¥Í”¥qˆ½¤°€•±•Ù…§Í¸t°(€l½qˆ¡™±ä¥qˆ½¤°€…Á•ÉÑÕÉ„t°(€l½qˆ¡Í¡ÉÕœ¥qˆ½¤°€•¹½¥µ¥•¹Ñ¼‘”¡½µ‰É½Ìt°(€l½qˆ¡ÉÕ¹ ¥qˆ½¤°€•¹½¥µ¥•¹Ñ¼…‰‘½µ¥¹…°t°(€l½qˆ¡Á±…¹¬¥qˆ½¤°€Á±…¹¡„t°(€l½qˆ¡ÑÝ¥ÍÐ¥qˆ½¤°€¥É¼t°(€l½qˆ¡É½Ñ…Ñ¥½¸¥qˆ½¤°€É½Ñ…§Í¸t°(€l½qˆ¡­¥­‰…¬¥qˆ½¤°€Á…Ñ…‘„¡…¥„…ÑË…Ìt°(€l½qˆ¡‰É¥‘”¥qˆ½¤°€ÁÕ•¹Ñ”t°(€l½qˆ¡™…±±½ÕÐ¥qˆ½¤°€‘•ÍÁ±¥•Õ”t°(€l½qˆ¡…‰‘ÕÑ¥½¸¥qˆ½¤°€…‰‘Õ§Í¸t°(€l½qˆ¡…‘‘ÕÑ¥½¸¥qˆ½¤°€…‘Õ§Í¸t°(€l½qˆ¡™±•á¥½¸¥qˆ½¤°€™±•á§Í¸t°(€l½qˆ¡ÍÑÉ•Ñ ¥qˆ½¤°€•ÍÑ¥É…µ¥•¹Ñ¼t°(€l½qˆ¡¥É±•Ìü¥qˆ½¤°€µÉÕ±½Ìt°(€l½qˆ¡ÍÝ¥¹œ¥qˆ½¤°€‰…±…¹•¼t°(€l½qˆ¡Ý…±­½ÕÐ¥qˆ½¤°€…µ¥¹…Ñ„¡…¥„…‘•±…¹Ñ”t°(€l½qˆ¡Ý…±¬¥qˆ½¤°€…µ¥¹…Ñ„t°(€l½qˆ¡ÉÕ¸¥qˆ½¤°€…ÉÉ•É„t°(€l½qˆ¡©ÕµÀ¥qˆ½¤°€Í…±Ñ¼t°(€l½qˆ¡Ñ¡É½Ü‘½Ý¸¥qˆ½¤°€±…¹é…µ¥•¹Ñ¼¡…¥„…‰…©¼t°(€l½qˆ¡Ñ¡É½Ü¥qˆ½¤°€±…¹é…µ¥•¹Ñ¼t°(€l½qˆ¡‘½Ý¸¥qˆ½¤°€…‰…©¼t°(€l½qˆ¡Ñ½Õ ¥qˆ½¤°€Ñ½ÅÕ”t°(€l½qˆ¡Ñ…À¥qˆ½¤°€Ñ½ÅÕ”t°(€l½qˆ¡É½±° üé•È¤ü¥qˆ½¤°€É½‘…µ¥•¹Ñ¼t°(€l½qˆ¡±•Ù•È¥qˆ½¤°€Á…±…¹„t°(€l½qˆ¡Á±…¹¡”¥qˆ½¤°€Á±…¹¡„t°(€l½qˆ¡ÍÕÁ•Éµ…¸¥qˆ½¤°€ÍÕÁ•Éµ…¸t°(€l½qˆ¡ÍÁ¥‘•È¥qˆ½¤°€…É‡Å„t°(€l½qˆ¡‘½¹­•ä¥qˆ½¤°€‰ÕÉÉ¼t°(€l½qˆ¡ÁÉ•…¡•È¥qˆ½¤°€ÁÉ•‘¥…‘½Èt°(€l½qˆ¡½¹•¹ÑÉ…Ñ¥½¸¥qˆ½¤°€½¹•¹ÑÉ…‘¼t°(€l½qˆ¡¡…µµ•È¥qˆ½¤°€µ…ÉÑ¥±±¼t°(€l½qˆ¡…É¡•È¥qˆ½¤°€…ÉÅÕ•É¼t°(€l½qˆ¡Í±¥¹•ÉÌýñÍ±¥¹Ìü¥qˆ½¤°€±…¹é…µ¥•¹Ñ½Ìt°(€l½qˆ¡ÍÅÕ…¥qˆ½¤°€Í•¹Ñ…‘¥±±„t°(€l½qˆ¡‰…±…¹”‰½…É¥qˆ½¤°€Ñ…‰±„‘”•ÅÕ¥±¥‰É¥¼t°(€l½qˆ¡‰½…É¥qˆ½¤°€Ñ…‰±„t°(€l½qˆ¡‰…É‰•±°¥qˆ½¤°€‰…ÉÉ„t°(€l½qˆ¡½±åµÁ¥Œ‰…È¥qˆ½¤°€‰…ÉÉ„½³µµÁ¥„t°(€l½qˆ¡•è‰…È¥qˆ½¤°€‰…ÉÉ„ht°(€l½qˆ¡‘Õµ‰‰•±°¥qˆ½¤°€µ…¹Õ•É¹„t°(€l½qˆ¡É•Í¥ÍÑ…¹”‰…¹¥qˆ½¤°€‰…¹‘„•³…ÍÑ¥„t°(€l½qˆ¡‰…¹¥qˆ½¤°€‰…¹‘„•³…ÍÑ¥„t°(€l½qˆ¡…‰±”¥qˆ½¤°€Á½±•„t°(€l½qˆ¡Íµ¥Ñ µ…¡¥¹”¥qˆ½¤°€·…ÅÕ¥¹„Mµ¥Ñ t°(€l½qˆ¡±•Ù•É…”µ…¡¥¹”¥qˆ½¤°€·…ÅÕ¥¹„‘”Á…±…¹„t°(€l½qˆ¡µ…¡¥¹”¥qˆ½¤°€·…ÅÕ¥¹„t°(€l½qˆ¡µ•‘¥¥¹”‰…±°¥qˆ½¤°€‰…³Í¸µ•‘¥¥¹…°t°(€l½qˆ¡ÍÑ…‰¥±¥Ñä‰…±°¥qˆ½¤°€‰…³Í¸‘”•ÍÑ…‰¥±¥‘…t°(€l½qˆ¡•á•É¥Í”‰…±°¥qˆ½¤°€‰…³Í¸‘”•©•É¥¥¼t°(€l½qˆ¡‰½‘ål´týÝ•¥¡Ð¥qˆ½¤°€Á•Í¼½ÉÁ½É…°t°(€l½qˆ¡Ý•¥¡Ñ•¥qˆ½¤°€±…ÍÑÉ…‘¼t°(€l½qˆ¡É½Á”¥qˆ½¤°€Õ•É‘„t°(€l½qˆ¡Í±•¥qˆ½¤°€ÑÉ¥¹•¼t°(€l½qˆ¡…ÍÍ¥ÍÑ•¥qˆ½¤°€…Í¥ÍÑ¥‘¼t°(€l½qˆ¡Í•…Ñ•¥qˆ½¤°€Í•¹Ñ…‘¼t°(€l½qˆ¡ÍÑ…¹‘¥¹œ¥qˆ½¤°€‘”Á¥”t°(€l½qˆ¡±å¥¹œ¥qˆ½¤°€…½ÍÑ…‘¼t°(€l½qˆ¡ÁÉ½¹”¥qˆ½¤°€‰½„…‰…©¼t°(€l½qˆ¡ÍÕÁ¥¹”¥qˆ½¤°€‰½„…ÉÉ¥‰„t°(€l½qˆ¡­¹••±¥¹œ¥qˆ½¤°€‘”É½‘¥±±…Ìt°(€l½qˆ¡¡…¹¥¹œ¥qˆ½¤°€½±…‘¼t°(€l½qˆ¡¥¹±¥¹”¥qˆ½¤°€¥¹±¥¹…‘¼t°(€l½qˆ¡‘•±¥¹”¥qˆ½¤°€‘•±¥¹…‘¼t°(€l½qˆ¡É•Ù•ÉÍ”¥qˆ½¤°€¥¹Ù•ÉÍ¼t°(€l½qˆ¡…±Ñ•É¹…Ñ¥¹ñ…±Ñ•É¹…Ñ”¥qˆ½¤°€…±Ñ•É¹¼t°(€l½qˆ¡Í¥¹±”±•œ¥qˆ½¤°€„Õ¹„Á¥•É¹„t°(€l½qˆ¡½¹”…É´¥qˆ½¤°€„Õ¸‰É…é¼t°(€l½qˆ¡½¹”¡…¹¥qˆ½¤°€„Õ¹„µ…¹¼t°(€l½qˆ¡ÑÝ¼±•Ì¥qˆ½¤°€„‘½ÌÁ¥•É¹…Ìt°(€l½qˆ¡™É½¹Ð¥qˆ½¤°€™É½¹Ñ…°t°(€l½qˆ¡É•…È¥qˆ½¤°€Á½ÍÑ•É¥½Èt°(€l½qˆ¡±…Ñ•É…±ñÍ¥‘”¥qˆ½¤°€±…Ñ•É…°t°(€l½qˆ¡±½Ý•È¥qˆ½¤°€¥¹™•É¥½Èt°(€l½qˆ¡ÕÁÁ•È¥qˆ½¤°€ÍÕÁ•É¥½Èt°(€l½qˆ¡¡¥ ¥qˆ½¤°€…±Ñ¼t°(€l½qˆ¡±½Ü¥qˆ½¤°€‰…©¼t°(€l½qˆ¡¥¹¹•È¥qˆ½¤°€¥¹Ñ•É¹¼t°(€l½qˆ¡½ÕÑ•È¥qˆ½¤°€•áÑ•É¹¼t°(€l½qˆ¡É½ÍÌ üè‰½‘ä¤ü¥qˆ½¤°€ÉÕé…‘¼t°(€l½qˆ¡‰•¹Ñl´u½Ù•È¥qˆ½¤°€¥¹±¥¹…‘¼t°(€l½qˆ¡‰•¹Ð…É´¥qˆ½¤°€½¸‰É…é½Ì™±•á¥½¹…‘½Ìt°(€l½qˆ¡ÍÑÉ…¥¡Ð±•œ¥qˆ½¤°€Á¥•É¹„•áÑ•¹‘¥‘„t°(€l½qˆ¡ÍÑ¥™˜±•œ¥qˆ½¤°€Á¥•É¹…ÌËµ¥‘…Ìt°(€l½qˆ¡Á…É…±±•°¥qˆ½¤°€Á…É…±•±¼t°(€l½qˆ¡‰•¡¥¹¥qˆ½¤°€‘•ÑË…Ìt°(€l½qˆ¡™Õ±°¥qˆ½¤°€½µÁ±•Ñ¼t°(€l½qˆ¡¡…±˜¥qˆ½¤°€µ•‘¥¼t°(€l½qˆ¡……¥¹ÍÐ¥qˆ½¤°€½¹ÑÉ„t°(€l½qˆ¡…‰½Ù”¥qˆ½¤°€Á½È•¹¥µ„t°(€l½qˆ¡Õ¹‘•É¡…¹¥qˆ½¤°€……ÉÉ”ÍÕÁ¥¹¼t°(€l½qˆ¡½Ù•É¡…¹¥qˆ½¤°€……ÉÉ”ÁÉ½¹¼t°(€l½qˆ¡¹•ÕÑÉ…°¥qˆ½¤°€¹•ÕÑÉ¼t°(€l½qˆ¡ÍÕÍÁ•¹‘•¥qˆ½¤°€ÍÕÍÁ•¹‘¥‘¼t°(€l½qˆ¡¥¹Ù•ÉÑ•¥qˆ½¤°€¥¹Ù•ÉÑ¥‘¼t°(€l½qˆ¡¹…ÉÉ½Ü¥qˆ½¤°€•ÍÑÉ•¡¼t°(€l½qˆ¡Ý…±°¥qˆ½¤°€Á…É•t°(€l½qˆ¡™±½½È¥qˆ½¤°€ÍÕ•±¼t°(€l½qˆ¡Õ¹‘•È¥qˆ½¤°€‘•‰…©¼t°(€l½qˆ¡‰½Ñ ¥qˆ½¤°€…µ‰…Ìt°(€l½qˆ¡‘½Õ‰±”¥qˆ½¤°€‘½‰±”t°(€l½qˆ¡ÍÑÉ…¥¡Ð¥qˆ½¤°€É•Ñ¼t°(€l½qˆ¡‰•¹Ð¥qˆ½¤°€™±•á¥½¹…‘¼t°(€l½qˆ¡Á±…Ñ•ñ‘¥ÍŒ¥qˆ½¤°€‘¥Í¼t°(€l½qˆ¡Ý•¥¡ÐÁ±…Ñ”¥qˆ½¤°€‘¥Í¼‘”Á•Í¼t°(€l½qˆ¡±…¹‘µ¥¹”¥qˆ½¤°€±…¹‘µ¥¹”t°(€l½qˆ¡Ñ½Ý•°¥qˆ½¤°€Ñ½…±±„t°(€l½qˆ¡¡…¥È¥qˆ½¤°€Í¥±±„t°(€l½qˆ¡‰•¹ ¥qˆ½¤°€‰…¹¼t°(€l½qˆ¡‰½à¥qˆ½¤°€…«Í¸t°(€l½qˆ¡ÁÕ±°¥qˆ½¤°€Ñ¥ËÍ¸t°(€l½qˆ¡ÁÕÍ ¥qˆ½¤°€•µÁÕ©”t°(€l½qˆ¡…ÉÉä üé¥¹œ¤ü¥qˆ½¤°€ÑÉ…¹ÍÁ½ÉÑ”t°(€l½qˆ¡É½Ñ…Ñ”¥qˆ½¤°€É½Ñ…§Í¸t°(€l½qˆ¡ÑÕÉ¸¥qˆ½¤°€¥É¼t°(€l½qˆ¡­¥¬¥qˆ½¤°€Á…Ñ…‘„t°(€l½qˆ¡Ñ¡¥ ¥qˆ½¤°€µÕÍ±¼t°(€l½qˆ¡™½½Ññ™••Ð¥qˆ½¤°€Á¥”t°(€l½qˆ¡™¥¹•Éñ™¥¹•ÉÌ¥qˆ½¤°€‘•‘¼t°(€l½qˆ¡Ñ½”¥qˆ½¤°€‘•‘¼‘•°Á¥”t°(€l½qˆ¡¡••°¥qˆ½¤°€Ñ…³Í¸t°(€l½qˆ¡…¹­±”¥qˆ½¤°€Ñ½‰¥±±¼t°(€l½qˆ¡­¹••ñ­¹••Ì¥qˆ½¤°€É½‘¥±±„t°(€l½qˆ¡•±‰½Ü¥qˆ½¤°€½‘¼t°(€l½qˆ¡ÝÉ¥ÍÐ¥qˆ½¤°€µ×Å•„t°(€l½qˆ¡…Éµñ…ÉµÌ¥qˆ½¤°€‰É…é¼t°(€l½qˆ¡¡•ÍÐ¥qˆ½¤°€Á•¡¼t°(€l½qˆ¡‰…¬¥qˆ½¤°€•ÍÁ…±‘„t°(€l½qˆ¡Í¡½Õ±‘•È¥qˆ½¤°€¡½µ‰É¼t°(€l½qˆ¡™½É•…É´¥qˆ½¤°€…¹Ñ•‰É…é¼t°(€l½qˆ¡±•ñ±•Ì¥qˆ½¤°€Á¥•É¹„t°(€l½qˆ¡…±˜¥qˆ½¤°€Á…¹Ñ½ÉÉ¥±±„t°(€l½qˆ¡…±Ù•Ì¥qˆ½¤°€Á…¹Ñ½ÉÉ¥±±…Ìt°(€l½qˆ¡¡¥Áñ¡¥ÁÌ¥qˆ½¤°€…‘•É„t°(€l½qˆ¡±ÕÑ•Ìýñ±ÕÑ•ÕÌ¥qˆ½¤°€³éÑ•¼t°(€l½qˆ¡¡…µÍÑÉ¥¹œ¥qˆ½¤°€¥ÍÅÕ¥½Ñ¥‰¥…°t°(€l½qˆ¡ÅÕ…‘Ìü¥qˆ½¤°€×…‘É¥•ÁÌt°(€l½qˆ¡ÑÉ¥•ÁÌýñÑÉ¥•À¥qˆ½¤°€ÑËµ•ÁÌt°(€l½qˆ¡‰¥•ÁÌýñ‰¥•À¥qˆ½¤°€‹µ•ÁÌt°(€l½qˆ¡Á•Ñ½É…°¥qˆ½¤°€Á•Ñ½É…°t°(€l½qˆ¡Á•Œ¥qˆ½¤°€Á•Ñ½É…°t°(€l½qˆ¡‰…±…¹”¥qˆ½¤°€•ÅÕ¥±¥‰É¥¼t°(€l½qˆ¡‘•±Ð¥qˆ½¤°€‘•±Ñ½¥‘•Ìt°(€l½qˆ¡±…Ð¥qˆ½¤°€‘½ÉÍ…°t°(€l½qˆ¡¹•¬¥qˆ½¤°€Õ•±±¼t°(€l½qˆ¡¡•…¥qˆ½¤°€…‰•é„t°(€l½qˆ¡Ý¥Ñ¡½ÕÐ¥qˆ½¤°€Í¥¸t°(€l½qˆ¡Ý¥Ñ ¥qˆ½¤°€½¸t°(€l½qˆ¡…¹¥qˆ½¤°€ät°(€l½qˆ¡½¹ñ¥¸¥qˆ½¤°€•¸t°(€l½qˆ¡Ñ¼¥qˆ½¤°€„t°(€l½qˆ¡™½È¥qˆ½¤°€Á…É„t°(€l½qˆ¡½˜¥qˆ½¤°€‘”t°(€l½qˆ¡Ñ¡”¥qˆ½¤°€œt°(€€¼¼9¼•±¥µ¥¹…µ½Ì±„ÁÉ•Á½Í¥§Í¸•ÍÁ‡Å½±„€‰„ˆ‘•ÍÁ×¥Ì‘”ÑÉ…‘Õ¥È(€€¼¼•áÁÉ•Í¥½¹•Ì½µÁÕ•ÍÑ…Ì½µ¼€‰ÍÕ‰¥‘„‘¥»…µ¥„„±„‰…ÉÉ„ˆ¸(€l½qˆ¡µ…±”¥qˆ½¤°€¡½µ‰É”t°(€l½qˆ¡™•µ…±”¥qˆ½¤°€µÕ©•Èt°(€l½qˆ¡•á•É¥Í”¥qˆ½¤°€•©•É¥¥¼t°(€l½qˆ¡ÍÑ…‰¥±¥Ñä¥qˆ½¤°€•ÍÑ…‰¥±¥‘…t°(€l½qˆ¡…ÑÑ…¡µ•¹Ð¥qˆ½¤°€…•Í½É¥¼t°(€l½qˆ¡Á…±µÌü¥qˆ½¤°€Á…±µ…Ìt°(€l½qˆ¡¡…¹‘Ìü¥qˆ½¤°€µ…¹½Ìt°(€l½qˆ¡é¥é…œ¥qˆ½¤°€é¥é…œt°(€l½qˆ¡Á¥­”¥qˆ½¤°€Á¥„t°(€l½qˆ¡…ÍÑÉ¥‘”¥qˆ½¤°€„¡½É…©…‘…Ìt°(€l½qˆ¡…É¡•È¥qˆ½¤°€…ÉÅÕ•É¼t°(€l½qˆ¡‰…­Ý…É¥qˆ½¤°€¡…¥„…ÑË…Ìt°(€l½qˆ¡™½ÉÝ…É¥qˆ½¤°€¡…¥„…‘•±…¹Ñ”t°(€l½qˆ¡¥ÉÕ±…È¥qˆ½¤°€¥ÉÕ±…Èt°(€l½qˆ¡™¥á•¥qˆ½¤°€™¥©¼t°(€l½qˆ¡ÍÑÉ…¥¡Ð‰…¬¥qˆ½¤°€•ÍÁ…±‘„É•Ñ„t°(€l½qˆ¡É•ÑÕÌ™•µ½É¥Ì¥qˆ½¤°€É•Ñ¼™•µ½É…°t°(€l½qˆ¡Á¥É¥™½Éµ¥Ì¥qˆ½¤°€Á¥É¥™½Éµ”t°(€l½qˆ¡…‘‘ÕÑ½È¥qˆ½¤°€…‘ÕÑ½Èt°(€l½qˆ¡Á•Ñ½É…±¥Ìµ…©½È¥qˆ½¤°€Á•Ñ½É…°µ…å½Èt°(€l½qˆ¡µ½Ñ¥½¸¥qˆ½¤°€µ½Ù¥µ¥•¹Ñ¼t°(€l½qˆ¡ÍÅÕ••é”¥qˆ½¤°€…ÁÉ•ÓÍ¸t°(€l½qˆ¡ÍÕÁÁ½ÉÑ•¥qˆ½¤°€½¸…Á½å¼t°(€l½qˆ¡µ½‘¥™¥•¥qˆ½¤°€µ½‘¥™¥…‘¼t°(€l½qˆ¡‰…Í¥Œ¥qˆ½¤°€‹…Í¥¼t°(€l½qˆ¡…‘Ù…¹•¥qˆ½¤°€…Ù…¹é…‘¼t°(€l½qˆ¡½ÍÍ…¬¥qˆ½¤°€½Í…¼t°(€l½qˆ¡Í¥ÍÍä¥qˆ½¤°€‘”×…‘É¥•ÁÌt°(€l½qˆ¡ÍÅÕ…ÑÌü¥qˆ½¤°€Í•¹Ñ…‘¥±±…Ìt°(€l½qˆ¡ÍÑÉ…‘‘±”¥qˆ½¤°€„¡½É…©…‘…Ìt°(€l½qˆ¡µ…±Ñ•Í”¥qˆ½¤°€µ…±Ó¥Ìt°(€l½qˆ¡ÍÝ¥µµ•È¥qˆ½¤°€¹…‘…‘½Èt°(€l½qˆ¡Ñ¥É”¥qˆ½¤°€¹•Õ·…Ñ¥¼t°(€l½qˆ¡ÑÉ…À‰…È¥qˆ½¤°€‰…ÉÉ„¡•á…½¹…°t°(€l½qˆ¡ÑÉ…¥¹•È¥qˆ½¤°€•¹ÑÉ•¹…‘½Èt°(€l½qˆ¡ÑÉ•…‘µ¥±°¥qˆ½¤°€¥¹Ñ„‘”½ÉÉ•Èt°(€l½qˆ¡•±±¥ÁÑ¥…°¥qˆ½¤°€•³µÁÑ¥„t°(€l½qˆ¡ÍÑ•Áµ¥±°¥qˆ½¤°€•Í…±…‘½É„t°(€l½qˆ¡Ý¥¹ÍÁÉ¥¹ÑÌü¥qˆ½¤°€ÍÁÉ¥¹ÑÌ‘”Ù¥•¹Ñ¼t°(€l½qˆ¡Ý½É±É•…Ñ•ÍÐ¥qˆ½¤°€•°µ•©½È‘•°µÕ¹‘¼t°(€l½qˆ¡Ù•ÉÑ¥…°¥qˆ½¤°€Ù•ÉÑ¥…°t°(€l½qˆ¡¡½É¥é½¹Ñ…°¥qˆ½¤°€¡½É¥é½¹Ñ…°t°(€l½qˆ¡É½Õ¹¥qˆ½¤°€¥ÉÕ±…Èt°(€l½qˆ¡É•Ù•ÉÌ¥qˆ½¤°€¥¹Ù•ÉÍ¼t°(€l½qˆ¡¥¹Ù•ÉÍ”¥qˆ½¤°€¥¹Ù•ÉÍ¼t°(€l½qˆ¡Á½Ø¥qˆ½¤°€A=Xt°(€l½qˆ¡éÐý½ÑÑµ…¸¥qˆ½¤°€i½ÑÑµ…¸t°(€l½qˆ¡‰±…ÍÑ•È¥qˆ½¤°€‰³…ÍÑ•Èt°(€l½qˆ¡µÕÍ±”¥qˆ½¤°€µÕÍ±”t°(€l½qˆ¡ÕÀ¥qˆ½¤°€…ÉÉ¥‰„t°(€l½qˆ¡‘½Ý¸¥qˆ½¤°€…‰…©¼t°(€l½qˆ¡ÑÝ¼¥qˆ½¤°€‘½Ìt°(€l½qˆ¡½¹”¥qˆ½¤°€Õ¹¼t°(€l½qˆ¡Ñ¡É•”¥qˆ½¤°€ÑÉ•Ìt°(€l½qˆ¡Ø¥qˆ½¤°€Xt°(€l½qˆ¡‰…È¥qˆ½¤°€‰…ÉÉ„t°(€l½qˆ¡É¥À¥qˆ½¤°€……ÉÉ”t°(€l½qˆ¡¡½±¥qˆ½¤°€Í½ÍÓ¥¸t°)tì()™Õ¹Ñ¥½¸±¥µÁ¥…ÉQ•áÑ¼¡Ñ•áÑ¼èÍÑÉ¥¹œ¤ì(€É•ÑÕÉ¸Ñ•áÑ¼(€€€€¹É•Á±…” ½qÌ¬½œ°€œ€œ¤(€€€€¹É•Á±…” ½p¡qÌ©p¤½œ°€œœ¤(€€€€¹É•Á±…” ½qÌ¬¡l°¥t¤½œ°€œÄœ¤(€€€€¹É•Á±…” ¼¡l°¡t¥qÌ¬½œ°€œÄ€œ¤(€€€€¹É•Á±…” ½qÌ¬µqÌ¨½œ°€œ€´€œ¤(€€€€¹É•Á±…” ½qÍìÈ±ô½œ°€œ€œ¤(€€€€¹ÑÉ¥´ ¤ì)ô()™Õ¹Ñ¥½¸…Á¥Ñ…±¥é…È¡Ñ•áÑ¼èÍÑÉ¥¹œ¤ì(€É•ÑÕÉ¸Ñ•áÑ¼€ü€‘íÑ•áÑ½lÁt¹Ñ½1½…±•UÁÁ•É…Í” •Ìµ<œ¥ô‘íÑ•áÑ¼¹Í±¥” Ä¥õ€€èÑ•áÑ¼ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÑÉ…‘Õ¥É9½µ‰É•©•É¥¥¼¡¹½µ‰É”èÍÑÉ¥¹œð¹Õ±°ðÕ¹‘•™¥¹•¤ì(€¥˜€ …¹½µ‰É”¤É•ÑÕÉ¸€©•É¥¥¼œì(€±•ÐÑÉ…‘Õ¥‘¼€ô¹½µ‰É”(€€€€¹É•Á±…” ½qÌ©p ¡µ…±•ñ™•µ…±”¥p¥qÌ¨½¤°€œ€œ¤(€€€€¹É•Á±…” ½qÌ¬½œ°€œ€œ¤(€€€€¹ÑÉ¥´ ¤ì(€™½È€¡½¹ÍÐmÁ…ÑÉ½¸°É••µÁ±…é½t½˜I5A1i=M}9=5	I¤ÑÉ…‘Õ¥‘¼€ôÑÉ…‘Õ¥‘¼¹É•Á±…”¡Á…ÑÉ½¸°É••µÁ±…é¼¤ì(€½¹ÍÐ±¥µÁ¥¼€ô±¥µÁ¥…ÉQ•áÑ¼¡ÑÉ…‘Õ¥‘¼¤(€€€€¹É•Á±…” ½q‰±…ÍÑÉ…‘½qÌ¬¡Í•¹Ñ…‘¥±±…ñé…¹…‘…ñÁÉ•¹Í…ñ•áÑ•¹Í¥m¿Íu¸¥qˆ½¤°€œÄ±…ÍÑÉ…‘„œ¤(€€€€¹É•Á±…” ½q‰±…ÍÑÉ…‘½qÌ¬¡ÕÉ°¥qˆ½¤°€œÄ±…ÍÑÉ…‘¼œ¤(€€€€¹É•Á±…” ½q‰ÁÉ•ÍÍqÌ­‰…¹…qˆ½¤°€ÁÉ•ÍÌ‘”‰…¹„œ¤(€€€€¹É•Á±…” ½q‰‘½µ¥¹…‘…ÍqÌ­……ÉÉ•qˆ½¤°€‘½µ¥¹…‘…Ì½¸……ÉÉ”œ¤ì(€É•ÑÕÉ¸…Á¥Ñ…±¥é…È¡±¥µÁ¥¼¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸•Ñ¥ÅÕ•Ñ…ÉÕÁ½5ÕÍÕ±…È¡ÉÕÁ¼èÉÕÁ½5ÕÍÕ±…ÈðÍÑÉ¥¹œð¹Õ±°ðÕ¹‘•™¥¹•¤ì(€¥˜€ …ÉÕÁ¼¤É•ÑÕÉ¸€M¥¸ÉÕÁ¼œì(€É•ÑÕÉ¸IUA=M}5UMU1IMmÉÕÁ¼…ÌÉÕÁ½5ÕÍÕ±…Ét€üüÑÉ…‘Õ¥ÉY…±½É©•É¥¥¼¡ÉÕÁ¼¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸•Ñ¥ÅÕ•Ñ…ÅÕ¥Á¼¡•ÅÕ¥Á¼èÅÕ¥Á¼ðÍÑÉ¥¹œð¹Õ±°ðÕ¹‘•™¥¹•¤ì(€¥˜€ …•ÅÕ¥Á¼¤É•ÑÕÉ¸€M¥¸•ÅÕ¥Á¼œì(€É•ÑÕÉ¸EU%A=Mm•ÅÕ¥Á¼…ÌÅÕ¥Á½t€üüÑÉ…‘Õ¥ÉY…±½É©•É¥¥¼¡•ÅÕ¥Á¼¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÑÉ…‘Õ¥ÉY…±½É©•É¥¥¼¡Ù…±½ÈèÍÑÉ¥¹œð¹Õ±°ðÕ¹‘•™¥¹•¤ì(€¥˜€ …Ù…±½È¤É•ÑÕÉ¸€œœì(€½¹ÍÐ¹½Éµ…±¥é…‘¼€ôÙ…±½È¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤¹É•Á±…” ½qÌ¬½œ°€œ€œ¤ì(€É•ÑÕÉ¸Y1=IM})I%%=m¹½Éµ…±¥é…‘½t€üüÑÉ…‘Õ¥É9½µ‰É•©•É¥¥¼¡Ù…±½È¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÑÉ…‘Õ¥É…Ñ•½É¥„¡…Ñ•½É¥„èÍÑÉ¥¹œð¹Õ±°ðÕ¹‘•™¥¹•¤ì(€¥˜€ ……Ñ•½É¥„¤É•ÑÕÉ¸€œœì(€½¹ÍÐ…Ñ•½É¥…ÌèI•½ÉñÍÑÉ¥¹œ°ÍÑÉ¥¹œø€ôì(€€€Ý…¥ÍÐè€i½¹„µ•‘¥„œ°(€€€‰…¬è€ÍÁ…±‘„œ°(€€€¡•ÍÐè€A•¡¼œ°(€€€Í¡½Õ±‘•ÉÌè€!½µ‰É½Ìœ°(€€€€ÕÁÁ•È…ÉµÌœè€	É…é½Ìœ°(€€€€±½Ý•È…ÉµÌœè€¹Ñ•‰É…é½Ìœ°(€€€€ÕÁÁ•È±•Ìœè€A¥•É¹…Ìœ°(€€€€±½Ý•È±•Ìœè€A…¹Ñ½ÉÉ¥±±…Ìœ°(€€€…É‘¥¼è€…É‘¥¼œ°(€€€¹•¬è€Õ•±±¼œ°(€ôì(€½¹ÍÐ¹½Éµ…±¥é…‘„€ô…Ñ•½É¥„¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤ì(€É•ÑÕÉ¸…Ñ•½É¥…Ím¹½Éµ…±¥é…‘…t€üüÑÉ…‘Õ¥ÉY…±½É©•É¥¥¼¡…Ñ•½É¥„¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÑÉ…‘Õ¥ÉÑ¥ÅÕ•Ñ…©•É¥¥¼¡•Ñ¥ÅÕ•Ñ„èÍÑÉ¥¹œ¤ì(€½¹ÍÐ¹½Éµ…±¥é…‘„€ô•Ñ¥ÅÕ•Ñ„¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤ì(€É•ÑÕÉ¸Q%EUQMm¹½Éµ…±¥é…‘…t€üüÑÉ…‘Õ¥É9½µ‰É•©•É¥¥¼¡•Ñ¥ÅÕ•Ñ„¹É•Á±…•±° |œ°€œ€œ¤¤ì)ô(