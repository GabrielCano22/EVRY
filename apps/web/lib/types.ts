// Tipos compartidos. Mantenemos los nombres de campos que vienen del backend
// (en inglés) porque coinciden con la API y Prisma; los aliases en español
// están definidos arriba para uso en código nuevo.

export type Sexo = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';
export type Sex = Sexo;

export type Meta =
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'ENDURANCE'
  | 'FAT_LOSS'
  | 'GENERAL_FITNESS'
  | 'MOBILITY';
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

export type FaseCiclo = 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL';
export type CyclePhase = FaseCiclo;

export type Flujo = 'NONE' | 'SPOTTING' | 'LIGHT' | 'MEDIUM' | 'HEAVY';
export type Flow = Flujo;

export interface Usuario {
  id: string;
  email: string;
  name: string;
  biologicalSex: Sexo;
  birthDate: string | null;
  goals: Meta[];
  trackCycle: boolean;
  avgCycleLen: number;
  avgPeriodLen: number;
  createdAt: string;
}
export type User = Usuario;

export type EstadoAutenticacionRemota = 'checking' | 'authenticated' | 'anonymous' | 'error';
export type AuthStatus = EstadoAutenticacionRemota;

export interface RegistroCiclo {
  id: string;
  date: string;
  flow: Flujo;
  symptoms: string[];
  energy: number | null;
  mood: number | null;
  notes: string | null;
  isPeriodStart: boolean;
}
export type CycleEntry = RegistroCiclo;

export interface InfoFase {
  phase: FaseCiclo;
  dayOfCycle: number;
  cycleLength: number;
  nextPeriodStart: string | null;
  trainingHint: string;
  intensityCap: number;
  volumeCap: number;
}
export type PhaseInfo = InfoFase;

export interface ResumenProgreso {
  windowDays: number;
  workoutsCompleted: number;
  volumeKg: number;
  topExercises: Array<{
    exerciseId: string;
    name: string;
    estimated1RM: number;
    bestWeight: number;
    bestReps: number;
    trendSlope: number;
    sessionsCount: number;
  }>;
}
export type ProgressOverview = ResumenProgreso;
