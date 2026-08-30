'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

const EMAIL_RECORDADO_KEY = 'evry_email_recordado';

export default function PaginaIngreso() {
  const router = useRouter();
  const { ingresar, cargando, error } = useAutenticacion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarUsuario, setRecordarUsuario] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    const emailGuardado = window.localStorage.getItem(EMAIL_RECORDADO_KEY);
    if (emailGuardado) {
      setEmail(emailGuardado);
      setRecordarUsuario(true);
    }
  }, []);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);
    try {
      await ingresar(email.trim(), password);
      if (recordarUsuario) {
        window.localStorage.setItem(EMAIL_RECORDADO_KEY, email.trim());
      } else {
        window.localStorage.removeItem(EMAIL_RECORDADO_KEY);
      }
      router.push('/dashboard');
    } catch (causa) {
      setErrorLocal(causa instanceof Error ? causa.message : 'No se pudo ingresar. Inténtalo de nuevo.');
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-container-padding py-xl">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-md animate-rise">
        <div className="mb-md flex items-center justify-between">
          <Link
            href="/"
            aria-label="Volver al menú principal"
            className="inline-flex items-center gap-xs rounded-lg px-sm py-xs text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon name="arrow_back" size={18} />
            Volver al menú
          </Link>
          <span className="font-grotesk text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Acceso seguro
          </span>
        </div>

        <div className="mb-lg text-center">
          <h1 className="mb-xs font-lexend text-3xl font-bold italic text-white">EVRY</h1>
          <p className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-on-surface-variant">
            Rendimiento Élite
          </p>
        </div>

        <form
          onSubmit={manejarEnvio}
          className="space-y-md rounded-2xl border border-white/10 bg-surface-container-low/95 p-lg shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          <div className="mb-md">
            <h2 className="mb-xs font-headline-md text-headline-md text-on-surface">
              Bienvenida de vuelta
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Sigue donde lo dejaste.
            </p>
          </div>

          <Input
            label="Correo electrónico"
            icon="mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
          <Input
            label="Contraseña"
            icon="lock"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
          />

          <label className="flex cursor-pointer items-center gap-sm text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={recordarUsuario}
              onChange={(evento) => setRecordarUsuario(evento.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-surface-container accent-primary focus:ring-2 focus:ring-primary/50"
            />
            <span>Recordar usuario en este dispositivo</span>
          </label>

          {(error ?? errorLocal) && (
            <div role="alert" className="flex items-start gap-sm rounded-lg border border-error/30 bg-error/10 p-md">
              <Icon name="error" className="mt-px text-error" size={18} />
              <p className="text-sm text-error">{error ?? errorLocal}</p>
            </div>
          )}

          <Button type="submit" loading={cargando} className="w-full" size="lg">
            <span>Ingresar</span>
            <Icon name="arrow_forward" size={18} />
          </Button>

          <p className="pt-sm text-center font-body-md text-sm text-on-surface-variant">
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Crear una
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
