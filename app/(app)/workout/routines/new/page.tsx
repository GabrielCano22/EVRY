'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorRutina } from '@/components/EditorRutina';

function NuevaRutinaInner() {
  const router = useRouter();
  const params = useSearchParams();
  const diaInicial = params.get('day');
  const [dia] = useState<number | null>(diaInicial ? Number(diaInicial) : null);

  return (
    <EditorRutina
      diaInicial={dia}
      titulo="Nueva rutina"
      onListo={() => router.push('/workout')}
      onCancelar={() => router.back()}
    />
  );
}

export default function PaginaNuevaRutina() {
  return (
    <Suspense fallback={<p className="text-on-surface-variant">Cargando…</p>}>
      <NuevaRutinaInner />
    </Suspense>
  );
}
