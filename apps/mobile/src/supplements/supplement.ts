/**
 * Local-first supplement model. EVRY stores what the person declares; it
 * never suggests a dose, a schedule or a medical indication.
 */
export interface Supplement {
  id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  reminderEnabled: boolean;
  /** Local time in 24h `HH:MM`, or null when there is no reminder. */
  reminderTime: string | null;
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  reminderWeekdays: number[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplementIntake {
  supplementId: string;
  takenAt: string;
  civilDate: string;
}

export interface SupplementDraft {
  id?: string;
  name: string;
  dosage: string;
  notes: string;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderWeekdays: number[];
}

export interface SupplementInput {
  id?: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderWeekdays: number[];
}

export const WEEKDAY_LABELS: readonly { iso: number; short: string; long: string }[] = [
  { iso: 1, short: 'L', long: 'Lunes' },
  { iso: 2, short: 'M', long: 'Martes' },
  { iso: 3, short: 'X', long: 'Miércoles' },
  { iso: 4, short: 'J', long: 'Jueves' },
  { iso: 5, short: 'V', long: 'Viernes' },
  { iso: 6, short: 'S', long: 'Sábado' },
  { iso: 7, short: 'D', long: 'Domingo' },
];

export const ALL_WEEKDAYS = WEEKDAY_LABELS.map((day) => day.iso);

export function emptySupplementDraft(): SupplementDraft {
  return {
    name: '',
    dosage: '',
    notes: '',
    reminderEnabled: false,
    reminderTime: '08:00',
    reminderWeekdays: [...ALL_WEEKDAYS],
  };
}

export function draftFromSupplement(supplement: Supplement): SupplementDraft {
  return {
    id: supplement.id,
    name: supplement.name,
    dosage: supplement.dosage ?? '',
    notes: supplement.notes ?? '',
    reminderEnabled: supplement.reminderEnabled,
    reminderTime: supplement.reminderTime ?? '08:00',
    reminderWeekdays: [...supplement.reminderWeekdays],
  };
}

export function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export interface SupplementValidation {
  errors: Record<string, string>;
  value?: SupplementInput;
}

export function validateSupplementDraft(draft: SupplementDraft): SupplementValidation {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const dosage = draft.dosage.trim();
  const notes = draft.notes.trim();
  const weekdays = [...new Set(draft.reminderWeekdays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);

  if (name.length === 0) errors.name = 'Escribe un nombre para el suplemento.';
  else if (name.length > 80) errors.name = 'El nombre no puede superar 80 caracteres.';
  if (dosage.length > 80) errors.dosage = 'La dosis no puede superar 80 caracteres.';
  if (notes.length > 240) errors.notes = 'Las notas no pueden superar 240 caracteres.';
  if (draft.reminderEnabled && !isValidReminderTime(draft.reminderTime)) {
    errors.reminderTime = 'Usa una hora válida en formato HH:MM.';
  }
  if (draft.reminderEnabled && weekdays.length === 0) {
    errors.reminderWeekdays = 'Elige al menos un día para el recordatorio.';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      ...(draft.id ? { id: draft.id } : {}),
      name,
      dosage: dosage.length > 0 ? dosage : null,
      notes: notes.length > 0 ? notes : null,
      reminderEnabled: draft.reminderEnabled,
      reminderTime: draft.reminderEnabled ? draft.reminderTime : null,
      reminderWeekdays: draft.reminderEnabled ? weekdays : [],
    },
  };
}

export function localCivilDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function reminderSummary(supplement: Pick<Supplement, 'reminderEnabled' | 'reminderTime' | 'reminderWeekdays'>): string {
  if (!supplement.reminderEnabled || !supplement.reminderTime) return 'Sin recordatorio';
  const days = supplement.reminderWeekdays;
  if (days.length === 7) return `Todos los días · ${supplement.reminderTime}`;
  const labels = WEEKDAY_LABELS.filter((day) => days.includes(day.iso)).map((day) => day.short);
  return `${labels.join(' · ')} · ${supplement.reminderTime}`;
}
