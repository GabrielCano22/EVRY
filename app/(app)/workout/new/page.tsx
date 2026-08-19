'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Entrenamiento } from '@/lib/types';

export default function NuevoEntrenamiento() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Entrenamiento>('/workouts', {
      method: 'POST',
      json: { name: 'Sesión ' + new Date().toLocaleDateString('es-CO') },
    })
      .then((entrenamiento) => router.replace(`/workout/${entrenamiento.id}`))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No pudimos crear la sesión.'));
  }, [router]);
  if (error) return <div role="alert" className="text-error">{error} <button type="button" onClick={() => router.refresh()} className="underline">Reintentar</button></div>;
  return <div role="status" className="text-on-surface-variant text-sm">Creando sesión…</div>;
}
