'use client';
import { useEffect, useState } from 'react';
import { api, request } from '@/lib/api';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { compareCivil, timestampToLocalCivil, todayCivil } from '@/lib/civil-date';

interface UltimoCheckin {
  date: string;
  score: number;
}

export function ReadinessCheckin() {
  const [ultimo, setUltimo] = useState<UltimoCheckin | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [datos, setDatos] = useState({ sleepHrs: 7, stress: 3, soreness: 2, motivation: 4 });

  useEffect(() => {
    const controller = new AbortController();
    void request<UltimoCheckin | null>('/readiness/latest', { signal: controller.signal }).then((result) => {
      if (result.ok) setUltimo(result.data);
      else if (result.error.code !== 'aborted') setErrorCarga(result.error.message);
    });
    return () => controller.abort();
  }, []);

  const yaHoy = ultimo && compareCivil(timestampToLocalCivil(ultimo.date), todayCivil()) === 0;
  if (yaHoy) return null;

  async function guardar() {
    const respuesta = await api<UltimoCheckin>('/readiness/checkin', {
      method: 'POST',
      json: datos,
    });
    setUltimo(respuesta);
    setAbierto(false);
  }

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
      {errorCarga && <p role="alert" className="mb-sm text-sm text-error">No pudimos cargar el estado diario. <button type="button" onClick={() => window.location.reload()} className="underline">Reintentar</button></p>}
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
          <Button onClick={guardar} className="w-full" size="md">
            Guardar
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
