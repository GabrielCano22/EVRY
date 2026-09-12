'use client';
import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { getRoutine, trainingKeys } from '@/lib/training-api';
import { EditorRutina } from '@/components/EditorRutina';

export default function EditarRutina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const accountId = useAutenticacion((state) => state.usuario?.id);
  const rutina = useQuery({
    queryKey: trainingKeys.routineDetail(accountId ?? 'sin-cuenta', id),
    enabled: Boolean(accountId),
    queryFn: ({ signal }) => getRoutine(id, signal),
  });

  if (rutina.isError && !rutina.data) return <p role="alert" className="text-error">No pudimos cargar la rutina. <button type="button" onClick={() => void rutina.refetch()} className="underline">Reintentar</button></p>;
  if (rutina.isPending || !rutina.data) return <p role="status" className="text-on-surface-variant">Cargando…</p>;

  return (
    <>
      {rutina.isError && (
        <p role="alert" className="mb-md text-sm text-error">
          No pudimos actualizar la rutina; conservamos tus datos actuales.{' '}
          <button type="button" onClick={() => void rutina.refetch()} className="underline">Reintentar actualización</button>
        </p>
      )}
      <EditorRutina
        key={rutina.data.id}
        titulo={`Editar: ${rutina.data.name}`}
        rutinaExistente={rutina.data}
        onListo={() => router.push('/workout')}
        onCancelar={() => router.back()}
      />
    </>
  );
}
