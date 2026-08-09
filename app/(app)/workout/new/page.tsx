'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Entrenamiento } from '@/lib/types';

export default function NuevoEntrenamiento() {
  const router = useRouter();
  useEffect(() => {
    api<Entrenamiento>('/workouts', {
      method: 'POST',
      json: { name: 'Sesión ' + new Date().toLocaleDateString('es-CO') },
    })
      .then((entrenamiento) => router.replace(`/workout/${entrenamiento.id}`))
      .catch(() => router.replace('/workout'));
  }, [router]);
  return <div className="text-on-surface-variant text-sm">Creando sesión…</div>;
}
