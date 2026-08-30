'use client';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/api';
import type { Rutina } from '@/lib/types';
import { EditorRutina } from '@/components/EditorRutina';

export default function EditarRutina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [cargando, setCargando] = useState(true);
  const solicitudActual = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const solicitud = ++solicitudActual.current;
    setError(null);
    setCargando(true);
    void request<Rutina>(`/routines/${id}`, { signal: controller.signal }).then((result) => {
      if (solicitud !== solicitudActual.current) return;
      if (result.ok) setRutina(result.data);
      else if (result.error.code !== 'aborted') setError(result.error.message);
      setCargando(false);
    });
    return () => { controller.abort(); solicitudActual.current += 1; };
  }, [id, intento]);

  if (error) return <p role="alert" className="text-error">No pudimos cargar la rutina. <button type="button" onClick={() => setIntento((value) => value + 1)} className="underline">Reintentar</button></p>;
  if (cargando || !rutina) return <p role="status" className="text-on-surface-variant">Cargando…</p>;

  return (
    <EditorRutina
      titulo={`Editar: ${rutina.name}`}
      rutinaExistente={rutina}
      onListo={() => router.push('/workout')}
      onCancelar={() => router.back()}
    />
  );
}
