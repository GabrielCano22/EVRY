import type { components } from '@evry/api-client';
import type { CurrentUser } from '../api/client';

export type UserUpdateInput = components['schemas']['UserUpdateInput'];
export type BiologicalSex = NonNullable<UserUpdateInput['biologicalSex']>;
export type ProfileGoal = NonNullable<UserUpdateInput['goals']>[number];

export interface ProfileDraft {
  name: string;
  biologicalSex: BiologicalSex;
  birthDate: string;
  goals: ProfileGoal[];
  trackCycle: boolean;
  avgCycleLen: string;
  avgPeriodLen: string;
}

export type ProfileUpdateInput = Required<Pick<UserUpdateInput, keyof ProfileDraft>>;
export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;
export type ProfileValidation = { errors: ProfileErrors; input?: ProfileUpdateInput };

const biologicalSexes: readonly BiologicalSex[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY'];
const profileGoals: readonly ProfileGoal[] = [
  'STRENGTH',
  'HYPERTROPHY',
  'ENDURANCE',
  'FAT_LOSS',
  'GENERAL_FITNESS',
  'MOBILITY',
];
const defaultCycleLength = 28;
const defaultPeriodLength = 5;

export function createProfileDraft(user: CurrentUser): ProfileDraft {
  return {
    name: user.name,
    biologicalSex: user.biologicalSex,
    birthDate: user.birthDate?.slice(0, 10) ?? '',
    goals: [...user.goals],
    trackCycle: user.trackCycle,
    avgCycleLen: String(user.avgCycleLen),
    avgPeriodLen: String(user.avgPeriodLen),
  };
}

export function restoreCycleLengths(draft: ProfileDraft, user: CurrentUser): ProfileDraft {
  const canonicalCycleLength = validInteger(user.avgCycleLen, 20, 45) ? user.avgCycleLen : defaultCycleLength;
  const canonicalPeriodLength = validInteger(user.avgPeriodLen, 2, 10) ? user.avgPeriodLen : defaultPeriodLength;
  return {
    ...draft,
    trackCycle: true,
    avgCycleLen: validLength(draft.avgCycleLen, 20, 45) ? draft.avgCycleLen : String(canonicalCycleLength),
    avgPeriodLen: validLength(draft.avgPeriodLen, 2, 10) ? draft.avgPeriodLen : String(canonicalPeriodLength),
  };
}

export function validateProfileDraft(draft: ProfileDraft, today: string): ProfileValidation {
  const errors: ProfileErrors = {};
  const name = draft.name.trim();

  if (!name) errors.name = 'El nombre es obligatorio.';
  else if (name.length > 120) errors.name = 'El nombre debe tener máximo 120 caracteres.';

  if (!biologicalSexes.includes(draft.biologicalSex)) {
    errors.biologicalSex = 'Selecciona un sexo biológico válido.';
  }

  if (draft.birthDate && !isCivilDate(draft.birthDate)) {
    errors.birthDate = 'Escribe una fecha válida en formato YYYY-MM-DD.';
  } else if (draft.birthDate && draft.birthDate > today) {
    errors.birthDate = 'La fecha de nacimiento no puede ser futura.';
  }

  if (new Set(draft.goals).size !== draft.goals.length || draft.goals.some((goal) => !profileGoals.includes(goal))) {
    errors.goals = 'Selecciona objetivos válidos sin repetirlos.';
  }

  if (draft.trackCycle && !validLength(draft.avgCycleLen, 20, 45)) {
    errors.avgCycleLen = 'El ciclo promedio debe estar entre 20 y 45 días.';
  }
  if (draft.trackCycle && !validLength(draft.avgPeriodLen, 2, 10)) {
    errors.avgPeriodLen = 'El periodo promedio debe estar entre 2 y 10 días.';
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    input: {
      name,
      biologicalSex: draft.biologicalSex,
      birthDate: draft.birthDate || null,
      goals: [...draft.goals],
      trackCycle: draft.trackCycle,
      avgCycleLen: validLength(draft.avgCycleLen, 20, 45) ? Number(draft.avgCycleLen) : defaultCycleLength,
      avgPeriodLen: validLength(draft.avgPeriodLen, 2, 10) ? Number(draft.avgPeriodLen) : defaultPeriodLength,
    },
  };
}

function validLength(value: string, minimum: number, maximum: number): boolean {
  return validInteger(Number(value), minimum, maximum) && value.trim() !== '';
}

function validInteger(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isCivilDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
