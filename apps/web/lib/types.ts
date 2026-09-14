// Tipos compartidos. Mantenemos los nombres de campos que vienen del backend
// (en inglés) porque coinciden con la API y Prisma; los aliases en español
// están definidos arriba para uso en código nuevo.

import type { components } from '@evry/api-client';

type EsquemaUsuario = components['schemas']['User'];

export type Sexo = EsquemaUsuario['biologicalSex'];
export type Sex = Sexo;

export type Meta = EsquemaUsuario['goals'][number];
export type Goal = Meta;

export type GrupoMuscular =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'CORE'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'FULL_BODY'
  | 'CARDIO';
export type MuscleGroup = GrupoMuscular;

export type Equipo =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'CABLE'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'BAND'
  | 'OTHER';
export type Equipment = Equipo;

export type FaseCiclo = components['schemas']['CyclePhaseInfo']['phase'];
export type CyclePhase = FaseCiclo;

export type Flujo = components['schemas']['CycleEntry']['flow'];
export type Flow = Flujo;

export type Usuario = EsquemaUsuario;
export type User = Usuario;

export type EstadoAutenticacionRemota = 'checking' | 'authenticated' | 'anonymous' | 'error';
export type AuthStatus = EstadoAutenticacionRemota;

export type RegistroCiclo = components['schemas']['CycleEntry'];
export type CycleEntry = RegistroCiclo;

export type InfoFase = components['schemas']['CyclePhaseInfo'];
export type PhaseInfo = InfoFase;

export type ResumenProgreso = components['schemas']['ProgressOverview'];
export type ProgressOverview = ResumenProgreso;
