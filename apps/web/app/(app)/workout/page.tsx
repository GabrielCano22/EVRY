'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { useAutenticacion } from '@/lib/auth-store';
import {
  createWorkout,
  deleteRoutine,
  listRoutines,
  listWorkouts,
  startRoutine,
  trainingKeys,
  type Routine,
  type Workout,
} from '@/lib/training-api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { formatearFechaHora, cn } from '@/lib/utils';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Pestana = 'rutinas' | 'rapida' | 'historial';

export default function ListaEntrenamientos() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountId = useAutenticacion((state) => state.usuario?.id);
  const [pestana, setPestana] = useState<Pestana>('rutinas');
  const [nombre, setNombre] = useState('Sesión rápida');
  const entrenamientos = useQuery({
    queryKey: trainingKeys.workoutList(accountId ?? 'sin-cuenta'),
    enabled: Boolean(accountId),
    queryFn: ({ signal }) => listWorkouts({}, signal),
  });
  const rutinasRemotas = useQuery({
    queryKey: trainingKeys.routineList(accountId ?? 'sin-cuenta'),
    enabled: Boolean(accountId),
    queryFn: ({ signal }) => listRoutines(signal),
  });
  function conservarSesionIniciada(workout: Workout) {
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
    router.push(`/workout/${workout.id}`);
  }
  const inicioRapido = useMutation({
    mutationFn: () => createWorkout({ name: nombre.trim() || 'Sesión rápida' }),
    onSuccess: conservarSesionIniciada,
  });
  const inicioRutina = useMutation({
    mutationFn: (rutina: Routine) => startRoutine(rutina.id),
    onSuccess: conservarSesionIniciada,
  });
  const borradoRutina = useMutation({
    mutationFn: (rutina: Routine) => deleteRoutine(rutina.id),
    onSuccess: async () => {
      if (accountId) {
        await queryClient.invalidateQueries({ queryKey: trainingKeys.routines(accountId) });
      }
    },
  });

  function iniciarRapida() {
    inicioRutina.reset();
    borradoRutina.reset();
    if (!inicioRapido.isPending) inicioRapido.mutate();
  }

  function iniciarRutina(rutina: Routine) {
    inicioRapido.reset();
    borradoRutina.reset();
    if (!inicioRutina.isPending) inicioRutina.mutate(rutina);
  }

  function eliminarRutina(rutina: Routine) {
    if (!confirm(`¿Eliminar rutina "${rutina.name}"?`)) return;
    inicioRapido.reset();
    inicioRutina.reset();
    if (!borradoRutina.isPending) borradoRutina.mutate(rutina);
  }

  const listaEntrenamientos = entrenamientos.data ?? [];
  const rutinas = rutinasRemotas.data ?? [];
  const activo = listaEntrenamientos.find((workout) => workout.status === 'ACTIVE');
  const finalizados = listaEntrenamientos.filter((workout) => workout.status === 'COMPLETED');
  const iniciandoRutinaId = inicioRutina.isPending ? inicioRutina.variables.id : null;
  const errorMutacion = inicioRapido.error ?? inicioRutina.error ?? borradoRutina.error;
  const errorInicio = errorMutacion
    ? errorMutacion instanceof ApiError
      ? errorMutacion.message
      : 'No se pudo completar la acción. Inténtalo de nuevo.'
    : null;
  const rutinasPorDia: (Routine | null)[] = Array.from({ length: 7 }, (_, i) => {
    return rutinas.find((r) => r.dayOfWeek === i) ?? null;
  });
  const rutinasSinDia = rutinas.filter((r) => r.dayOfWeek === null);

  return (
    <div className="space-y-lg">
      {errorInicio && (
        <div role="alert" className="flex items-start gap-sm rounded-lg border border-error/30 bg-error/10 p-md text-sm text-error">
          <Icon name="error" size={18} />
          <span>{errorInicio}</span>
        </div>
      )}
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Entrenamientos</h1>
        <p className="font-body-md text-on-surface-variant">
          Inicia, continúa o gestiona tus rutinas.
        </p>
      </header>
      {entrenamientos.isError && (
        <p role="alert" className="text-sm text-error">
          No pudimos cargar los entrenamientos.{' '}
          <button type="button" onClick={() => void entrenamientos.refetch()} className="underline">Reintentar entrenamientos</button>
        </p>
      )}
      {entrenamientos.isPending && <p role="status" className="text-sm text-on-surface-variant">Cargando entrenamientos…</p>}

      {activo && (
        <div className="bg-surface-container rounded-xl p-md border border-primary/30 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between gap-md">
            <div>
              <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-xs block">
                Sesión activa
              </span>
              <h2 className="font-headline-md text-on-surface">{activo.name}</h2>
            </div>
            <Link href={`/workout/${activo.id}`}>
              <Button size="lg">
                <Icon name="play_arrow" size={20} />
                Continuar
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-xs bg-surface-container-low rounded-lg p-1 border border-white/5">
        {([
          { id: 'rutinas', etiqueta: 'Mis rutinas', icono: 'calendar_view_week' },
          { id: 'rapida', etiqueta: 'Sesión rápida', icono: 'flash_on' },
          { id: 'historial', etiqueta: 'Historial', icono: 'history' },
        ] as { id: Pestana; etiqueta: string; icono: string }[]).map((p) => {
          const activa = pestana === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-xs py-sm px-md rounded-md font-grotesk text-label-caps tracking-wider uppercase transition-all',
                activa
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <Icon name={p.icono} size={16} fill={activa} />
              <span className="hidden sm:inline">{p.etiqueta}</span>
            </button>
          );
        })}
      </div>

      {/* Mis rutinas */}
      {pestana === 'rutinas' && (
        <div className="space-y-md">
          {rutinasRemotas.isError && (
            <p role="alert" className="text-sm text-error">
              No pudimos cargar las rutinas.{' '}
              <button type="button" onClick={() => void rutinasRemotas.refetch()} className="underline">Reintentar rutinas</button>
            </p>
          )}
          {rutinasRemotas.isPending && <p role="status" className="text-sm text-on-surface-variant">Cargando rutinas…</p>}
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Por día de la semana</h2>
            <Link href="/workout/routines/new">
              <Button size="sm">
                <Icon name="add" size={16} />
                Crear rutina
              </Button>
            </Link>
          </div>

          {rutinasRemotas.data && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {rutinasPorDia.map((rutina, dia) => (
              <TarjetaDia
                key={dia}
                dia={DIAS_SEMANA[dia]}
                rutina={rutina}
                onIniciar={iniciarRutina}
                onEliminar={eliminarRutina}
                iniciando={rutina ? iniciandoRutinaId === rutina.id : false}
              />
            ))}
          </div>}

          {rutinasSinDia.length > 0 && (
            <div className="space-y-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mt-lg">Sin día asignado</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {rutinasSinDia.map((r) => (
                  <TarjetaRutina
                    key={r.id}
                    rutina={r}
                    onIniciar={iniciarRutina}
                    onEliminar={eliminarRutina}
                    iniciando={iniciandoRutinaId === r.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sesión rápida */}
      {pestana === 'rapida' && (
        <div className="bg-surface-container rounded-xl p-lg border border-white/5">
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mb-md block">
            Sesión libre
          </span>
          <p className="font-body-md text-on-surface-variant text-sm mb-md">
            Inicia una sesión sin rutina pre-definida. Agregas ejercicios sobre la marcha.
          </p>
          <div className="flex flex-col md:flex-row gap-sm">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la sesión"
              icon="edit"
            />
            <Button onClick={iniciarRapida} loading={inicioRapido.isPending} size="lg" className="md:w-48">
              <Icon name="play_arrow" />
              Iniciar
            </Button>
          </div>
        </div>
      )}

      {/* Historial */}
      {pestana === 'historial' && (
        <div className="space-y-md">
          {entrenamientos.isError && !entrenamientos.data ? (
            <div className="rounded-xl border border-error/20 bg-error/5 p-lg text-center text-sm text-error">
              El historial no está disponible hasta recuperar la conexión.
            </div>
          ) : finalizados.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl border border-white/5 p-lg text-center">
              <Icon name="history" size={32} className="text-on-surface-variant mb-sm" />
              <p className="font-body-md text-on-surface-variant">Sin historial aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {finalizados.map((entrenamiento) => {
                const volumen = entrenamiento.sets
                  .filter((s) => !s.isWarmup)
                  .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
                return (
                  <Link
                    key={entrenamiento.id}
                    href={`/workout/${entrenamiento.id}`}
                    className="bg-surface-container-low rounded-xl p-md border border-white/5 hover:border-primary/40 transition-colors group"
                  >
                    <div className="flex justify-between items-baseline mb-sm">
                      <h3 className="font-headline-md text-lg text-on-surface group-hover:text-primary transition">
                        {entrenamiento.name}
                      </h3>
                      <span className="font-grotesk text-[10px] text-on-surface-variant tracking-wider">
                        {formatearFechaHora(entrenamiento.startedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-md">
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Icon name="format_list_numbered" size={14} /> {entrenamiento.sets.length} series
                      </span>
                      {volumen > 0 && (
                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          <Icon name="weight" size={14} /> {Math.round(volumen).toLocaleString('es-CO')} kg
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TarjetaDia({
  dia,
  rutina,
  onIniciar,
  onEliminar,
  iniciando,
}: {
  dia: string;
  rutina: Routine | null;
  onIniciar: (r: Routine) => void;
  onEliminar: (r: Routine) => void;
  iniciando: boolean;
}) {
  if (!rutina) {
    return (
      <Link
        href={`/workout/routines/new?day=${DIAS_SEMANA.indexOf(dia)}`}
        className="bg-surface-container-low rounded-xl p-md border border-dashed border-white/10 hover:border-primary/40 transition-colors flex flex-col items-center justify-center min-h-[140px] text-on-surface-variant hover:text-primary"
      >
        <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase mb-xs">{dia}</span>
        <Icon name="add_circle" size={32} className="opacity-60" />
        <span className="font-body-md text-sm mt-xs">Crear rutina</span>
      </Link>
    );
  }
  return (
    <TarjetaRutina rutina={rutina} dia={dia} onIniciar={onIniciar} onEliminar={onEliminar} iniciando={iniciando} />
  );
}

function TarjetaRutina({
  rutina,
  dia,
  onIniciar,
  onEliminar,
  iniciando,
}: {
  rutina: Routine;
  dia?: string;
  onIniciar: (r: Routine) => void;
  onEliminar: (r: Routine) => void;
  iniciando: boolean;
}) {
  return (
    <div className="bg-surface-container rounded-xl p-md border border-white/5 flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <div>
          {dia && (
            <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary block">
              {dia}
            </span>
          )}
          <h3 className="font-headline-md text-lg text-on-surface mt-xs">{rutina.name}</h3>
          <p className="font-body-md text-xs text-on-surface-variant mt-xs">
            {rutina.exercises.length} ejercicio{rutina.exercises.length === 1 ? '' : 's'} ·{' '}
            {rutina.exercises.reduce((a, e) => a + e.targetSets, 0)} series
          </p>
        </div>
        <div className="flex gap-xs">
          <Link href={`/workout/routines/${rutina.id}`}>
            <button aria-label={`Editar rutina ${rutina.name}`} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant flex items-center justify-center">
              <Icon name="edit" size={16} />
            </button>
          </Link>
          <button
            onClick={() => onEliminar(rutina)}
            aria-label={`Eliminar rutina ${rutina.name}`}
            className="w-8 h-8 rounded-lg bg-error/10 hover:bg-error/20 text-error flex items-center justify-center"
          >
            <Icon name="delete" size={16} />
          </button>
        </div>
      </div>
      <ul className="text-xs text-on-surface-variant space-y-px">
        {rutina.exercises.slice(0, 4).map((e) => (
          <li key={e.id}>
             · {e.exercise ? traducirNombreEjercicio(e.exercise.name) : 'Ejercicio'}{' '}
             <span className="text-outline">({e.targetSets} × {e.targetReps ?? '—'})</span>
          </li>
        ))}
        {rutina.exercises.length > 4 && (
          <li className="text-outline">+ {rutina.exercises.length - 4} más</li>
        )}
      </ul>
      <Button onClick={() => onIniciar(rutina)} disabled={iniciando} loading={iniciando} className="w-full mt-sm" size="md">
        <Icon name="play_arrow" />
        {iniciando ? 'Iniciando…' : 'Empezar rutina'}
      </Button>
    </div>
  );
}
