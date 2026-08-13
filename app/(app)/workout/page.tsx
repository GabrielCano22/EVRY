'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Entrenamiento, Rutina } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { formatearFechaHora, cn } from '@/lib/utils';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Pestana = 'rutinas' | 'rapida' | 'historial';

export default function ListaEntrenamientos() {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>('rutinas');
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [nombre, setNombre] = useState('Sesión rápida');
  const [creando, setCreando] = useState(false);

  async function cargar() {
    const [ent, rut] = await Promise.all([
      api<Entrenamiento[]>('/workouts').catch(() => []),
      api<Rutina[]>('/routines').catch(() => []),
    ]);
    setEntrenamientos(ent);
    setRutinas(rut);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function iniciarRapida() {
    setCreando(true);
    try {
      const nuevo = await api<Entrenamiento>('/workouts', {
        method: 'POST',
        json: { name: nombre },
      });
      router.push(`/workout/${nuevo.id}`);
    } finally {
      setCreando(false);
    }
  }

  async function iniciarRutina(rutina: Rutina) {
    const nuevo = await api<Entrenamiento>(`/routines/${rutina.id}/start`, { method: 'POST' });
    router.push(`/workout/${nuevo.id}`);
  }

  async function eliminarRutina(rutina: Rutina) {
    if (!confirm(`¿Eliminar rutina "${rutina.name}"?`)) return;
    await api(`/routines/${rutina.id}`, { method: 'DELETE' });
    cargar();
  }

  const activo = entrenamientos.find((e) => !e.endedAt);
  const finalizados = entrenamientos.filter((e) => e.endedAt);
  const rutinasPorDia: (Rutina | null)[] = Array.from({ length: 7 }, (_, i) => {
    return rutinas.find((r) => r.dayOfWeek === i) ?? null;
  });
  const rutinasSinDia = rutinas.filter((r) => r.dayOfWeek === null);

  return (
    <div className="space-y-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Entrenamientos</h1>
        <p className="font-body-md text-on-surface-variant">
          Inicia, continúa o gestiona tus rutinas.
        </p>
      </header>

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
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Por día de la semana</h2>
            <Link href="/workout/routines/new">
              <Button size="sm">
                <Icon name="add" size={16} />
                Crear rutina
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {rutinasPorDia.map((rutina, dia) => (
              <TarjetaDia
                key={dia}
                dia={DIAS_SEMANA[dia]}
                rutina={rutina}
                onIniciar={iniciarRutina}
                onEliminar={eliminarRutina}
              />
            ))}
          </div>

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
            <Button onClick={iniciarRapida} loading={creando} size="lg" className="md:w-48">
              <Icon name="play_arrow" />
              Iniciar
            </Button>
          </div>
        </div>
      )}

      {/* Historial */}
      {pestana === 'historial' && (
        <div className="space-y-md">
          {finalizados.length === 0 ? (
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
}: {
  dia: string;
  rutina: Rutina | null;
  onIniciar: (r: Rutina) => void;
  onEliminar: (r: Rutina) => void;
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
    <TarjetaRutina rutina={rutina} dia={dia} onIniciar={onIniciar} onEliminar={onEliminar} />
  );
}

function TarjetaRutina({
  rutina,
  dia,
  onIniciar,
  onEliminar,
}: {
  rutina: Rutina;
  dia?: string;
  onIniciar: (r: Rutina) => void;
  onEliminar: (r: Rutina) => void;
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
            <button className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant flex items-center justify-center">
              <Icon name="edit" size={16} />
            </button>
          </Link>
          <button
            onClick={() => onEliminar(rutina)}
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
      <Button onClick={() => onIniciar(rutina)} className="w-full mt-sm" size="md">
        <Icon name="play_arrow" />
        Empezar rutina
      </Button>
    </div>
  );
}
