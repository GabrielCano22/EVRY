'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import { createWorkout, trainingKeys, type Workout } from '@/lib/training-api';

export default function NuevoEntrenamiento() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountId = useAutenticacion((state) => state.usuario?.id);
  const inicioSolicitado = useRef(false);
  const creacion = useMutation({
    mutationFn: () => createWorkout({
      name: `Sesión ${new Date().toLocaleDateString('es-CO')}`,
    }),
    onSuccess: (workout) => {
      if (accountId) {
        queryClient.setQueryData<Workout[]>(trainingKeys.workoutList(accountId), (current = []) => [
          workout,
          ...current.filter((item) => item.id !== workout.id),
        ]);
        void queryClient.invalidateQueries({
          queryKey: trainingKeys.workouts(accountId),
          refetchType: 'none',
        });
      }
      router.replace(`/workout/${workout.id}`);
    },
  });

  useEffect(() => {
    if (inicioSolicitado.current) return;
    inicioSolicitado.current = true;
    creacion.mutate();
  }, [creacion]);

  if (creacion.isError) {
    const message = creacion.error instanceof ApiError
      ? creacion.error.message
      : 'No pudimos crear la sesión.';
    return <div role="alert" className="text-error">{message} <button type="button" disabled={creacion.isPending} onClick={() => creacion.mutate()} className="underline">Reintentar</button></div>;
  }
  return <div role="status" className="text-on-surface-variant text-sm">Creando sesión…</div>;
}
