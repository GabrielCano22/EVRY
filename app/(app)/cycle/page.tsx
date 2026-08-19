'use client';
import { useEffect, useState } from 'react';
import { api, request } from '@/lib/api';
import type { RegistroCiclo, Flujo, InfoFase } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatearFecha } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { civilDate, todayCivil } from '@/lib/civil-date';
import { CalendarioActividad } from '@/components/CalendarioActividad';

const flujos: { valor: Flujo; etiqueta: string; clase: string }[] = [
  { valor: 'NONE', etiqueta: 'Ninguno', clase: 'bg-surface-dim' },
  { valor: 'SPOTTING', etiqueta: 'Manchas', clase: 'bg-tertiary/30' },
  { valor: 'LIGHT', etiqueta: 'Ligero', clase: 'bg-tertiary/50' },
  { valor: 'MEDIUM', etiqueta: 'Medio', clase: 'bg-tertiary/70' },
  { valor: 'HEAVY', etiqueta: 'Fuerte', clase: 'bg-tertiary' },
];

const ETIQUETAS_FLUJO = Object.fromEntries(flujos.map((flujo) => [flujo.valor, flujo.etiqueta])) as Record<
  Flujo,
  string
>;

const sintomasDisponibles = [
  'cólicos',
  'dolor de cabeza',
  'fatiga',
  'hinchazón',
  'antojos',
  'irritabilidad',
  'acné',
  'libido alto',
  'libido bajo',
  'energía alta',
];

const FASES_ESPANOL: Record<string, string> = {
  MENSTRUAL: 'Menstrual',
  FOLLICULAR: 'Folicular',
  OVULATION: 'Ovulación',
  LUTEAL: 'Lútea',
};

const colorFase: Record<string, string> = {
  MENSTRUAL: 'text-tertiary',
  FOLLICULAR: 'text-primary',
  OVULATION: 'text-secondary',
  LUTEAL: 'text-tertiary',
};

export default function PaginaCiclo() {
  const [fase, setFase] = useState<InfoFase | null>(null);
  const [registros, setRegistros] = useState<RegistroCiclo[]>([]);
  const [hoy, setHoy] = useState({
    date: todayCivil() as string,
    flow: 'NONE' as Flujo,
    symptoms: [] as string[],
    energy: 3,
    mood: 3,
    notes: '',
    isPeriodStart: false,
  });
  const [editandoFecha, setEditandoFecha] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<'loading' | 'error' | 'empty' | 'success'>('loading');

  function fechaClave(fecha: string): string {
    return civilDate(fecha);
  }

  function formularioVacio() {
    return {
      date: todayCivil() as string,
      flow: 'NONE' as Flujo,
      symptoms: [] as string[],
      energy: 3,
      mood: 3,
      notes: '',
      isPeriodStart: false,
    };
  }

  async function cargar() {
    setEstadoCarga('loading');
    const [f, r] = await Promise.all([
      request<InfoFase | null>('/cycle/today'),
      request<RegistroCiclo[]>('/cycle/entries'),
    ]);
    if (f.ok) setFase(f.data);
    if (r.ok) setRegistros(r.data);
    const error = !f.ok ? f.error : !r.ok ? r.error : null;
    if (error && error.code !== 'aborted') {
      setMensaje(error.message);
      setEstadoCarga('error');
    } else if (f.ok && r.ok) {
      setEstadoCarga(f.data === null && r.data.length === 0 ? 'empty' : 'success');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function editarRegistro(registro: RegistroCiclo) {
    const date = fechaClave(registro.date);
    setHoy({
      date,
      flow: registro.flow,
      symptoms: [...registro.symptoms],
      energy: registro.energy ?? 3,
      mood: registro.mood ?? 3,
      notes: registro.notes ?? '',
      isPeriodStart: registro.isPeriodStart,
    });
    setEditandoFecha(date);
    setMensaje(null);
  }

  function nuevoRegistro() {
    setHoy(formularioVacio());
    setEditandoFecha(null);
    setMensaje(null);
  }

  function alternarSintoma(sintoma: string) {
    setHoy((h) => ({
      ...h,
      symptoms: h.symptoms.includes(sintoma)
        ? h.symptoms.filter((s) => s !== sintoma)
        : [...h.symptoms, sintoma],
    }));
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = editandoFecha
        ? { ...hoy, previousDate: editandoFecha }
        : hoy;
      await api('/cycle/entries', { method: 'POST', json: payload });
      await cargar();
      setEditandoFecha(hoy.date);
      setMensaje('Registro guardado. El calendario se actualizó.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('evry:cycle-updated', { detail: { date: hoy.date } }),
        );
      }
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar el registro.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-lg">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Ciclo</h1>
            <p className="font-body-md text-on-surface-variant">
              Adapta tu entrenamiento a tu fase hormonal.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={nuevoRegistro}>
            <Icon name="add" size={18} />
            Nuevo registro
          </Button>
        </div>
      </header>
      {estadoCarga === 'loading' && <p role="status" className="text-on-surface-variant">Cargando datos del ciclo…</p>}
      {estadoCarga === 'error' && <p role="alert" className="text-error">No pudimos cargar los datos del ciclo. <button type="button" onClick={() => void cargar()} className="underline">Reintentar</button></p>}
      {mensaje && mensaje !== 'Registro guardado. El calendario se actualizó.' && (
        <p role="alert" className="text-error">No pudimos cargar todos los datos. {mensaje} <button type="button" onClick={() => void cargar()} className="underline">Reintentar</button></p>
      )}

      {estadoCarga === 'success' && fase ? (
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-sm">
                <Icon name="cyclone" className="text-tertiary" />
                <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
                  Fase actual
                </span>
              </div>
              <span className="px-sm py-xs bg-tertiary text-on-tertiary font-grotesk text-[10px] tracking-wider rounded">
                Día {fase.dayOfCycle}/{fase.cycleLength}
              </span>
            </div>
            <div
              className={cn(
                'font-display-lg text-display-lg mb-sm',
                colorFase[fase.phase] ?? 'text-tertiary',
              )}
            >
              {FASES_ESPANOL[fase.phase] ?? fase.phase}
            </div>
            <p className="font-body-lg text-on-surface mb-md">{fase.trainingHint}</p>
            {fase.nextPeriodStart && (
              <p className="font-grotesk text-label-caps tracking-wider text-on-surface-variant uppercase">
                Próximo período · {formatearFecha(fase.nextPeriodStart)}
              </p>
            )}
          </div>
        </div>
      ) : estadoCarga === 'empty' ? (
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5 text-center">
          <Icon name="info" size={32} className="text-on-surface-variant mb-sm" />
          <p className="font-body-md text-on-surface-variant">
            Datos insuficientes. Marca abajo el inicio de tu próximo período para empezar.
          </p>
        </div>
      ) : null}

      <div className="bg-surface-container rounded-xl p-lg border border-white/5">
        <div className="flex items-center justify-between mb-md">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {editandoFecha ? 'Editar registro' : 'Registrar ciclo'}
            </h2>
            <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant uppercase">
              {editandoFecha ? 'Puedes moverlo a otra fecha' : 'Añade síntomas y estado del día'}
            </p>
          </div>
          <label className="flex flex-col items-end gap-1 font-grotesk text-[10px] tracking-wider text-on-surface-variant uppercase">
            Fecha
            <input
              id="ciclo-fecha"
              type="date"
              value={hoy.date}
              onChange={(e) => setHoy({ ...hoy, date: e.target.value })}
              className="rounded-lg border border-white/10 bg-surface-container-low px-sm py-xs text-sm normal-case text-on-surface outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="flex items-center justify-between py-sm cursor-pointer mb-md">
          <span className="font-body-lg text-[17px] text-on-surface flex items-center gap-sm">
            <Icon name="water_drop" fill className="text-tertiary" />
            Hoy inicia mi período
          </span>
          <span
            className={cn(
              'relative w-14 h-7 rounded-full flex items-center p-1 transition-colors',
              hoy.isPeriodStart ? 'bg-primary' : 'bg-surface-container-high',
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full bg-on-primary shadow-sm transform transition-transform',
                hoy.isPeriodStart ? 'translate-x-7' : 'translate-x-0',
              )}
            ></span>
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={hoy.isPeriodStart}
            onChange={(e) => setHoy({ ...hoy, isPeriodStart: e.target.checked })}
          />
        </label>

        <div className="mb-md">
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm block">
            Flujo
          </span>
          <div className="flex gap-xs">
            {flujos.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setHoy({ ...hoy, flow: f.valor })}
                className={cn(
                  'flex-1 py-sm rounded-lg font-grotesk text-label-caps tracking-wider border transition-all',
                  hoy.flow === f.valor ? 'border-primary' : 'border-white/10',
                  f.clase,
                )}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-md">
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm block">
            Síntomas
          </span>
          <div className="flex flex-wrap gap-xs">
            {sintomasDisponibles.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => alternarSintoma(s)}
                className={cn(
                  'px-md py-xs rounded-full font-body-md text-xs border transition-all',
                  hoy.symptoms.includes(s)
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low border-white/10 text-on-surface-variant hover:border-white/30',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md mb-md">
          <SelectorRango
            etiqueta="Energía"
            valor={hoy.energy}
            onChange={(v) => setHoy({ ...hoy, energy: v })}
          />
          <SelectorRango
            etiqueta="Ánimo"
            valor={hoy.mood}
            onChange={(v) => setHoy({ ...hoy, mood: v })}
          />
        </div>

        <label className="mb-md block">
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm block">
            Notas (opcional)
          </span>
          <textarea
            value={hoy.notes}
            onChange={(e) => setHoy({ ...hoy, notes: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="¿Cómo te sentiste hoy?"
            className="w-full resize-y rounded-lg border border-white/10 bg-surface-container-low px-md py-sm font-body-md text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary"
          />
        </label>

        <Button onClick={guardar} className="w-full" size="lg" loading={guardando} disabled={guardando}>
          <Icon name="save" />
          {guardando ? 'Guardando…' : 'Guardar registro'}
        </Button>
        {mensaje && (
          <p
            role="status"
            className={cn(
              'mt-sm text-center font-body-md text-sm',
              mensaje.includes('No se pudo') ? 'text-error' : 'text-secondary',
            )}
          >
            {mensaje}
          </p>
        )}
      </div>

      <CalendarioActividad />

      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Recientes</h2>
        <div className="bg-surface-container-low rounded-xl border border-white/5 divide-y divide-white/5">
          {registros.length === 0 ? (
            <p className="text-on-surface-variant font-body-md p-lg text-center">
              Sin registros aún.
            </p>
          ) : (
            registros.slice(0, 14).map((r) => (
              <div key={r.id} className="flex flex-wrap justify-between items-center gap-sm p-md">
                <div className="flex items-center gap-sm">
                  {r.isPeriodStart && (
                    <Icon name="water_drop" fill className="text-tertiary" size={16} />
                  )}
                  <span className="font-body-md text-on-surface">{formatearFecha(r.date)}</span>
                </div>
                <div className="flex gap-sm items-center text-xs text-on-surface-variant">
                  <button
                    type="button"
                    onClick={() => editarRegistro(r)}
                    className="inline-flex items-center gap-1 rounded border border-primary/30 px-xs py-1 font-grotesk text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
                    aria-label={`Editar registro del ${formatearFecha(r.date)}`}
                  >
                    <Icon name="edit" size={13} />
                    Editar
                  </button>
                  {r.flow !== 'NONE' && (
                    <span className="font-grotesk tracking-wider text-tertiary uppercase">
                      {ETIQUETAS_FLUJO[r.flow] ?? r.flow}
                    </span>
                  )}
                  {r.symptoms.length > 0 && <span>· {r.symptoms.length} síntomas</span>}
                  {r.energy !== null && <span>· E:{r.energy}/5</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SelectorRango({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-sm block uppercase">
        {etiqueta} · {valor}/5
      </span>
      <div className="flex gap-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 py-sm rounded-lg font-grotesk text-sm border transition-all',
              valor === n
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface-container-low border-white/10 text-on-surface-variant',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
