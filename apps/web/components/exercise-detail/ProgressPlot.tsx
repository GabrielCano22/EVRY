'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExerciseProgress } from '@/lib/progress-api';

export default function ProgressPlot({ points }: Pick<ExerciseProgress, 'points'>) {
  const data = points.filter(point => point.estimated1RMKg !== null).map(point => ({ ...point,
    date: new Date(point.to).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
  }));
  if (!data.length) return <p>Sin datos de carga para graficar.</p>;
  return <>
    <div className="h-64" role="img" aria-label="Evolución del 1RM estimado">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="#45515e" strokeDasharray="3 3" />
          <XAxis dataKey="date" /><YAxis /><Tooltip />
          <Area name="1RM estimado (kg)" dataKey="estimated1RMKg" stroke="#70B7FF" fill="#168DFF" fillOpacity={0.2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <details><summary>Ver datos de la gráfica</summary><ul>{data.map(point => <li key={point.from}>{point.date}: {point.estimated1RMKg} kg · {point.sessionsCount} sesiones</li>)}</ul></details>
  </>;
}
