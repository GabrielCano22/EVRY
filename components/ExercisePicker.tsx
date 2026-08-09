'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Ejercicio, GrupoMuscular } from '@/lib/types';
import { Input } from './ui/Input';
import { Icon } from './ui/Icon';
import { ExerciseMedia } from './ExerciseMedia';

const grupos: { valor: GrupoMuscular | 'TODOS'; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'CHEST', etiqueta: 'Pecho' },
  { valor: 'BACK', etiqueta: 'Espalda' },
  { valor: 'SHOULDERS', etiqueta: 'Hombros' },
  { valor: 'BICEPS', etiqueta: 'Bíceps' },
  { valor: 'TRICEPS', etiqueta: 'Tríceps' },
  { valor: 'FOREARMS', etiqueta: 'Antebrazos' },
  { valor: 'QUADS', etiqueta: 'Cuádriceps' },
  { valor: 'HAMSTRINGS', etiqueta: 'Isquios' },
  { valor: 'GLUTES', etiqueta: 'Glúteos' },
  { valor: 'CALVES', etiqueta: 'Pantorrillas' },
  { valor: 'CORE', etiqueta: 'Core' },
  { valor: 'CARDIO', etiqueta: 'Cardio' },
];

export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: Ejercicio) => void;
  onClose: () => void;
}) {
  const [lista, setLista] = useState<Ejercicio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<GrupoMuscular | 'TODOS'>('TODOS');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (busqueda.trim()) params.set('q', busqueda.trim());
      if (grupo !== 'TODOS') params.set('muscleGroup', grupo);
      setCargando(true);
      api<Ejercicio[]>(`/exercises?${params.toString()}`)
        .then(setLista)
        .catch(() => setLista([]))
        .finally(() => setCargando(false));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [busqueda, grupo]);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-2xl flex-col bg-background/95 p-lg backdrop-blur-lg">
      <header className="mb-md flex items-center justify-between">
        <div>
          <span className="font-grotesk text-label-caps tracking-[0.18em] text-primary">CATÁLOGO</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Elegir ejercicio</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar selector de ejercicios"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high"
        >
          <Icon name="close" />
        </button>
      </header>
      <Input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, músculo o equipo…"
        icon="search"
        autoFocus
      />
      <div className="-mx-lg flex gap-sm overflow-x-auto px-lg py-md">
        {grupos.map((g) => (
          <button
            key={g.valor}
            onClick={() => setGrupo(g.valor)}
            className={`whitespace-nowrap rounded-full border px-md py-xs font-grotesk text-label-caps tracking-wider transition-colors ${
              grupo === g.valor
                ? 'border-primary bg-primary text-on-primary'
                : 'border-white/10 bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {g.etiqueta}
          </button>
        ))}
      </div>
      <div className="mb-sm flex items-center justify-between text-xs text-on-surface-variant">
        <span>{cargando ? 'Cargando catálogo…' : `${lista.length} ejercicios disponibles`}</span>
        <span>GIF local · 180×180</span>
      </div>
      <ul className="flex-1 space-y-xs overflow-y-auto">
        {!cargando && lista.length === 0 && (
          <li className="rounded-lg border border-white/5 bg-surface-container-low p-lg text-center text-sm text-on-surface-variant">
            No encontramos ejercicios con esos filtros.
          </li>
        )}
        {lista.map((ejercicio) => (
          <li key={ejercicio.id}>
            <button
              onClick={() => onPick(ejercicio)}
              className="flex w-full items-center gap-md rounded-lg border border-white/5 bg-surface-container-low p-sm text-left transition-all hover:border-primary/40 hover:bg-surface-container"
            >
              <ExerciseMedia exercise={ejercicio} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-body-lg text-on-surface">{ejercicio.name}</p>
                <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant">
                  {ejercicio.target ?? ejercicio.muscleGroup} · {ejercicio.equipmentLabel ?? ejercicio.equipment}
                </p>
                {ejercicio.category && (
                  <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-outline">{ejercicio.category}</p>
                )}
              </div>
              {ejercicio.tags.length > 0 && (
                <div className="hidden gap-xs flex-wrap sm:flex">
                  {ejercicio.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-tertiary/20 px-xs py-px font-grotesk text-[9px] tracking-wider text-tertiary"
                    >
                      {tag.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
