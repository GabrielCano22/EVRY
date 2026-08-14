'use client';

import { useMemo, useState } from 'react';
import type { Ejercicio } from '@/lib/types';

type VistaCuerpo = 'FRENTE' | 'ESPALDA';
type SexoMapa = 'MASCULINO' | 'FEMENINO';

type Musculo =
  | 'cuello'
  | 'pecho'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'antebrazos'
  | 'abdominales'
  | 'oblicuos'
  | 'dorsales'
  | 'espalda-superior'
  | 'espalda-baja'
  | 'trapecio'
  | 'gluteos'
  | 'cuadriceps'
  | 'aductores'
  | 'abductores'
  | 'isquios'
  | 'pantorrillas'
  | 'cuerpo-completo';

const ETIQUETAS: Record<Musculo, string> = {
  cuello: 'Cuello',
  pecho: 'Pecho',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazos: 'Antebrazos',
  abdominales: 'Abdominales',
  oblicuos: 'Oblicuos',
  dorsales: 'Dorsales',
  'espalda-superior': 'Espalda superior',
  'espalda-baja': 'Espalda baja',
  trapecio: 'Trapecio',
  gluteos: 'Glúteos',
  cuadriceps: 'Cuádriceps',
  aductores: 'Aductores',
  abductores: 'Abductores',
  isquios: 'Isquiosurales',
  pantorrillas: 'Pantorrillas',
  'cuerpo-completo': 'Cuerpo completo',
};

const TODOS: Musculo[] = [
  'cuello',
  'pecho',
  'hombros',
  'biceps',
  'triceps',
  'antebrazos',
  'abdominales',
  'oblicuos',
  'dorsales',
  'espalda-superior',
  'espalda-baja',
  'trapecio',
  'gluteos',
  'cuadriceps',
  'aductores',
  'abductores',
  'isquios',
  'pantorrillas',
];

function normalizar(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]/g, ' ');
}

function musculosDeEjercicio(ejercicio: Ejercicio): Musculo[] {
  const textos = [
    ejercicio.target,
    ejercicio.bodyPart,
    ejercicio.category,
    ...(ejercicio.secondaryMuscles ?? []),
    ejercicio.muscleGroup,
  ]
    .filter(Boolean)
    .map(normalizar)
    .join(' ');
  const resultado = new Set<Musculo>();
  const agregar = (...musculos: Musculo[]) => musculos.forEach((musculo) => resultado.add(musculo));

  if (/full body|whole body|cuerpo completo|cuerpo entero/.test(textos) || ejercicio.muscleGroup === 'FULL_BODY') {
    TODOS.forEach((musculo) => resultado.add(musculo));
    return [...resultado];
  }
  if (/neck|cuello|levator scapulae/.test(textos)) agregar('cuello');
  if (/chest|pector|pecho/.test(textos) || ejercicio.muscleGroup === 'CHEST') agregar('pecho');
  if (/shoulder|deltoid|hombro/.test(textos) || ejercicio.muscleGroup === 'SHOULDERS') agregar('hombros');
  if (/biceps|bicep/.test(textos) || ejercicio.muscleGroup === 'BICEPS') agregar('biceps');
  if (/triceps|tricep/.test(textos) || ejercicio.muscleGroup === 'TRICEPS') agregar('triceps');
  if (/forearm|antebrazo/.test(textos) || ejercicio.muscleGroup === 'FOREARMS') agregar('antebrazos');
  if (/abs|abdominal|rectus abdominis|waist|core/.test(textos) || ejercicio.muscleGroup === 'CORE') agregar('abdominales');
  if (/oblique/.test(textos)) agregar('oblicuos');
  if (/lat|dorsal/.test(textos)) agregar('dorsales');
  if (/upper back|espalda superior/.test(textos)) agregar('espalda-superior');
  if (/lower back|low back|spine|lumbar|espalda baja/.test(textos)) agregar('espalda-baja');
  if (/trap|trapezi/.test(textos)) agregar('trapecio');
  if (/glute|butt|gluteo/.test(textos) || ejercicio.muscleGroup === 'GLUTES') agregar('gluteos');
  if (/quad|cuadricep|front thigh/.test(textos) || ejercicio.muscleGroup === 'QUADS') agregar('cuadriceps');
  if (/adductor|aductor/.test(textos)) agregar('aductores');
  if (/abductor|abductora/.test(textos)) agregar('abductores');
  if (/hamstring|ischio|isquio|posterior thigh/.test(textos) || ejercicio.muscleGroup === 'HAMSTRINGS') agregar('isquios');
  if (/calf|calves|gastrocnemius|soleus|pantorrilla/.test(textos) || ejercicio.muscleGroup === 'CALVES') agregar('pantorrillas');

  if (ejercicio.muscleGroup === 'BACK' && resultado.size === 0) agregar('espalda-superior');
  if (ejercicio.muscleGroup === 'CARDIO' && resultado.size === 0) agregar('cuerpo-completo');
  return [...resultado];
}

export function obtenerMusculos(ejercicios: Ejercicio[]): Musculo[] {
  const resultado = new Set<Musculo>();
  ejercicios.forEach((ejercicio) => musculosDeEjercicio(ejercicio).forEach((musculo) => resultado.add(musculo)));
  return [...resultado];
}

function Region({
  id,
  active,
  d,
  label,
}: {
  id: Musculo;
  active: boolean;
  d: string;
  label: string;
}) {
  return (
    <path
      d={d}
      fill={active ? '#1597ff' : '#263746'}
      stroke={active ? '#9bd7ff' : '#425364'}
      strokeWidth="1.2"
      opacity={active ? 1 : 0.86}
      role="img"
      aria-label={`${label}${active ? ', trabajado' : ''}`}
    >
      <title>{label}</title>
    </path>
  );
}

export function MapaMuscular({ ejercicios }: { ejercicios: Ejercicio[] }) {
  const [sexo, setSexo] = useState<SexoMapa>('MASCULINO');
  const [vista, setVista] = useState<VistaCuerpo>('FRENTE');
  const activos = useMemo(() => new Set(obtenerMusculos(ejercicios)), [ejercicios]);
  const activosVisibles = [...activos].filter((musculo) => {
    if (vista === 'FRENTE') return !['dorsales', 'espalda-superior', 'espalda-baja', 'trapecio', 'triceps', 'gluteos', 'isquios'].includes(musculo);
    return !['pecho', 'abdominales', 'oblicuos', 'biceps', 'cuadriceps', 'aductores', 'abductores'].includes(musculo);
  });
  const torso = sexo === 'FEMENINO'
    ? 'M108 91 C92 99 88 121 91 145 L98 177 C101 191 101 210 93 228 L87 243 C101 252 139 252 153 243 L147 228 C139 210 139 191 142 177 L149 145 C152 121 148 99 132 91 Z'
    : 'M104 91 C88 98 80 120 84 149 L94 180 C98 195 97 212 90 228 L84 243 C99 251 141 251 156 243 L150 228 C143 212 142 195 146 180 L156 149 C160 120 152 98 136 91 Z';
  const cadera = sexo === 'FEMENINO'
    ? 'M94 222 C84 231 80 245 88 257 L101 270 L139 270 L152 257 C160 245 156 231 146 222 Z'
    : 'M90 222 C82 232 82 246 90 257 L101 268 L139 268 L150 257 C158 246 158 232 150 222 Z';

  return (
    <section className="rounded-xl border border-white/5 bg-surface-container p-md" aria-label="Mapa de músculos trabajados">
      <div className="mb-sm flex items-start justify-between gap-sm">
        <div>
          <p className="font-grotesk text-[10px] uppercase tracking-[0.18em] text-primary">Músculos trabajados</p>
          <h2 className="font-headline-md text-lg text-on-surface">Mapa corporal</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-xs py-px text-[10px] text-primary" aria-live="polite">
          {activos.size} zona{activos.size === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mb-sm grid grid-cols-2 gap-xs rounded-lg bg-background p-1">
        {(['MASCULINO', 'FEMENINO'] as SexoMapa[]).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setSexo(opcion)}
            className={`rounded-md px-xs py-xs text-[10px] uppercase tracking-wider transition-colors ${sexo === opcion ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            {opcion === 'MASCULINO' ? 'Hombre' : 'Mujer'}
          </button>
        ))}
      </div>
      <div className="mb-sm flex gap-xs">
        {(['FRENTE', 'ESPALDA'] as VistaCuerpo[]).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setVista(opcion)}
            className={`rounded-full border px-sm py-px text-[10px] uppercase tracking-wider transition-colors ${vista === opcion ? 'border-secondary bg-secondary/10 text-secondary' : 'border-white/10 text-on-surface-variant hover:text-on-surface'}`}
          >
            {opcion === 'FRENTE' ? 'Frente' : 'Espalda'}
          </button>
        ))}
      </div>

      <div className="flex justify-center rounded-lg bg-background/60 py-sm">
        <svg viewBox="0 0 240 360" className="h-auto w-full max-w-[210px]" role="img" aria-label={`${sexo === 'FEMENINO' ? 'Silueta femenina' : 'Silueta masculina'}, vista de ${vista.toLowerCase()}`}>
          <circle cx="120" cy="52" r="25" fill="#263746" stroke="#425364" strokeWidth="1.2" />
          <Region id="cuello" active={activos.has('cuello')} label={ETIQUETAS.cuello} d="M105 73 L135 73 L137 96 L103 96 Z" />
          {vista === 'FRENTE' ? (
            <>
              <Region id="hombros" active={activos.has('hombros')} label={ETIQUETAS.hombros} d="M103 91 L77 101 L84 126 L106 114 Z" />
              <Region id="hombros" active={activos.has('hombros')} label={ETIQUETAS.hombros} d="M137 91 L163 101 L156 126 L134 114 Z" />
              <Region id="pecho" active={activos.has('pecho')} label={ETIQUETAS.pecho} d="M106 97 C113 92 127 92 134 97 L137 126 C126 132 114 132 103 126 Z" />
              <Region id="abdominales" active={activos.has('abdominales')} label={ETIQUETAS.abdominales} d="M105 128 L135 128 L137 179 L103 179 Z" />
              <Region id="oblicuos" active={activos.has('oblicuos')} label={ETIQUETAS.oblicuos} d="M99 128 L105 128 L103 179 L95 169 Z" />
              <Region id="oblicuos" active={activos.has('oblicuos')} label={ETIQUETAS.oblicuos} d="M135 128 L141 128 L145 169 L137 179 Z" />
              <Region id="biceps" active={activos.has('biceps')} label={ETIQUETAS.biceps} d="M78 108 L65 119 L72 160 L88 151 L84 126 Z" />
              <Region id="biceps" active={activos.has('biceps')} label={ETIQUETAS.biceps} d="M162 108 L175 119 L168 160 L152 151 L156 126 Z" />
              <Region id="antebrazos" active={activos.has('antebrazos')} label={ETIQUETAS.antebrazos} d="M72 160 L88 151 L84 202 L72 208 L64 199 Z" />
              <Region id="antebrazos" active={activos.has('antebrazos')} label={ETIQUETAS.antebrazos} d="M168 160 L152 151 L156 202 L168 208 L176 199 Z" />
              <Region id="cuadriceps" active={activos.has('cuadriceps')} label={ETIQUETAS.cuadriceps} d="M101 224 L119 224 L118 286 L99 286 L92 257 Z" />
              <Region id="cuadriceps" active={activos.has('cuadriceps')} label={ETIQUETAS.cuadriceps} d="M139 224 L121 224 L122 286 L141 286 L148 257 Z" />
              <Region id="aductores" active={activos.has('aductores')} label={ETIQUETAS.aductores} d="M119 226 L121 226 L122 286 L118 286 Z" />
              <Region id="abductores" active={activos.has('abductores')} label={ETIQUETAS.abductores} d="M91 230 L101 224 L99 252 L88 257 Z" />
              <Region id="abductores" active={activos.has('abductores')} label={ETIQUETAS.abductores} d="M149 230 L139 224 L141 252 L152 257 Z" />
              <Region id="pantorrillas" active={activos.has('pantorrillas')} label={ETIQUETAS.pantorrillas} d="M99 287 L118 287 L116 337 L100 337 Z" />
              <Region id="pantorrillas" active={activos.has('pantorrillas')} label={ETIQUETAS.pantorrillas} d="M122 287 L141 287 L140 337 L124 337 Z" />
            </>
          ) : (
            <>
              <Region id="trapecio" active={activos.has('trapecio')} label={ETIQUETAS.trapecio} d="M103 91 L120 82 L137 91 L133 119 L107 119 Z" />
              <Region id="espalda-superior" active={activos.has('espalda-superior')} label={ETIQUETAS['espalda-superior']} d="M104 112 L136 112 L142 151 L98 151 Z" />
              <Region id="dorsales" active={activos.has('dorsales')} label={ETIQUETAS.dorsales} d="M98 145 L114 137 L116 190 L101 181 Z" />
              <Region id="dorsales" active={activos.has('dorsales')} label={ETIQUETAS.dorsales} d="M142 145 L126 137 L124 190 L139 181 Z" />
              <Region id="espalda-baja" active={activos.has('espalda-baja')} label={ETIQUETAS['espalda-baja']} d="M105 180 L135 180 L137 224 L103 224 Z" />
              <Region id="triceps" active={activos.has('triceps')} label={ETIQUETAS.triceps} d="M78 108 L65 119 L72 160 L88 151 L84 126 Z" />
              <Region id="triceps" active={activos.has('triceps')} label={ETIQUETAS.triceps} d="M162 108 L175 119 L168 160 L152 151 L156 126 Z" />
              <Region id="antebrazos" active={activos.has('antebrazos')} label={ETIQUETAS.antebrazos} d="M72 160 L88 151 L84 202 L72 208 L64 199 Z" />
              <Region id="antebrazos" active={activos.has('antebrazos')} label={ETIQUETAS.antebrazos} d="M168 160 L152 151 L156 202 L168 208 L176 199 Z" />
              <Region id="gluteos" active={activos.has('gluteos')} label={ETIQUETAS.gluteos} d={cadera} />
              <Region id="isquios" active={activos.has('isquios')} label={ETIQUETAS.isquios} d="M99 267 L119 267 L118 314 L99 314 Z" />
              <Region id="isquios" active={activos.has('isquios')} label={ETIQUETAS.isquios} d="M121 267 L141 267 L141 314 L122 314 Z" />
              <Region id="pantorrillas" active={activos.has('pantorrillas')} label={ETIQUETAS.pantorrillas} d="M99 314 L118 314 L116 337 L100 337 Z" />
              <Region id="pantorrillas" active={activos.has('pantorrillas')} label={ETIQUETAS.pantorrillas} d="M122 314 L141 314 L140 337 L124 337 Z" />
            </>
          )}
          <path d={torso} fill="none" stroke="#425364" strokeWidth="1" opacity="0.35" />
          <path d="M87 243 L101 270 L99 337 L84 337 L89 270 L79 254 Z" fill="#263746" stroke="#425364" strokeWidth="1.2" opacity="0.86" />
          <path d="M153 243 L139 270 L141 337 L156 337 L151 270 L161 254 Z" fill="#263746" stroke="#425364" strokeWidth="1.2" opacity="0.86" />
        </svg>
      </div>

      {activosVisibles.length > 0 ? (
        <div className="mt-sm flex flex-wrap gap-xs" aria-live="polite">
          {activosVisibles.map((musculo) => (
            <span key={musculo} className="rounded-full border border-primary/30 bg-primary/10 px-xs py-px text-[10px] text-primary">
              {ETIQUETAS[musculo]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-sm text-xs text-on-surface-variant">Selecciona ejercicios para ver las zonas implicadas.</p>
      )}
      {ejercicios.length > 0 && (
        <p className="mt-sm text-[10px] leading-relaxed text-on-surface-variant">
          Se resaltan músculos principales y secundarios de los {ejercicios.length} ejercicio{ejercicios.length === 1 ? '' : 's'} seleccionados.
        </p>
      )}
    </section>
  );
}
