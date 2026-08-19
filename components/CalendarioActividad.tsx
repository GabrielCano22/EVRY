'use client';
import { useEffect, useMemo, useState } from 'react';
import { request } from '@/lib/api';
import type { Entrenamiento, RegistroCiclo } from '@/lib/types';
import { useAutenticacion } from '@/lib/auth-store';
import { Icon } from './ui/Icon';
import { cn } from '@/lib/utils';
import {
  calendarMonthCells,
  civilDate,
  compareCivil,
  formatCivilDate,
  parseCivilDate,
  timestampToLocalCivil,
  todayCivil,
  type CivilDate,
} from '@/lib/civil-date';

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

const ETIQUETAS_FLUJO: Record<string, string> = {
  NONE: 'Ninguno',
  SPOTTING: 'Manchado',
  LIGHT: 'Ligero',
  MEDIUM: 'Medio',
  HEAVY: 'Abundante',
};

function claveFechaLocal(valor: string): CivilDate {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return civilDate(valor);
  return timestampToLocalCivil(valor);
}

function numeroDiaCivil(fecha: CivilDate): number {
  const { year, month, day } = parseCivilDate(fecha);
  const adjustedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const monthIndex = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * monthIndex + 2) / 5) + day - 1;
  return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
}

function faseProyectada(
  clave: CivilDate,
  inicios: CivilDate[],
  cicloMedio: number,
  periodoMedio: number,
): string | null {
  const fecha = numeroDiaCivil(clave);
  const inicio = inicios
    .map(numeroDiaCivil)
    .filter((item) => item <= fecha)
    .sort((a, b) => b - a)[0];
  if (!inicio) return null;

  const dia = fecha - inicio + 1;
  const diaCiclo = ((dia - 1) % cicloMedio) + 1;
  if (diaCiclo <= periodoMedio) return 'MENSTRUAL';
  const ovulacion = cicloMedio - 14;
  if (diaCiclo >= ovulacion - 1 && diaCiclo <= ovulacion + 1) return 'OVULATION';
  return diaCiclo < ovulacion ? 'FOLLICULAR' : 'LUTEAL';
}

export function CalendarioActividad() {
  const { usuario } = useAutenticacion();
  const muestraCiclo = !!usuario?.trackCycle && usuario.biologicalSex === 'FEMALE';

  const [hoy] = useState(todayCivil);
  const componentesHoy = parseCivilDate(hoy);
  const [mes, setMes] = useState(componentesHoy.month - 1);
  const [anio, setAnio] = useState(componentesHoy.year);
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[]>([]);
  const [ciclo, setCiclo] = useState<RegistroCiclo[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<CivilDate | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<'loading' | 'error' | 'empty' | 'success'>('loading');

  useEffect(() => {
    let activo = true;
    const cargarDatos = async () => {
      setEstadoCarga('loading');
      const entrenamientosPromise = request<Entrenamiento[]>('/workouts?take=200');
      const cicloPromise = muestraCiclo
        ? request<RegistroCiclo[]>('/cycle/entries')
        : Promise.resolve({ ok: true as const, data: [] as RegistroCiclo[] });
      const [nuevosEntrenamientos, nuevosRegistros] = await Promise.all([
        entrenamientosPromise,
        cicloPromise,
      ]);
      if (!activo) return;
      if (nuevosEntrenamientos.ok) setEntrenamientos(nuevosEntrenamientos.data);
      if (nuevosRegistros.ok) setCiclo(nuevosRegistros.data);
      const error = !nuevosEntrenamientos.ok ? nuevosEntrenamientos.error : !nuevosRegistros.ok ? nuevosRegistros.error : null;
      if (error && error.code !== 'aborted') setErrorCarga(error.message);
      if (error && error.code !== 'aborted') setEstadoCarga('error');
      else if (nuevosEntrenamientos.ok && nuevosRegistros.ok) setEstadoCarga(nuevosEntrenamientos.data.length === 0 && nuevosRegistros.data.length === 0 ? 'empty' : 'success');
    };

    cargarDatos();
    const actualizar = () => cargarDatos();
    window.addEventListener('evry:cycle-updated', actualizar);
    return () => {
      activo = false;
      window.removeEventListener('evry:cycle-updated', actualizar);
    };
  }, [muestraCiclo]);

  const datosPorDia = useMemo(() => {
    const mapa = new Map<CivilDate, { entrenamientos: Entrenamiento[]; ciclo?: RegistroCiclo }>();
    for (const e of entrenamientos) {
      const llave = claveFechaLocal(e.startedAt);
      const actual = mapa.get(llave) ?? { entrenamientos: [] };
      actual.entrenamientos.push(e);
      mapa.set(llave, actual);
    }
    if (muestraCiclo) {
      for (const r of ciclo) {
        const llave = claveFechaLocal(r.date);
        const actual = mapa.get(llave) ?? { entrenamientos: [] };
        actual.ciclo = r;
        mapa.set(llave, actual);
      }
    }
    return mapa;
  }, [entrenamientos, ciclo, muestraCiclo]);

  const iniciosCiclo = useMemo(
    () => ciclo.filter((registro) => registro.isPeriodStart).map((registro) => claveFechaLocal(registro.date)),
    [ciclo],
  );

  const celdas = useMemo(() => {
    return calendarMonthCells(anio, mes + 1);
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
      {estadoCarga === 'loading' && <p role="status" className="px-xs pb-sm text-xs text-on-surface-variant">Cargando calendario…</p>}
      {estadoCarga === 'error' && <p role="alert" className="px-xs pb-sm text-xs text-error">No pudimos cargar el calendario. <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('evry:cycle-updated'))} className="underline">Reintentar</button></p>}
      {estadoCarga === 'empty' && <p className="px-xs pb-sm text-xs text-on-surface-variant">Aún no hay actividad registrada.</p>}
      <div className="flex items-center justify-between mb-sm px-xs">
        <h3 className="font-grotesk text-label-caps tracking-wider uppercase text-on-surface-variant text-[10px]">
          Actividad
        </h3>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => cambiarMes(-1)}
            className="w-6 h-6 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center"
          >
            <Icon name="chevron_left" size={14} />
          </button>
          <span className="font-lexend text-on-surface text-xs min-w-[100px] text-center">
            {MESES[mes].slice(0, 3)} {anio}
          </span>
          <button
            type="button"
            aria-label="Mes siguiente"
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
          const llave = fecha;
          const { day } = parseCivilDate(fecha);
          const datos = datosPorDia.get(llave);
          const tieneSesion = (datos?.entrenamientos.length ?? 0) > 0;
          const fase =
            muestraCiclo
              ? datos?.entrenamientos.find((e) => e.cyclePhase)?.cyclePhase ??
                faseProyectada(
                  llave,
                  iniciosCiclo,
                  usuario?.avgCycleLen ?? 28,
                  usuario?.avgPeriodLen ?? 5,
                )
              : null;
          const esHoy = compareCivil(llave, hoy) === 0;
          const seleccionado = diaSeleccionado === llave;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setDiaSeleccionado(seleccionado ? null : llave)}
              aria-label={`Ver actividad del ${formatCivilDate(fecha, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}${tieneSesion ? ', con sesión de entrenamiento' : ''}${datos?.ciclo?.isPeriodStart ? ', inicio de período' : ''}${datos?.ciclo?.symptoms.length ? `, ${datos.ciclo.symptoms.length} síntomas` : ''}`}
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
                {day}
              </span>
              {tieneSesion && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary"></span>
              )}
              {muestraCiclo && datos?.ciclo?.isPeriodStart && (
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-tertiary"></span>
              )}
              {muestraCiclo && datos?.ciclo && !datos.ciclo.isPeriodStart && datos.ciclo.flow !== 'NONE' && (
                <span
                  className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-tertiary"
                  title={`Flujo: ${ETIQUETAS_FLUJO[datos.ciclo.flow] ?? datos.ciclo.flow}`}
                ></span>
              )}
              {muestraCiclo && datos?.ciclo && datos.ciclo.symptoms.length > 0 && (
                <span
                  className="absolute bottom-0.5 right-0.5 min-w-2 rounded-full bg-secondary/80 px-0.5 text-[7px] leading-3 text-on-secondary"
                  title={`${datos.ciclo.symptoms.length} síntoma(s)`}
                >
                  {datos.ciclo.symptoms.length}
                </span>
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
            {formatCivilDate(diaSeleccionado!, {
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
            <div className="space-y-1 py-px">
              <div className="flex items-center gap-xs">
                <Icon name="water_drop" fill className="text-tertiary" size={12} />
                <span className="font-body-md text-on-surface text-xs">
                  {datosSeleccionado.ciclo.isPeriodStart
                    ? 'Inicio de período'
                    : `Flujo: ${ETIQUETAS_FLUJO[datosSeleccionado.ciclo.flow] ?? datosSeleccionado.ciclo.flow}`}
                </span>
              </div>
              {datosSeleccionado.ciclo.symptoms.length > 0 && (
                <p className="font-body-md text-xs text-on-surface-variant">
                  Síntomas: {datosSeleccionado.ciclo.symptoms.join(', ')}
                </p>
              )}
              {(datosSeleccionado.ciclo.energy !== null || datosSeleccionado.ciclo.mood !== null) && (
                <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant">
                  {datosSeleccionado.ciclo.energy !== null && `Energía ${datosSeleccionado.ciclo.energy}/5`}
                  {datosSeleccionado.ciclo.energy !== null && datosSeleccionado.ciclo.mood !== null && ' · '}
                  {datosSeleccionado.ciclo.mood !== null && `Ánimo ${datosSeleccionado.ciclo.mood}/5`}
                </p>
              )}
              {datosSeleccionado.ciclo.notes && (
                <p className="font-body-md text-xs italic text-on-surface-variant">
                  {datosSeleccionado.ciclo.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
