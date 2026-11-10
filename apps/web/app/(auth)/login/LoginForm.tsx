'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { ApiError } from '@/lib/api';

const EMAIL_RECORDADO_KEY = 'evry_email_recordado';

export function LoginForm() {
  const router = useRouter();
  const { ingresar, cargando, error } = useAutenticacion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarUsuario, setRecordarUsuario] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    try {
      const emailGuardado = window.localStorage.getItem(EMAIL_RECORDADO_KEY);
      if (emailGuardado) {
        setEmail(emailGuardado);
        setRecordarUsuario(true);
      }
    } catch {
      // Remembering an email is optional; restricted storage must not block login.
    }
  }, []);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    if (cargando) return;
    setErrorLocal(null);
    setErroresCampos(undefined);
    try {
      const autenticado = await ingresar(email.trim(), password);
      if (!autenticado) return;
      try {
        if (recordarUsuario) window.localStorage.setItem(EMAIL_RECORDADO_KEY, email.trim());
        else window.localStorage.removeItem(EMAIL_RECORDADO_KEY);
      } catch {
        // Authentication succeeded independently of this non-credential preference.
      }
      router.push('/dashboard');
    } catch (causa) {
      if (causa instanceof ApiError) setErroresCampos(causa.fieldErrors);
      setErrorLocal(causa instanceof Error ? causa.message : 'No se pudo ingresar. Inténtalo de nuevo.');
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-md rounded-2xl border border-white/10 bg-surface-container-low/95 p-lg shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-md">
        <h2 className="mb-xs font-headline-md text-headline-md text-on-surface">Bienvenida de vuelta</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Sigue donde lo dejaste.</p>
      </div>
      <Input label="Correo electrónico" icon="mail" type="email" autoComplete="email" required
        value={email} onChange={evento => setEmail(evento.target.value)} error={erroresCampos?.email?.[0]} />
      <Input label="Contraseña" icon="lock" type="password" autoComplete="current-password" required
        value={password} onChange={evento => setPassword(evento.target.value)} error={erroresCampos?.password?.[0]} />
      <label className="flex cursor-pointer items-center gap-sm text-sm text-on-surface-variant">
        <input type="checkbox" checked={recordarUsuario} onChange={evento => setRecordarUsuario(evento.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-surface-container accent-primary focus:ring-2 focus:ring-primary/50" />
        <span>Recordar usuario en este dispositivo</span>
      </label>
      {(error ?? errorLocal) && (
        <div role="alert" className="flex items-start gap-sm rounded-lg border border-error/30 bg-error/10 p-md">
          <Icon name="error" className="mt-px text-error" size={18} />
          <p className="text-sm text-error">{error ?? errorLocal}</p>
        </div>
      )}
      <Button type="submit" loading={cargando} className="w-full" size="lg">
        <span>Ingresar</span><Icon name="arrow_forward" size={18} />
      </Button>
      <p className="pt-sm text-center font-body-md text-sm text-on-surface-variant">
        ¿Sin cuenta?{' '}<Link href="/register" className="text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Crear una</Link>
      </p>
    </form>
  );
}
