'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { AppShell } from '@/components/AppShell';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { usuario, estado, inicializar } = useAutenticacion();
  const router = useRouter();
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    inicializar().finally(() => setIntentado(true));
  }, [inicializar]);

  useEffect(() => {
    if (intentado && estado === 'anonymous') router.replace('/login');
  }, [estado, intentado, router]);

  if (!intentado || estado === 'checking') {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-outline font-grotesk text-label-caps tracking-widest">
        Cargando…
      </div>
    );
  }
  if (estado === 'error' && !usuario) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-md px-container-padding text-center">
        <p role="alert" className="text-on-surface">No pudimos comprobar tu sesión. Conservamos tus datos y puedes reintentar.</p>
        <button type="button" onClick={() => inicializar()} className="rounded-lg bg-primary px-md py-sm text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Reintentar
        </button>
      </main>
    );
  }
  if (estado === 'error' && usuario) {
    return (
      <AppShell>
        <div role="alert" className="mx-container-padding mt-md rounded-lg border border-error/30 bg-error/10 p-sm text-sm text-on-surface">
          No pudimos actualizar tu sesión. Mostramos la información conocida; puedes reintentar más tarde.
        </div>
        {children}
      </AppShell>
    );
  }
  if (!usuario) return null;
  return <AppShell>{children}</AppShell>;
}
