'use client';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
} from 'recharts';
import { request } from '@/lib/api';
import { remoteFromResult, type RemoteData } from '@/lib/remote-data';

interface Punto {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completedAt: string;
}

export function ExerciseChart({ exerciseId }: { exerciseId: string }) {
  const [estado, setEstado] = useState<RemoteData<Punto[]>>({ status: 'loading' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void request<Punto[]>(`/progress/exercise/${exerciseId}`, { signal: controller.signal }).then((result) =>
      setEstado(remoteFromResult(result, { isEmpty: (items) => items.length === 0 })),
    );
    return () => controller.abort();
  }, [exerciseId, intento]);

  const serie = (estado.status === 'success' || estado.status === 'empty' ? estado.data : estado.status === 'error' ? estado.staleData ?? [] : [])
    .filter((d) => d.weightKg && d.reps)
    .map((d) => ({
      fecha: new Date(d.completedAt).toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
      }),
      e1rm: Math.round((d.weightKg ?? 0) * (1 + (d.reps ?? 0) / 30) * 10) / 10,
    }));

  return (
    <div className="bg-surface-container rounded-xl p-md border border-white/5">
      <h3 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mb-md">
        Evolución 1RM estimado
      </h3>
      {estado.status === 'error' && <p role="alert" className="mb-sm text-sm text-error">No pudimos cargar la evolución. <button type="button" onClick={() => setIntento((value) => value + 1)} className="underline">Reintentar</button></p>}
      {serie.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-center py-xl">
          Sin datos para graficar.
        </p>
      ) : (
        <div className="h-72 -ml-4">
          <ResponsiveContainer>
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#212b34" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: '#A1ABB7', fontSize: 11 }}
                axisLine={{ stroke: '#212b34' }}
              />
              <YAxis
                tick={{ fill: '#A1ABB7', fontSize: 11 }}
                axisLine={{ stroke: '#212b34' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#17212a',
                  border: '1px solid #2c363f',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#A1ABB7', fontSize: 12 }}
                itemStyle={{ color: '#007AFF' }}
              />
              <Area type="monotone" dataKey="e1rm" stroke="#007AFF" strokeWidth={2} fill="url(#cg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
