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
import { api } from '@/lib/api';

interface Punto {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completedAt: string;
}

export function ExerciseChart({ exerciseId }: { exerciseId: string }) {
  const [datos, setDatos] = useState<Punto[]>([]);

  useEffect(() => {
    api<Punto[]>(`/progress/exercise/${exerciseId}`)
      .then(setDatos)
      .catch(() => setDatos([]));
  }, [exerciseId]);

  const serie = datos
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
