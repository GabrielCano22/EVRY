'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Rutina } from '@/lib/types';
import { EditorRutina } from '@/components/EditorRutina';

export default function EditarRutina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [rutina, setRutina] = useState<Rutina | null>(null);

  useEffect(() => {
    api<Rutina>(`/routines/${id}`)
      .then(setRutina)
      .catch(() => router.replace('/workout'));
  }, [id]);

  if (!rutina) return <p className="text-on-surface-variant">Cargando…</p>;

  return (
    <EditorRutina
      titulo={`Editar: ${rutina.name}`}
      rutinaExistente={rutina}
      onListo={() => router.push('/workout')}
      onCancelar={() => router.back()}
    />
  );
}
