'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { Meta, Usuario } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const etiquetasMeta: Record<Meta, { etiqueta: string; icono: string }> = {
  STRENGTH: { etiqueta: 'Fuerza', icono: 'fitness_center' },
  HYPERTROPHY: { etiqueta: 'Hipertrofia', icono: 'exercise' },
  ENDURANCE: { etiqueta: 'Resistencia', icono: 'directions_run' },
  FAT_LOSS: { etiqueta: 'Pérdida de grasa', icono: 'local_fire_department' },
  GENERAL_FITNESS: { etiqueta: 'Condición física general', icono: 'favorite' },
  MOBILITY: { etiqueta: 'Movilidad', icono: 'self_improvement' },
};

export default function PaginaPerfil() {
  const { usuario, recargarUsuario, cerrarSesion } = useAutenticacion();
  const router = useRouter();
  const [datos, setDatos] = useState<Partial<Usuario>>({
    name: usuario?.name,
    biologicalSex: usuario?.biologicalSex,
    goals: usuario?.goals ?? [],
    trackCycle: usuario?.trackCycle,
    avgCycleLen: usuario?.avgCycleLen ?? 28,
    avgPeriodLen: usuario?.avgPeriodLen ?? 5,
  });
  const [guardando, setGuardando] = useState(false);

  function alternarMeta(meta: Meta) {
    setDatos((d) => ({
      ...d,
      goals: d.goals?.includes(meta)
        ? d.goals.filter((m) => m !== meta)
        : [...(d.goals ?? []), meta],
    }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api('/users/me', { method: 'PATCH', json: datos });
      await recargarUsuario();
    } finally {
      setGuardando(false);
    }
  }

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  if (!usuario) return null;

  return (
    <div className="space-y-lg max-w-2xl">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Perfil</h1>
        <p className="font-body-md text-on-surface-variant">{usuario.email}</p>
      </header>

      <div className="bg-surface-container-low rounded-xl p-lg border border-white/5 space-y-md">
        <h2 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
          Datos personales
        </h2>
        <Input
          label="Nombre"
          icon="person"
          value={datos.name ?? ''}
          onChange={(e) => setDatos({ ...datos, name: e.target.value })}
        />
      </div>

      <div className="bg-surface-container-low rounded-xl p-lg border border-white/5">
        <h2 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mb-md">
          Metas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
          {(Object.keys(etiquetasMeta) as Meta[]).map((m) => {
            const activa = datos.goals?.includes(m);
            return (
              <button
                key={m}
                onClick={() => alternarMeta(m)}
                className={cn(
                  'flex flex-col items-center justify-center py-md px-sm rounded-lg border transition-all',
                  activa
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/10 bg-surface-container text-on-surface-variant hover:border-white/30',
                )}
              >
                <Icon name={etiquetasMeta[m].icono} fill={activa} className="mb-xs" />
                <span className="font-grotesk text-[10px] text-center tracking-wider">
                  {etiquetasMeta[m].etiqueta}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {datos.biologicalSex === 'FEMALE' && (
        <div className="bg-surface-container-low rounded-xl p-lg border border-white/5 space-y-md">
          <div className="flex items-center gap-sm">
            <Icon name="cyclone" className="text-tertiary" />
            <h2 className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
              Seguimiento del ciclo
            </h2>
          </div>
          <label className="flex items-center justify-between py-sm cursor-pointer">
            <span className="font-body-lg text-[17px] text-on-surface">Activar seguimiento</span>
            <span
              className={cn(
                'relative w-14 h-7 rounded-full flex items-center p-1 transition-colors',
                datos.trackCycle ? 'bg-primary' : 'bg-surface-container-high',
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full bg-on-primary shadow-sm transform transition-transform',
                  datos.trackCycle ? 'translate-x-7' : 'translate-x-0',
                )}
              ></span>
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={datos.trackCycle}
              onChange={(e) => setDatos({ ...datos, trackCycle: e.target.checked })}
            />
          </label>
          {datos.trackCycle && (
            <div className="grid grid-cols-2 gap-md">
              <Input
                label="Ciclo (días)"
                icon="calendar_month"
                type="number"
                min={20}
                max={45}
                value={datos.avgCycleLen ?? 28}
                onChange={(e) => setDatos({ ...datos, avgCycleLen: Number(e.target.value) })}
              />
              <Input
                label="Período (días)"
                icon="water_drop"
                type="number"
                min={2}
                max={10}
                value={datos.avgPeriodLen ?? 5}
                onChange={(e) => setDatos({ ...datos, avgPeriodLen: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}

      <Button onClick={guardar} loading={guardando} className="w-full" size="lg">
        <Icon name="save" />
        Guardar cambios
      </Button>

      <Button onClick={salir} variant="danger" className="w-full" size="md">
        <Icon name="logout" />
        Cerrar sesión
      </Button>
    </div>
  );
}
