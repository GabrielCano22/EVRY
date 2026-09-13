'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { updateCurrentUser } from '@/lib/auth-api';
import type { UpdatedUser, User, UserUpdateInput } from '@/lib/auth-api';
import { useAutenticacion } from '@/lib/auth-store';
import type { Meta } from '@/lib/types';
import { cn } from '@/lib/utils';

const etiquetasMeta: Record<Meta, { etiqueta: string; icono: string }> = {
  STRENGTH: { etiqueta: 'Fuerza', icono: 'fitness_center' },
  HYPERTROPHY: { etiqueta: 'Hipertrofia', icono: 'exercise' },
  ENDURANCE: { etiqueta: 'Resistencia', icono: 'directions_run' },
  FAT_LOSS: { etiqueta: 'Pérdida de grasa', icono: 'local_fire_department' },
  GENERAL_FITNESS: { etiqueta: 'Condición física general', icono: 'favorite' },
  MOBILITY: { etiqueta: 'Movilidad', icono: 'self_improvement' },
};

type SexoPerfil = NonNullable<UserUpdateInput['biologicalSex']>;
type DatosPerfil = {
  name: NonNullable<UserUpdateInput['name']>;
  biologicalSex: SexoPerfil;
  birthDate: string;
  goals: NonNullable<UserUpdateInput['goals']>;
  trackCycle: NonNullable<UserUpdateInput['trackCycle']>;
  avgCycleLen: NonNullable<UserUpdateInput['avgCycleLen']>;
  avgPeriodLen: NonNullable<UserUpdateInput['avgPeriodLen']>;
};

const opcionesSexo: Array<{ valor: SexoPerfil; etiqueta: string }> = [
  { valor: 'FEMALE', etiqueta: 'Femenino' },
  { valor: 'MALE', etiqueta: 'Masculino' },
  { valor: 'OTHER', etiqueta: 'Otro' },
  { valor: 'PREFER_NOT_SAY', etiqueta: 'Prefiero no decir' },
];

function datosDesdeUsuario(usuario: User | UpdatedUser): DatosPerfil {
  return {
    name: usuario.name,
    biologicalSex: usuario.biologicalSex,
    birthDate: usuario.birthDate?.slice(0, 10) ?? '',
    goals: usuario.goals,
    trackCycle: usuario.trackCycle,
    avgCycleLen: usuario.avgCycleLen,
    avgPeriodLen: usuario.avgPeriodLen,
  };
}

function entradaActualizacion(datos: DatosPerfil): UserUpdateInput {
  const input: UserUpdateInput = {
    name: datos.name,
    biologicalSex: datos.biologicalSex,
    goals: datos.goals,
    trackCycle: datos.trackCycle,
    avgCycleLen: datos.avgCycleLen,
    avgPeriodLen: datos.avgPeriodLen,
  };
  if (datos.birthDate) input.birthDate = datos.birthDate;
  return input;
}

export default function PaginaPerfil() {
  const usuario = useAutenticacion((state) => state.usuario);
  if (!usuario) return null;
  return <FormularioPerfil key={usuario.id} usuario={usuario} />;
}

function FormularioPerfil({ usuario }: { usuario: User }) {
  const aplicarUsuarioActualizado = useAutenticacion((state) => state.aplicarUsuarioActualizado);
  const cerrarSesion = useAutenticacion((state) => state.cerrarSesion);
  const router = useRouter();
  const [datos, setDatos] = useState<DatosPerfil>(() => datosDesdeUsuario(usuario));
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const guardado = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updated) => {
      aplicarUsuarioActualizado(updated);
      setDatos(datosDesdeUsuario(updated));
      setConfirmacionVisible(true);
    },
  });

  const errorApi = guardado.error instanceof ApiError ? guardado.error : undefined;
  const erroresCampos = errorApi?.fieldErrors;

  function alternarMeta(meta: Meta) {
    setDatos((actual) => ({
      ...actual,
      goals: actual.goals.includes(meta)
        ? actual.goals.filter((goal) => goal !== meta)
        : [...actual.goals, meta],
    }));
  }

  function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardado.isPending) return;
    setConfirmacionVisible(false);
    guardado.mutate(entradaActualizacion(datos));
  }

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <form onSubmit={guardar} className="max-w-2xl space-y-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Perfil</h1>
        <p className="font-body-md text-on-surface-variant">{usuario.email}</p>
      </header>

      <section className="space-y-md rounded-xl border border-white/5 bg-surface-container-low p-lg">
        <h2 className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-on-surface-variant">
          Datos personales
        </h2>
        <Input
          label="Nombre"
          icon="person"
          required
          value={datos.name}
          onChange={(evento) => setDatos((actual) => ({ ...actual, name: evento.target.value }))}
          error={erroresCampos?.name?.[0]}
        />
        <label className="block w-full" htmlFor="sexo-registrado">
          <span className="mb-sm block font-label-caps text-label-caps uppercase tracking-widest text-primary">
            Sexo registrado
          </span>
          <select
            id="sexo-registrado"
            required
            value={datos.biologicalSex}
            onChange={(evento) => setDatos((actual) => ({
              ...actual,
              biologicalSex: evento.target.value as SexoPerfil,
            }))}
            aria-invalid={Boolean(erroresCampos?.biologicalSex)}
            className={cn(
              'w-full rounded-lg border border-white/10 bg-surface-container px-md py-sm font-lexend text-body-md text-on-surface outline-none focus:ring-1 focus:ring-primary',
              erroresCampos?.biologicalSex && 'ring-1 ring-error',
            )}
          >
            {opcionesSexo.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
          {erroresCampos?.biologicalSex?.[0] && (
            <span className="mt-1 block text-xs text-error">{erroresCampos.biologicalSex[0]}</span>
          )}
        </label>
        <Input
          label="Fecha de nacimiento"
          icon="calendar_month"
          type="date"
          value={datos.birthDate}
          onChange={(evento) => setDatos((actual) => ({ ...actual, birthDate: evento.target.value }))}
          error={erroresCampos?.birthDate?.[0]}
        />
      </section>

      <fieldset className="rounded-xl border border-white/5 bg-surface-container-low p-lg">
        <legend className="mb-md font-grotesk text-label-caps uppercase tracking-[0.18em] text-on-surface-variant">
          Metas
        </legend>
        <div className="grid grid-cols-2 gap-sm md:grid-cols-3">
          {(Object.keys(etiquetasMeta) as Meta[]).map((meta) => {
            const activa = datos.goals.includes(meta);
            return (
              <button
                type="button"
                key={meta}
                aria-pressed={activa}
                onClick={() => alternarMeta(meta)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border px-sm py-md transition-all',
                  activa
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/10 bg-surface-container text-on-surface-variant hover:border-white/30',
                )}
              >
                <Icon name={etiquetasMeta[meta].icono} fill={activa} className="mb-xs" />
                <span className="text-center font-grotesk text-[10px] tracking-wider">
                  {etiquetasMeta[meta].etiqueta}
                </span>
              </button>
            );
          })}
        </div>
        {erroresCampos?.goals?.[0] && (
          <p className="mt-sm text-xs text-error">{erroresCampos.goals[0]}</p>
        )}
      </fieldset>

      <section className="space-y-md rounded-xl border border-white/5 bg-surface-container-low p-lg">
        <div className="flex items-center gap-sm">
          <Icon name="cyclone" className="text-tertiary" />
          <h2 className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-on-surface-variant">
            Seguimiento del ciclo
          </h2>
        </div>
        <label className="flex cursor-pointer items-center justify-between py-sm">
          <span className="font-body-lg text-[17px] text-on-surface">Activar seguimiento</span>
          <span
            className={cn(
              'relative flex h-7 w-14 items-center rounded-full p-1 transition-colors',
              datos.trackCycle ? 'bg-primary' : 'bg-surface-container-high',
            )}
          >
            <span
              className={cn(
                'h-5 w-5 transform rounded-full bg-on-primary shadow-sm transition-transform',
                datos.trackCycle ? 'translate-x-7' : 'translate-x-0',
              )}
            />
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={datos.trackCycle}
            onChange={(evento) => setDatos((actual) => ({ ...actual, trackCycle: evento.target.checked }))}
          />
        </label>
        {erroresCampos?.trackCycle?.[0] && (
          <p className="text-xs text-error">{erroresCampos.trackCycle[0]}</p>
        )}
        {datos.trackCycle ? (
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="Ciclo (días)"
              icon="calendar_month"
              type="number"
              min={20}
              max={45}
              required
              value={datos.avgCycleLen}
              onChange={(evento) => setDatos((actual) => ({
                ...actual,
                avgCycleLen: Number(evento.target.value),
              }))}
              error={erroresCampos?.avgCycleLen?.[0]}
            />
            <Input
              label="Período (días)"
              icon="water_drop"
              type="number"
              min={2}
              max={10}
              required
              value={datos.avgPeriodLen}
              onChange={(evento) => setDatos((actual) => ({
                ...actual,
                avgPeriodLen: Number(evento.target.value),
              }))}
              error={erroresCampos?.avgPeriodLen?.[0]}
            />
          </div>
        ) : null}
      </section>

      {guardado.isError ? (
        <div role="alert" className="flex items-start gap-sm rounded-lg border border-error/30 bg-error/10 p-md">
          <Icon name="error" className="mt-px text-error" size={18} />
          <p className="text-sm text-error">
            {errorApi?.message ?? 'No se pudieron guardar los cambios. Inténtalo de nuevo.'}
          </p>
        </div>
      ) : null}
      {confirmacionVisible ? (
        <p role="status" aria-live="polite" className="text-sm text-primary">Cambios guardados.</p>
      ) : null}

      <Button type="submit" loading={guardado.isPending} className="w-full" size="lg">
        <Icon name="save" />
        Guardar cambios
      </Button>

      <Button type="button" onClick={salir} variant="danger" className="w-full" size="md">
        <Icon name="logout" />
        Cerrar sesión
      </Button>
    </form>
  );
}
