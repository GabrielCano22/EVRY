'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Entrenamiento, RegistroCiclo } from '@/lib/types';
import { useAutenticacion } from '@/lib/auth-store';
import { Icon } from './ui/Icon';
import { cn } from '@/lib/utils';

const DIAS_ABREV = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COLOR_FASE: Record<string, string> = {
  MENSTRUAL: 'bg-tertiary/40',
  FOLLICULAR: 'bg-primary/30',
  OVULATION: 'bg-secondary/40',
  LUTEAL: 'bg-tertiary/25',
};

export function CalendarioActividad() {
  const { usuario } = useAutenticacion();
  const muestraCiclo = !!usuario?.trackCycle && usuario.biologicalSex === 'FEMALE';

  const [hoy] = useState(new Date());
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[]>([]);
  const [ciclo, setCiclo] = useState<RegistroCiclo[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    api<Entrenamiento[]>('/workouts?take=200').then(setEntrenamientos).catch(() => setEntrenamientos([]));
    if (muestraCiclo) {
      api<RegistroCiclo[]>('/cycle/entries').then(setCiclo).catch(() => setCiclo([]));
    } else {
      setCiclo([]);
    }
  }, [muestraCiclo]);

  const datosPorDia = useMemo(() => {
    const mapa = new Map<string, { entrenamientos: Entrenamiento[]; ciclo?: RegistroCiclo }>();
    for (const e of entrenamientos) {
      const llave = new Date(e.startedAt).toISOString().slice(0, 10);
      const actual = mapa.get(llave) ?? { entrenamientos: [] };
      actual.entrenamientos.push(e);
      mapa.set(llave, actual);
    }
    if (muestraCiclo) {
      for (const r of ciclo) {
        const llave = new Date(r.date).toISOString().slice(0, 10);
        const actual = mapa.get(llave) ?? { entrenamientos: [] };
        actual.ciclo = r;
        mapa.set(llave, actual);
      }
    }
    return mapa;
  }, [entrenamientos, ciclo, muestraCiclo]);

  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const primerDiaSemana = (primerDia.getDay() + 6) % 7;
    const total = ultimoDia.getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < primerDiaSemana; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(new Date(anio, mes, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [mes, anio]);

  function cambiarMes(delta: number) {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio--; }
    else if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
    setDiaSeleccionado(null);
  }

  const datosSeleccionado = diaSeleccionado ? datosPorDia.get(diaSeleccionado) : null;

  return (
    <div className="bg-surface-container rounded-xl p-sm border border-white/5 max-w-md">
      <div className="flex items-center justify-between mb-sm px-xs">
        <h3 className="font-grotesk text-label-caps tracking-wider uppercase text-on-surface-variant text-[10px]">
          Actividad
        </h3>
        <div className="flex items-center gap-xs">
          <button
            onClick={() => cambiarMes(-1)}
            className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"
          >
            <Icon name="chevron_left" size={14} />
          </button>
          <span className="font-lexend text-on-surface text-xs min-w-[100px] text-center">
            {MESES[mes].slice(0, 3)} {anio}
          </span>
          <button
            onClick={() => cambiarMes(1)}
            className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"
          >
            <Icon name="chevron_right" size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-px">
        {DIAS_ABREV.map((d, i) => (
          <div
            key={i}
            className="text-center font-grotesk uppercase text-on-surface-variant text-[9px] py-px"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {celdas.map((fecha, idx) => {
          if (!fecha) return <div key={idx} className="aspect-square"></div>;
          const llave = fecha.toISOString().slice(0, 10);
          const datos = datosPorDia.get(llave);
          const tieneSesion = (datos?.entrenamientos.length ?? 0) > 0;
          const fase =
            muestraCiclo
              ? datos?.entrenamientos.find((e) => e.cyclePhase)?.cyclePhase ??
                (datos?.ciclo?.isPeriodStart ? 'MENSTRUAL' : null)
              : null;
          const esHoy = fecha.toDateString() === hoy.toDateString();
          const seleccionado = diaSeleccionado === llave;
          return (
            <button
              key={idx}
              onClick={() => setDiaSeleccionado(seleccionado ? null : llave)}
              className={cn(
                'aspect-square rounded flex flex-col items-center justify-center relative transition-all border text-[11px]',
                seleccionado
                  ? 'border-primary bg-primary/15'
                  : esHoy
                  ? 'border-primary/50 bg-surface-container-low'
                  : 'border-transparent bg-surface-container-low hover:bg-surface-container-high',
                fase ? COLOR_FASE[fase] : '',
              )}
            >
              <span
                className={cn(
                  'font-grotesk tabular-nums leading-none',
                  esHoy ? 'text-primary font-bold' : 'text-on-surface',
                )}
              >
                {fecha.getDate()}
              </span>
              {tieneSesion && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"></span>
              )}
              {muestraCiclo && datos?.ciclo?.isPeriodStart && (
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-tertiary"></span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-sm mt-sm pt-sm border-t border-white/5 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>Sesión</span>
        </div>
        {muestraCiclo && (
          <>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-sm bg-tertiary/40"></span>
              <span>Menstrual</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-sm bg-primary/30"></span>
              <span>Folicular</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-sm bg-secondary/40"></span>
              <span>Ovulación</span>
            </div>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-sm bg-tertiary/25"></span>
              <span>Lútea</span>
            </div>
          </>
        )}
      </div>

      {datosSeleccionado && (
        <div className="mt-sm pt-sm border-t border-white/5 animate-fade-in">
          <h4 className="font-grotesk text-label-caps tracking-wider uppercase text-primary text-[10px] mb-xs">
            {new Date(diaSeleccionado!).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'long',
            })}
          </h4>
          {datosSeleccionado.entrenamientos.length === 0 && !datosSeleccionado.ciclo && (
            <p className="font-body-md text-on-surface-variant text-xs">Sin actividad.</p>
          )}
          {datosSeleccionado.entrenamientos.map((e) => {
            const vol = e.sets
              .filter((s) => !s.isWarmup)
              .reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
            return (
              <div key={e.id} className="flex justify-between items-center py-px">
                <div className="flex items-center gap-xs">
                  <Icon name="fitness_center" className="text-primary" size={12} />
                  <span className="font-body-md text-on-surface text-xs">{e.name}</span>
                </div>
                <span className="font-grotesk text-[10px] text-on-surface-variant tabular-nums">
                  {e.sets.length}s · {Math.round(vol)}kg
                </span>
              </div>
            );
          })}
          {muestraCiclo && datosSeleccionado.ciclo && (
            <div className="flex items-center gap-xs py-px">
              <Icon name="water_drop" fill className="text-tertiary" size={12} />
              <span className="font-body-md text-on-surface text-xs">
                {datosSeleccionado.ciclo.isPeriodStart
                  ? 'Inicio de período'
                  : `Flujo: ${datosSeleccionado.ciclo.flow.toLowerCase()}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
