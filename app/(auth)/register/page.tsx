'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAutenticacion } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import type { Sexo } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PaginaRegistro() {
  const router = useRouter();
  const { registrar, cargando, error } = useAutenticacion();
  const [datos, setDatos] = useState({
    email: '',
    password: '',
    nombre: '',
    sexoBiologico: '' as Sexo | '',
    seguirCiclo: false,
  });
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!datos.sexoBiologico) {
      setErrorLocal('Selecciona una opción de sexo biológico.');
      return;
    }
    if (datos.password.length < 8) {
      setErrorLocal('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await registrar({
        email: datos.email,
        password: datos.password,
        name: datos.nombre,
        biologicalSex: datos.sexoBiologico,
        trackCycle: datos.seguirCiclo,
      });
      router.push('/dashboard');
    } catch {
      // error de zustand store ya seteado
    }
  }

  const opcionesSexo: { valor: Sexo; etiqueta: string; icono: string }[] = [
    { valor: 'FEMALE', etiqueta: 'Femenino', icono: 'female' },
    { valor: 'MALE', etiqueta: 'Masculino', icono: 'male' },
    { valor: 'OTHER', etiqueta: 'Otro', icono: 'transgender' },
  ];

  const mensajeError = errorLocal ?? error;

  return (
    <main className="min-h-screen px-container-padding py-xl flex flex-col max-w-md mx-auto w-full">
      <header className="flex justify-between items-center mb-xl">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
        >
          <Icon name="arrow_back" />
        </Link>
        <Link href="/" className="font-lexend italic font-bold text-xl text-white">
          EVRY
        </Link>
        <div className="w-10"></div>
      </header>

      <form onSubmit={manejarEnvio} className="flex flex-col flex-grow space-y-md">
        <div className="mb-md">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Crea tu cuenta</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Toma 30 segundos. Tu sexo biológico calibra métricas base de metabolismo y recuperación.
          </p>
        </div>

        <div>
          <label className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm block">
            Sexo biológico
          </label>
          <div className="grid grid-cols-3 gap-gutter">
            {opcionesSexo.map((opcion) => {
              const activo = datos.sexoBiologico === opcion.valor;
              return (
                <button
                  type="button"
                  key={opcion.valor}
                  onClick={() =>
                    setDatos({
                      ...datos,
                      sexoBiologico: opcion.valor,
                      seguirCiclo: opcion.valor === 'FEMALE' ? datos.seguirCiclo : false,
                    })
                  }
                  className={cn(
                    'flex flex-col items-center justify-center py-md px-sm bg-surface-container rounded-xl transition-all',
                    activo ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-surface-container-high',
                  )}
                >
                  <Icon
                    name={opcion.icono}
                    fill={activo}
                    className={cn('mb-sm', activo ? 'text-primary' : 'text-outline')}
                    size={28}
                  />
                  <span
                    className={cn(
                      'font-grotesk text-label-caps tracking-wider uppercase',
                      activo ? 'text-primary' : 'text-on-surface-variant',
                    )}
                  >
                    {opcion.etiqueta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {datos.sexoBiologico === 'FEMALE' && (
          <div className="bg-surface-container rounded-xl overflow-hidden animate-fade-in">
            <div className="p-md flex items-start gap-sm">
              <div className="w-12 h-12 rounded-full bg-tertiary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="water_drop" fill className="text-tertiary" />
              </div>
              <div>
                <h2 className="font-headline-md text-[18px] text-on-surface leading-tight mb-xs">
                  Integración del ciclo
                </h2>
                <p className="font-body-md text-on-surface-variant text-sm">
                  Adapta intensidad y predice fluctuaciones de fuerza según tu fase hormonal.
                </p>
              </div>
            </div>
            <div className="p-md pt-0">
              <label className="flex items-center justify-between py-sm cursor-pointer">
                <span className="font-body-md text-on-surface">Activar seguimiento del ciclo</span>
                <span
                  className={cn(
                    'relative w-14 h-7 rounded-full flex items-center p-1 transition-colors',
                    datos.seguirCiclo ? 'bg-primary' : 'bg-surface-container-high',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full bg-on-primary shadow-sm transform transition-transform',
                      datos.seguirCiclo ? 'translate-x-7' : 'translate-x-0',
                    )}
                  ></span>
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={datos.seguirCiclo}
                  onChange={(evento) => setDatos({ ...datos, seguirCiclo: evento.target.checked })}
                />
              </label>
            </div>
          </div>
        )}

        <div className="space-y-md pt-sm">
          <Input
            label="Nombre"
            icon="person"
            required
            value={datos.nombre}
            onChange={(evento) => setDatos({ ...datos, nombre: evento.target.value })}
          />
          <Input
            label="Correo electrónico"
            icon="mail"
            type="email"
            required
            value={datos.email}
            onChange={(evento) => setDatos({ ...datos, email: evento.target.value })}
          />
          <Input
            label="Contraseña (mín. 8 caracteres)"
            icon="lock"
            type="password"
            minLength={8}
            required
            value={datos.password}
            onChange={(evento) => setDatos({ ...datos, password: evento.target.value })}
          />
        </div>

        {mensajeError && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-md flex items-start gap-sm">
            <Icon name="error" className="text-error mt-px" size={18} />
            <p className="text-sm text-error">{mensajeError}</p>
          </div>
        )}

        <Button type="submit" loading={cargando} className="w-full mt-md" size="lg">
          <span>Crear cuenta</span>
          <Icon name="arrow_forward" size={18} />
        </Button>

        <p className="text-center font-body-md text-sm text-on-surface-variant pb-md">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Ingresar
          </Link>
        </p>
      </form>
    </main>
  );
}
