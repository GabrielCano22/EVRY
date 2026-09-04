'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { requestOrThrow } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import { currentSessionGeneration } from '@/lib/auth-session';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { civilDate, timestampToLocalCivil, todayCivil } from '@/lib/civil-date';

type Readiness = components['schemas']['Readiness'];

export function useDailyReadiness() {
  const userId = useAutenticacion(state => state.usuario?.id);
  const hoy = todayCivil();
  const queryKey = ['readiness', userId, currentSessionGeneration(), hoy] as const;
  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: ({ signal }) => requestOrThrow<Readiness | null>('/readiness/latest', { signal }),
    select: (value: Readiness | null) => {
      if (!value) return null;
      // civilDate is a calendar label stored at UTC midnight, not a local instant.
      const day = value.civilDate ? civilDate(value.civilDate.slice(0, 10)) : timestampToLocalCivil(value.date);
      return day === hoy ? value : null;
    },
  });
  return { ...query, queryKey };
}

export function ReadinessCheckin() {
  const ultimo = useDailyReadiness();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ sleepHrs: 7, stress: 3, soreness: 2, motivation: 4 });
  const guardar = useMutation({
    mutationFn: () => requestOrThrow<Readiness>('/readiness/checkin', { method: 'POST', body: datos }),
    onSuccess: (respuesta) => {
      queryClient.setQueryData(ultimo.queryKey, respuesta);
      setAbierto(false);
    },
  });
  if (ultimo.isPending || ultimo.isError || ultimo.data) return null;

  return (
    <div className="bg-surface-container-low rounded-xl border border-white/5 p-md">
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <Icon name="favorite" className="text-tertiary" />
          <h3 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
            Estado diario
          </h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Cerrar' : 'Registrar'}
        </Button>
      </div>
      {guardar.isError && <p role="alert" className="mb-sm text-sm text-error">No pudimos guardar el estado diario. Inténtalo de nuevo; tus valores siguen aquí.</p>}
      {abierto && (
        <div className="mt-md space-y-md animate-fade-in">
          <Deslizador
            etiqueta="Horas de sueño"
            min={0}
            max={12}
            paso={0.5}
            valor={datos.sleepHrs}
            onChange={(v) => setDatos({ ...datos, sleepHrs: v })}
          />
          <Deslizador
            etiqueta="Estrés"
            min={1}
            max={5}
            paso={1}
            valor={datos.stress}
            onChange={(v) => setDatos({ ...datos, stress: v })}
          />
          <Deslizador
            etiqueta="Dolor muscular"
            min={1}
            max={5}
            paso={1}
            valor={datos.soreness}
            onChange={(v) => setDatos({ ...datos, soreness: v })}
          />
          <Deslizador
            etiqueta="Motivación"
            min={1}
            max={5}
            paso={1}
            valor={datos.motivation}
            onChange={(v) => setDatos({ ...datos, motivation: v })}
          />
          <Button onClick={() => guardar.mutate()} disabled={guardar.isPending} className="w-full" size="md">
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      )}
    </div>
  );
}

function Deslizador({
  etiqueta,
  min,
  max,
  paso,
  valor,
  onChange,
}: {
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-xs">
        <span className="font-grotesk text-label-caps tracking-wider text-on-surface-variant">
          {etiqueta}
        </span>
        <span className="font-grotesk text-on-surface tabular-nums text-sm">{valor}</span>
      </div>
      <input
        aria-label={etiqueta}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
