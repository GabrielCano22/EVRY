'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { AppShell } from '@/components/AppShell';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  const { usuario, cargando, inicializar } = useAutenticacion();
  const router = useRouter();
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    inicializar().finally(() => setIntentado(true));
  }, [inicializar]);

  useEffect(() => {
    if (intentado && !usuario) router.replace('/login');
  }, [usuario, intentado, router]);

  if (!intentado || cargando || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center text-outline font-grotesk text-label-caps tracking-widest">
        Cargando…
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
