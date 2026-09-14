'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAutenticacion } from '@/lib/auth-store';
import { currentSessionGeneration } from '@/lib/auth-session';
import {
  deleteCycleEntry,
  getCycleToday,
  listCycleEntries,
  upsertCycleEntry,
  type CycleEntry,
  type CycleEntryInput,
} from '@/lib/cycle-api';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatearFecha } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { todayCivil } from '@/lib/civil-date';
import { cycleCivilDate } from '@/lib/cycle-date';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { recentRecordsState, type CycleLoadState } from '@/lib/cycle-view-state';

type CycleFlow = CycleEntry['flow'];
interface CycleEntryDraft {
  date: string;
  flow: CycleFlow;
  symptoms: string[];
  energy: number | null;
  mood: number | null;
  notes: string;
  isPeriodStart: boolean;
}

const flujos: { valor: CycleFlow; etiqueta: string; clase: string }[] = [
  { valor: 'NONE', etiqueta: 'Ninguno', clase: 'bg-surface-dim' },
  { valor: 'SPOTTING', etiqueta: 'Manchas', clase: 'bg-tertiary/30' },
  { valor: 'LIGHT', etiqueta: 'Ligero', clase: 'bg-tertiary/50' },
  { valor: 'MEDIUM', etiqueta: 'Medio', clase: 'bg-tertiary/70' },
  { valor: 'HEAVY', etiqueta: 'Fuerte', clase: 'bg-tertiary' },
];

const ETIQUETAS_FLUJO = Object.fromEntries(flujos.map((flujo) => [flujo.valor, flujo.etiqueta])) as Record<
  CycleFlow,
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
  const { usuario } = useAutenticacion();
  if (!usuario) return null;
  if (!usuario.trackCycle) return (
    <section>
      <h1>Ciclo</h1>
      <p>El seguimiento del ciclo es opcional. Puedes activarlo en tu perfil.</p>
      <Link href="/profile">Configurar seguimiento</Link>
    </section>
  );
  return <ContenidoCiclo key={usuario.id} />;
}

function ContenidoCiclo() {
  const userId = useAutenticacion((state) => state.usuario?.id);
  const queryClient = useQueryClient();
  const queryKey = ['cycle-journal', userId, currentSessionGeneration()] as const;
  const [hoy, setHoy] = useState<CycleEntryDraft>({
    date: todayCivil() as string,
    flow: 'NONE' as CycleFlow,
    symptoms: [] as string[],
    energy: 3,
    mood: 3,
    notes: '',
    isPeriodStart: false,
  });
  const [editandoFecha, setEditandoFecha] = useState<string | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);
  const montado = useRef(true);

  const diario = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async ({ signal }) => {
      const [phase, entries] = await Promise.all([
        getCycleToday(signal),
        listCycleEntries({}, signal),
      ]);
      return { phase, entries };
    },
  });
  const fase = diario.data?.phase ?? null;
  const registros = diario.data?.entries ?? [];
  const estadoCarga: CycleLoadState = diario.isPending
    ? 'loading'
    : diario.isError && !diario.data
      ? 'error'
      : fase === null && registros.length === 0
        ? 'empty'
        : 'success';

  function fechaClave(fecha: string): string {
    return cycleCivilDate(fecha);
  }

  function formularioVacio(): CycleEntryDraft {
    return {
      date: todayCivil() as string,
      flow: 'NONE' as CycleFlow,
      symptoms: [] as string[],
      energy: 3,
      mood: 3,
      notes: '',
      isPeriodStart: false,
    };
  }

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  function editarRegistro(registro: CycleEntry) {
    const date = fechaClave(registro.date);
    setHoy({
      date,
      flow: registro.flow,
      symptoms: [...registro.symptoms],
      energy: registro.energy,
      mood: registro.mood,
      notes: registro.notes ?? '',
      isPeriodStart: registro.isPeriodStart,
    });
    setEditandoFecha(date);
    setMensajeAccion(null);
  }

  function nuevoRegistro() {
    setHoy(formularioVacio());
    setEditandoFecha(null);
    setMensajeAccion(null);
  }

  function alternarSintoma(sintoma: string) {
    setHoy((h) => ({
      ...h,
      symptoms: h.symptoms.includes(sintoma)
        ? h.symptoms.filter((s) => s !== sintoma)
        : [...h.symptoms, sintoma],
    }));
  }

  const guardarRegistro = useMutation({
    mutationFn: (payload: CycleEntryInput) => upsertCycleEntry(payload),
    onSuccess: async (_saved, payload) => {
      if (!montado.current) return;
      await queryClient.invalidateQueries({ queryKey });
      if (!montado.current) return;
      setEditandoFecha(payload.date);
      setMensajeAccion('Registro guardado. El calendario se actualizó.');
      window.dispatchEvent(new CustomEvent('evry:cycle-updated', { detail: { date: payload.date } }));
    },
    onError: (error) => {
      if (!montado.current) return;
      setMensajeAccion(error instanceof Error ? `No se pudo guardar el registro. ${error.message}` : 'No se pudo guardar el registro.');
    },
  });

  function guardar() {
    if (guardarRegistro.isPending) return;
    setMensajeAccion(null);
    guardarRegistro.mutate(editandoFecha ? { ...hoy, previousDate: editandoFecha } : hoy);
  }

  const eliminarRegistro = useMutation({
    mutationFn: ({ id }: { id: string; date: string }) => deleteCycleEntry(id),
    onSuccess: async (_result, deleted) => {
      if (!montado.current) return;
      await queryClient.invalidateQueries({ queryKey });
      if (!montado.current) return;
      if (editandoFecha === deleted.date) nuevoRegistro();
      setMensajeAccion('Registro eliminado. El calendario se actualizó.');
      window.dispatchEvent(new CustomEvent('evry:cycle-updated', { detail: { date: deleted.date } }));
    },
    onError: (error) => {
      if (!montado.current) return;
      setMensajeAccion(error instanceof Error ? `No se pudo eliminar el registro. ${error.message}` : 'No se pudo eliminar el registro.');
    },
  });

  function confirmarEliminacion(registro: CycleEntry) {
    if (eliminarRegistro.isPending) return;
    const date = fechaClave(registro.date);
    if (!window.confirm(`¿Eliminar el registro del ${formatearFecha(date)}?`)) return;
    setMensajeAccion(null);
    eliminarRegistro.mutate({ id: registro.id, date });
  }

  return (
    <div className="space-y-lg">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Ciclo</h1>
            <p className="font-body-md text-on-surface-variant">
              Consulta estimaciones de tu ciclo a partir de los registros que elijas guardar.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={nuevoRegistro}>
            <Icon name="add" size={18} />
            Nuevo registro
          </Button>
        </div>
      </header>
      {estadoCarga === 'loading' && <p role="status" className="text-on-surface-variant">Cargando datos del ciclo…</p>}
      {diario.isError && <p role="alert" className="text-error">No pudimos cargar los datos del ciclo. {diario.error instanceof Error && `${diario.error.message} `}{diario.data && 'Mostramos la última consulta correcta. '}<button type="button" onClick={() => void diario.refetch()} className="underline">Reintentar</button></p>}

      {estadoCarga === 'success' && fase ? (
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-sm">
                <Icon name="cyclone" className="text-tertiary" />
                <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
                  Fase estimada
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
                Próximo período estimado · {formatearFecha(fase.nextPeriodStart)}
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
              max={todayCivil()}
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

        <Button onClick={guardar} className="w-full" size="lg" loading={guardarRegistro.isPending} disabled={guardarRegistro.isPending}>
          <Icon name="save" />
          {guardarRegistro.isPending ? 'Guardando…' : 'Guardar registro'}
        </Button>
        {mensajeAccion && (
          <p
            role={mensajeAccion.includes('No se pudo') ? 'alert' : 'status'}
            className={cn(
              'mt-sm text-center font-body-md text-sm',
              mensajeAccion.includes('No se pudo') ? 'text-error' : 'text-secondary',
            )}
          >
            {mensajeAccion}
          </p>
        )}
      </div>

      <CalendarioActividad />

      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Recientes</h2>
        <div className="bg-surface-container-low rounded-xl border border-white/5 divide-y divide-white/5">
          {recentRecordsState(estadoCarga, registros.length) === 'empty' ? (
            <p className="text-on-surface-variant font-body-md p-lg text-center">
              Sin registros aún.
            </p>
          ) : recentRecordsState(estadoCarga, registros.length) === 'items' ? (
            registros.slice(0, 14).map((r) => (
              <div key={r.id} className="flex flex-wrap justify-between items-center gap-sm p-md">
                <div className="flex items-center gap-sm">
                  {r.isPeriodStart && (
                    <Icon name="water_drop" fill className="text-tertiary" size={16} />
                  )}
                  <span className="font-body-md text-on-surface">{formatearFecha(cycleCivilDate(r.date))}</span>
                </div>
                <div className="flex gap-sm items-center text-xs text-on-surface-variant">
                  <button
                    type="button"
                    onClick={() => editarRegistro(r)}
                    className="inline-flex items-center gap-1 rounded border border-primary/30 px-xs py-1 font-grotesk text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
                    aria-label={`Editar registro del ${formatearFecha(cycleCivilDate(r.date))}`}
                  >
                    <Icon name="edit" size={13} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmarEliminacion(r)}
                    disabled={eliminarRegistro.isPending}
                    className="inline-flex items-center gap-1 rounded border border-error/30 px-xs py-1 font-grotesk text-[10px] uppercase tracking-wider text-error hover:bg-error/10 disabled:opacity-50"
                    aria-label={`Eliminar registro del ciclo ${fechaClave(r.date) === todayCivil() ? 'de hoy' : `del ${formatearFecha(fechaClave(r.date))}`}`}
                  >
                    <Icon name="delete" size={13} />
                    Eliminar
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
          ) : null}
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
  valor: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant mb-sm block uppercase">
        {etiqueta} · {valor === null ? 'Sin dato' : `${valor}/5`}
      </span>
      <div className="grid grid-cols-3 gap-xs sm:grid-cols-6">
        <button
          type="button"
          aria-pressed={valor === null}
          onClick={() => onChange(null)}
          className={cn(
            'rounded-lg border py-sm font-grotesk text-xs transition-all',
            valor === null
              ? 'border-primary bg-primary text-on-primary'
              : 'border-white/10 bg-surface-container-low text-on-surface-variant',
          )}
        >
          Sin dato
        </button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={valor === n}
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
