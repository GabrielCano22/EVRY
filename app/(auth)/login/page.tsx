'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAutenticacion } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

export default function PaginaIngreso() {
  const router = useRouter();
  const { ingresar, cargando, error } = useAutenticacion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    try {
      await ingresar(email, password);
      router.push('/dashboard');
    } catch {}
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-container-padding">
      <div className="w-full max-w-md">
        <div className="text-center mb-xl">
          <h1 className="font-lexend italic font-bold text-3xl text-white mb-xs">EVRY</h1>
          <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant">
            Rendimiento Élite
          </p>
        </div>
        <form
          onSubmit={manejarEnvio}
          className="space-y-md bg-surface-container-low border border-white/5 rounded-xl p-lg"
        >
          <div className="mb-md">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
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
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-md flex items-start gap-sm">
              <Icon name="error" className="text-error mt-px" size={18} />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
          <Button type="submit" loading={cargando} className="w-full" size="lg">
            <span>Ingresar</span>
            <Icon name="arrow_forward" size={18} />
          </Button>
          <p className="font-body-md text-sm text-on-surface-variant text-center pt-sm">
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Crear una
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
