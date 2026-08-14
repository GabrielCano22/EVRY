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

export type TextoLocalizado = Record<string, string>;
export type PasosLocalizados = Record<string, string[]>;

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

export interface Ejercicio {
  id: string;
  sourceId?: string | null;
  name: string;
  muscleGroup: GrupoMuscular;
  equipment: Equipo;
  category?: string | null;
  bodyPart?: string | null;
  target?: string | null;
  secondaryMuscles?: string[];
  equipmentLabel?: string | null;
  isCustom: boolean;
  ownerId: string | null;
  isCompound: boolean;
  tags: string[];
  description: string | null;
  instructions?: TextoLocalizado | null;
  instructionSteps?: PasosLocalizados | null;
  mediaId?: string | null;
  imagePath?: string | null;
  gifPath?: string | null;
  attribution?: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
}
export type Exercise = Ejercicio;

export interface PaginaEjercicios {
  items: Ejercicio[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
export type ExercisePage = PaginaEjercicios;

export interface SerieEntrenamiento {
  id: string;
  workoutId: string;
  exerciseId: string;
  exercise?: Ejercicio;
  order: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completedAt: string;
}
export type WorkoutSet = SerieEntrenamiento;

export interface Entrenamiento {
  id: string;
  userId: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  cyclePhase: FaseCiclo | null;
  notes: string | null;
  routine?: Rutina | null;
  sets: SerieEntrenamiento[];
}
export type Workout = Entrenamiento;

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

export interface Recomendacion {
  exerciseId: string;
  targetWeightKg: number | null;
  targetReps: number | null;
  rationale: string[];
  confidence: number;
  action: 'PROGRESS' | 'HOLD' | 'DELOAD' | 'NEW';
}
export type Recommendation = Recomendacion;

export interface EjercicioRutina {
  id: string;
  routineId: string;
  exerciseId: string;
  exercise?: Ejercicio;
  order: number;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  notes: string | null;
}

export interface Rutina {
  id: string;
  userId: string;
  name: string;
  // 0=Lunes, 6=Domingo
  dayOfWeek: number | null;
  notes: string | null;
  createdAt: string;
  exercises: EjercicioRutina[];
}
export type Routine = Rutina;

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
