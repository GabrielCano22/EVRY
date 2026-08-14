'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Ejercicio, GrupoMuscular, PaginaEjercicios } from '@/lib/types';
import { Input } from './ui/Input';
import { Icon } from './ui/Icon';
import { ExerciseMedia } from './ExerciseMedia';
import {
  etiquetaEquipo,
  etiquetaGrupoMuscular,
  traducirCategoria,
  traducirEtiquetaEjercicio,
  traducirNombreEjercicio,
  traducirValorEjercicio,
} from '@/lib/exercise-i18n';

const TAMANO_PAGINA = 30;

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
  { valor: 'CORE', etiqueta: 'Zona media' },
  { valor: 'CARDIO', etiqueta: 'Cardio' },
];

export function ExercisePicker({
  onPick,
  onClose,
  idsExcluidos = [],
}: {
  onPick: (e: Ejercicio) => void;
  onClose: () => void;
  idsExcluidos?: string[];
}) {
  const [lista, setLista] = useState<Ejercicio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<GrupoMuscular | 'TODOS'>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const solicitudActual = useRef(0);

  const cargarPagina = useCallback(
    async (paginaSolicitada: number, acumular: boolean) => {
      const solicitud = ++solicitudActual.current;
      const params = new URLSearchParams({
        limit: String(TAMANO_PAGINA),
        page: String(paginaSolicitada),
      });
      if (busqueda.trim()) params.set('q', busqueda.trim());
      if (grupo !== 'TODOS') params.set('muscleGroup', grupo);

      if (acumular) setCargandoMas(true);
      else setCargando(true);

      try {
        const respuesta = await api<PaginaEjercicios>(`/exercises?${params.toString()}`);
        if (solicitud !== solicitudActual.current) return;

        setLista((actual) => {
          if (!acumular) return respuesta.items;
          const idsActuales = new Set(actual.map((ejercicio) => ejercicio.id));
          return [...actual, ...respuesta.items.filter((ejercicio) => !idsActuales.has(ejercicio.id))];
        });
        setPagina(respuesta.page);
        setTotal(respuesta.total);
        setHayMas(respuesta.hasMore);
      } catch {
        if (solicitud !== solicitudActual.current) return;
        if (!acumular) {
          setLista([]);
          setTotal(0);
          setHayMas(false);
        }
      } finally {
        if (solicitud === solicitudActual.current) {
          if (acumular) setCargandoMas(false);
          else setCargando(false);
        }
      }
    },
    [busqueda, grupo],
  );

  useEffect(() => {
    setCargando(true);
    setCargandoMas(false);
    setLista([]);
    setTotal(0);
    setHayMas(false);
    const timer = window.setTimeout(() => {
      void cargarPagina(1, false);
    }, 220);

    return () => {
      window.clearTimeout(timer);
      solicitudActual.current += 1;
    };
  }, [cargarPagina]);

  const excluidos = useMemo(() => new Set(idsExcluidos), [idsExcluidos]);
  const disponibles = useMemo(
    () => lista.filter((ejercicio) => !excluidos.has(ejercicio.id)),
    [excluidos, lista],
  );
  const cantidadExcluida = lista.length - disponibles.length;

  function cargarMas() {
    if (cargando || cargandoMas || !hayMas) return;
    void cargarPagina(pagina + 1, true);
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-2xl flex-col bg-background/95 p-lg backdrop-blur-lg">
      <header className="mb-md flex items-center justify-between">
        <div>
          <span className="font-grotesk text-label-caps tracking-[0.18em] text-primary">CATÁLOGO</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Elegir ejercicio</h2>
        </div>
        <button
          type="button"
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
        {grupos.map((opcion) => (
          <button
            type="button"
            key={opcion.valor}
            onClick={() => setGrupo(opcion.valor)}
            className={`whitespace-nowrap rounded-full border px-md py-xs font-grotesk text-label-caps tracking-wider transition-colors ${
              grupo === opcion.valor
                ? 'border-primary bg-primary text-on-primary'
                : 'border-white/10 bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
      <div className="mb-sm flex items-center justify-between text-xs text-on-surface-variant" aria-live="polite">
        <span>
          {cargando
            ? 'Cargando catálogo…'
            : `Mostrando ${disponibles.length} de ${total} ejercicio${total === 1 ? '' : 's'}`}
        </span>
        <span>GIF local · 180×180</span>
      </div>
      {cantidadExcluida > 0 && !cargando && (
        <p className="mb-sm rounded-lg border border-primary/20 bg-primary/5 px-sm py-xs text-xs text-primary">
          {cantidadExcluida === 1
            ? '1 ejercicio ya fue seleccionado para este día de entrenamiento.'
            : `${cantidadExcluida} ejercicios ya fueron seleccionados para este día de entrenamiento.`}
        </p>
      )}
      <ul className="min-h-0 flex-1 space-y-xs overflow-y-auto pr-px">
        {cargando && <EsqueletoCatalogo />}
        {!cargando && disponibles.length === 0 && (
          <li className="rounded-lg border border-white/5 bg-surface-container-low p-lg text-center text-sm text-on-surface-variant">
            {cantidadExcluida > 0
              ? 'Todos los ejercicios mostrados ya fueron seleccionados para este día.'
              : 'No encontramos ejercicios con esos filtros.'}
          </li>
        )}
        {disponibles.map((ejercicio) => (
          <OpcionEjercicio key={ejercicio.id} ejercicio={ejercicio} onPick={onPick} />
        ))}
        {!cargando && hayMas && (
          <li className="pt-sm text-center">
            <button
              type="button"
              onClick={cargarMas}
              disabled={cargandoMas}
              className="rounded-lg border border-primary/30 px-lg py-sm font-grotesk text-label-caps tracking-wider text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
            >
              {cargandoMas ? 'Cargando más ejercicios…' : `Cargar ${TAMANO_PAGINA} más`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

const OpcionEjercicio = memo(function OpcionEjercicio({
  ejercicio,
  onPick,
}: {
  ejercicio: Ejercicio;
  onPick: (ejercicio: Ejercicio) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(ejercicio)}
        className="flex w-full items-center gap-md rounded-lg border border-white/5 bg-surface-container-low p-sm text-left transition-all hover:border-primary/40 hover:bg-surface-container"
      >
        <ExerciseMedia exercise={ejercicio} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-body-lg text-on-surface">{traducirNombreEjercicio(ejercicio.name)}</p>
          <p className="font-grotesk text-[10px] tracking-wider text-on-surface-variant">
            {ejercicio.target
              ? traducirValorEjercicio(ejercicio.target)
              : etiquetaGrupoMuscular(ejercicio.muscleGroup)}{' '}
            · {ejercicio.equipmentLabel
              ? traducirValorEjercicio(ejercicio.equipmentLabel)
              : etiquetaEquipo(ejercicio.equipment)}
          </p>
          {ejercicio.category && (
            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-outline">
              {traducirCategoria(ejercicio.category)}
            </p>
          )}
        </div>
        {ejercicio.tags.length > 0 && (
          <div className="hidden flex-wrap gap-xs sm:flex">
            {ejercicio.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-tertiary/20 px-xs py-px font-grotesk text-[9px] tracking-wider text-tertiary"
              >
                {traducirEtiquetaEjercicio(tag)}
              </span>
            ))}
          </div>
        )}
      </button>
    </li>
  );
});

function EsqueletoCatalogo() {
  return (
    <>
      {Array.from({ length: 6 }, (_, indice) => (
        <li key={indice} className="flex items-center gap-md rounded-lg bg-surface-container-low p-sm" aria-hidden>
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 animate-pulse rounded bg-surface-container-high" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-container-high" />
          </div>
        </li>
      ))}
    </>
  );
}
