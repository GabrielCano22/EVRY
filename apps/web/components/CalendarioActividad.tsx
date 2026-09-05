'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { requestOrThrow } from '@/lib/api';
import { currentSessionGeneration } from '@/lib/auth-session';
import { useAutenticacion } from '@/lib/auth-store';
import { cycleCivilDate } from '@/lib/cycle-date';
import {
  calendarMonthCells, civilDate, compareCivil, formatCivilDate, monthRange, parseCivilDate, todayCivil,
  type CivilDate,
} from '@/lib/civil-date';
import { cn } from '@/lib/utils';
import { Icon } from './ui/Icon';

type Activity = components['schemas']['ProgressActivity'];
type ActivitySession = components['schemas']['ProgressActivitySession'];
type CycleEntry = components['schemas']['CycleEntry'];
type CycleCalendar = components['schemas']['CycleCalendar'];

const DIAS_ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLOR_FASE: Record<string, string> = {
  MENSTRUAL: 'bg-tertiary/40', FOLLICULAR: 'bg-primary/30', OVULATION: 'bg-secondary/40', LUTEAL: 'bg-tertiary/25',
};
const ETIQUETAS_FLUJO: Record<string, string> = { NONE: 'Ninguno', SPOTTING: 'Manchado', LIGHT: 'Ligero', MEDIUM: 'Medio', HEAVY: 'Abundante' };
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const BOGOTA_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function millisecondsUntilNextBogotaDay(now = new Date()): number {
  const clock = Object.fromEntries(
    BOGOTA_CLOCK.formatToParts(now)
      .filter((part) => part.type === 'hour' || part.type === 'minute' || part.type === 'second')
      .map((part) => [part.type, Number(part.value)]),
  );
  const elapsed = ((clock.hour * 60 + clock.minute) * 60 + clock.second) * 1000 + now.getMilliseconds();
  return Math.max(1, MILLISECONDS_PER_DAY - elapsed + 25);
}

function useBogotaToday(): CivilDate {
  const [today, setToday] = useState(todayCivil);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function scheduleBoundary() {
      clearTimeout(timer);
      timer = setTimeout(refresh, millisecondsUntilNextBogotaDay());
    }
    function refresh() {
      const current = todayCivil();
      setToday((previous) => previous === current ? previous : current);
      scheduleBoundary();
    }
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    scheduleBoundary();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return today;
}

function numeroDiaCivil(fecha: CivilDate): number {
  const { year, month, day } = parseCivilDate(fecha);
  const adjustedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const monthIndex = month > 2 ? month - 3 : month + 9;
  return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100)
    + Math.floor((153 * monthIndex + 2) / 5) + day - 1;
}

function faseProyectada(clave: CivilDate, inicios: CivilDate[], cicloMedio: number, periodoMedio: number) {
  const fecha = numeroDiaCivil(clave);
  const inicio = inicios.map(numeroDiaCivil).filter((item) => item <= fecha).sort((a, b) => b - a)[0];
  if (inicio === undefined) return null;
  const diaCiclo = ((fecha - inicio) % cicloMedio) + 1;
  if (diaCiclo <= periodoMedio) return 'MENSTRUAL';
  const ovulacion = cicloMedio - 14;
  if (diaCiclo >= ovulacion - 1 && diaCiclo <= ovulacion + 1) return 'OVULATION';
  return diaCiclo < ovulacion ? 'FOLLICULAR' : 'LUTEAL';
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos cargar el calendario.';
}

export function CalendarioActividad() {
  const usuario = useAutenticacion((state) => state.usuario);
  if (!usuario) return null;
  return <CalendarioPorCuenta key={usuario.id} usuario={usuario} />;
}

function CalendarioPorCuenta({ usuario }: { usuario: NonNullable<ReturnType<typeof useAutenticacion.getState>['usuario']> }) {
  const queryClient = useQueryClient();
  const muestraCiclo = usuario.trackCycle;
  const generation = currentSessionGeneration();
  const hoy = useBogotaToday();
  const hoyPartes = parseCivilDate(hoy);
  const [mes, setMes] = useState(hoyPartes.month - 1);
  const [anio, setAnio] = useState(hoyPartes.year);
  const [diaSeleccionado, setDiaSeleccionado] = useState<CivilDate | null>(null);
  const rango = useMemo(() => monthRange(anio, mes + 1), [anio, mes]);
  const activityTo = compareCivil(rango.to, hoy) > 0 ? hoy : rango.to;
  const activityEnabled = compareCivil(rango.from, activityTo) <= 0;
  const activityKey = ['calendar-activity', usuario.id, generation, rango.from, activityTo] as const;
  const cycleKey = ['calendar-cycle', usuario.id, generation, rango.from, rango.to, muestraCiclo] as const;

  const activity = useQuery({
    queryKey: activityKey,
    enabled: activityEnabled,
    queryFn: ({ signal }) => requestOrThrow<Activity>(`/progress/activity?from=${rango.from}&to=${activityTo}`, { signal }),
  });
  const cycle = useQuery({
    queryKey: cycleKey,
    enabled: muestraCiclo,
    queryFn: ({ signal }) => requestOrThrow<CycleCalendar>(`/cycle/calendar?from=${rango.from}&to=${rango.to}`, { signal }),
  });

  useEffect(() => {
    const actualizar = () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-activity', usuario.id] });
      if (muestraCiclo) void queryClient.invalidateQueries({ queryKey: ['calendar-cycle', usuario.id] });
    };
    window.addEventListener('evry:cycle-updated', actualizar);
    return () => window.removeEventListener('evry:cycle-updated', actualizar);
  }, [muestraCiclo, queryClient, usuario.id]);

  const sesionesPorDia = useMemo(() => {
    const mapa = new Map<CivilDate, ActivitySession[]>();
    for (const day of activity.data?.days ?? []) mapa.set(civilDate(day.date), day.sessions);
    return mapa;
  }, [activity.data]);
  const cicloPorDia = useMemo(() => {
    const mapa = new Map<CivilDate, CycleEntry>();
    for (const entry of cycle.data?.entries ?? []) mapa.set(cycleCivilDate(entry.date), entry);
    return mapa;
  }, [cycle.data]);
  const iniciosCiclo = useMemo(() => {
    if (!muestraCiclo || !cycle.data) return [];
    const starts = cycle.data.entries.filter((entry) => entry.isPeriodStart).map((entry) => cycleCivilDate(entry.date));
    if (cycle.data.previousPeriodStart) starts.push(civilDate(cycle.data.previousPeriodStart));
    return starts;
  }, [cycle.data, muestraCiclo]);
  const celdas = useMemo(() => calendarMonthCells(anio, mes + 1), [anio, mes]);

  function cambiarMes(delta: number) {
    const next = anio * 12 + mes + delta;
    setAnio(Math.floor(next / 12));
    setMes(((next % 12) + 12) % 12);
    setDiaSeleccionado(null);
  }

  const activityReady = !activityEnabled || activity.isSuccess;
  const cycleReady = !muestraCiclo || cycle.isSuccess;
  const readsReady = activityReady && cycleReady;
  const hasData = sesionesPorDia.size > 0 || cicloPorDia.size > 0;
  const isLoading = (activityEnabled && activity.isPending) || (muestraCiclo && cycle.isPending);
  const errors = [activity.error, cycle.error].filter(Boolean);
  const staleError = errors.length > 0 && ((activity.isError && activity.data) || (cycle.isError && cycle.data));
  const selectedSessions = diaSeleccionado ? sesionesPorDia.get(diaSeleccionado) ?? [] : [];
  const selectedCycle = diaSeleccionado ? cicloPorDia.get(diaSeleccionado) : undefined;

  return (
    <div className="bg-surface-container rounded-xl p-sm border border-white/5 max-w-md">
      {isLoading && <p role="status" className="px-xs pb-sm text-xs text-on-surface-variant">Cargando calendario…</p>}
      {errors.length > 0 && <p role="alert" className="px-xs pb-sm text-xs text-error">
        {staleError && 'Mostrando datos anteriores. '}{errors.map(mensajeError).join(' ')}{' '}
        <button type="button" onClick={() => { if (activityEnabled) void activity.refetch(); if (muestraCiclo) void cycle.refetch(); }} className="underline">Reintentar</button>
      </p>}
      {activityReady && cycleReady && !hasData && <p className="px-xs pb-sm text-xs text-on-surface-variant">Aún no hay actividad registrada.</p>}

      <div className="flex items-center justify-between mb-sm px-xs">
        <h3 className="font-grotesk text-label-caps tracking-wider uppercase text-on-surface-variant text-[10px]">Actividad</h3>
        <div className="flex items-center gap-xs">
          <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)} className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"><Icon name="chevron_left" size={14} /></button>
          <span className="font-lexend text-on-surface text-xs min-w-[100px] text-center">{MESES[mes].slice(0, 3)} {anio}</span>
          <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)} className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"><Icon name="chevron_right" size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-px">{DIAS_ABREV.map((day, index) => <div key={index} className="text-center font-grotesk uppercase text-on-surface-variant text-[9px] py-px">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-px">
        {celdas.map((fecha, index) => {
          if (!fecha) return <div key={index} className="aspect-square" />;
          const sessions = sesionesPorDia.get(fecha) ?? [];
          const cycleEntry = cicloPorDia.get(fecha);
          const storedPhase = sessions.find((session) => session.cyclePhase)?.cyclePhase;
          const fase = muestraCiclo ? storedPhase ?? faseProyectada(fecha, iniciosCiclo, usuario.avgCycleLen, usuario.avgPeriodLen) : null;
          const selected = diaSeleccionado === fecha;
          const { day } = parseCivilDate(fecha);
          return <button
            key={fecha} type="button" aria-pressed={selected} onClick={() => setDiaSeleccionado(selected ? null : fecha)}
            aria-label={`Ver actividad del ${formatCivilDate(fecha, { day: 'numeric', month: 'long', year: 'numeric' })}${sessions.length ? ', con sesión de entrenamiento' : ''}${cycleEntry?.isPeriodStart ? ', inicio de período' : cycleEntry && cycleEntry.flow !== 'NONE' ? `, flujo: ${ETIQUETAS_FLUJO[cycleEntry.flow] ?? cycleEntry.flow}` : ''}${cycleEntry?.symptoms.length ? `, ${cycleEntry.symptoms.length} síntomas` : ''}`}
            className={cn(
              'aspect-square rounded flex flex-col items-center justify-center relative transition-all border text-[11px]',
              selected ? 'border-primary bg-primary/15' : compareCivil(fecha, hoy) === 0 ? 'border-primary/50 bg-surface-container-low' : 'border-transparent bg-surface-container-low hover:bg-surface-container-high',
              fase ? COLOR_FASE[fase] : '',
            )}
          >
            <span className={cn('font-grotesk tabular-nums leading-none', compareCivil(fecha, hoy) === 0 ? 'text-primary font-bold' : 'text-on-surface')}>{day}</span>
            {sessions.length > 0 && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />}
            {muestraCiclo && cycleEntry && (cycleEntry.isPeriodStart || cycleEntry.flow !== 'NONE') && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-tertiary" />}
            {muestraCiclo && cycleEntry && cycleEntry.symptoms.length > 0 && <span className="absolute bottom-0.5 right-0.5 min-w-2 rounded-full bg-secondary/80 px-0.5 text-[7px] leading-3 text-on-secondary">{cycleEntry.symptoms.length}</span>}
          </button>;
        })}
      </div>

      <div className="flex flex-wrap gap-sm mt-sm pt-sm border-t border-white/5 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-xs"><span className="w-1.5 h-1.5 rounded-full bg-primary" /><span>Sesión</span></div>
        {muestraCiclo && <><span>Fases estimadas</span>{Object.entries({ MENSTRUAL: 'Menstrual', FOLLICULAR: 'Folicular', OVULATION: 'Ovulación', LUTEAL: 'Lútea' }).map(([phase, label]) => <div key={phase} className="flex items-center gap-xs"><span className={cn('w-2 h-2 rounded-sm', COLOR_FASE[phase])} /><span>{label}</span></div>)}</>}
      </div>

      {diaSeleccionado && (readsReady || selectedSessions.length > 0 || selectedCycle) && <section aria-label={`Actividad del ${formatCivilDate(diaSeleccionado, { day: 'numeric', month: 'long' })}`} className="mt-sm pt-sm border-t border-white/5 animate-fade-in">
        <h4 className="font-grotesk text-label-caps tracking-wider uppercase text-primary text-[10px] mb-xs">{formatCivilDate(diaSeleccionado, { day: 'numeric', month: 'long' })}</h4>
        {selectedSessions.length === 0 && !selectedCycle && readsReady && <p className="font-body-md text-on-surface-variant text-xs">Sin actividad.</p>}
        {selectedSessions.map((session) => <div key={session.id} className="flex justify-between items-center py-px">
          <div className="flex items-center gap-xs"><Icon name="fitness_center" className="text-primary" size={12} /><span className="font-body-md text-on-surface text-xs">{session.name}</span></div>
          <span className="font-grotesk text-[10px] text-on-surface-variant tabular-nums">{session.setCount}s · {Math.round(session.volumeKg)}kg</span>
        </div>)}
        {muestraCiclo && selectedCycle && <div className="space-y-1 py-px">
          <div className="flex items-center gap-xs"><Icon name="water_drop" fill className="text-tertiary" size={12} /><span className="font-body-md text-on-surface text-xs">{selectedCycle.isPeriodStart ? 'Inicio de período' : `Flujo: ${ETIQUETAS_FLUJO[selectedCycle.flow] ?? selectedCycle.flow}`}</span></div>
          {selectedCycle.symptoms.length > 0 && <p className="font-body-md text-xs text-on-surface-variant">Síntomas: {selectedCycle.symptoms.join(', ')}</p>}
          {(selectedCycle.energy !== null || selectedCycle.mood !== null) && <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant">{selectedCycle.energy !== null && `Energía ${selectedCycle.energy}/5`}{selectedCycle.energy !== null && selectedCycle.mood !== null && ' · '}{selectedCycle.mood !== null && `Ánimo ${selectedCycle.mood}/5`}</p>}
          {selectedCycle.notes && <p className="font-body-md text-xs italic text-on-surface-variant">{selectedCycle.notes}</p>}
        </div>}
      </section>}
    </div>
  );
}
