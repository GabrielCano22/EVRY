import {
  ALL_WEEKDAYS,
  draftFromSupplement,
  emptySupplementDraft,
  isValidReminderTime,
  localCivilDate,
  reminderSummary,
  validateSupplementDraft,
  type Supplement,
} from './supplement';

const supplement: Supplement = {
  id: 'supplement-1',
  name: 'Creatina',
  dosage: '5 g',
  notes: null,
  reminderEnabled: true,
  reminderTime: '08:30',
  reminderWeekdays: [1, 3, 5],
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
};

describe('supplement draft validation', () => {
  it('trims the name and keeps optional fields null instead of empty strings', () => {
    const result = validateSupplementDraft({ ...emptySupplementDraft(), name: '  Creatina  ' });
    expect(result.errors).toEqual({});
    expect(result.value).toMatchObject({
      name: 'Creatina',
      dosage: null,
      notes: null,
      reminderEnabled: false,
      reminderTime: null,
      reminderWeekdays: [],
    });
  });

  it('requires a name and bounds every free-text field', () => {
    expect(validateSupplementDraft(emptySupplementDraft()).errors.name).toBe('Escribe un nombre para el suplemento.');
    expect(validateSupplementDraft({ ...emptySupplementDraft(), name: 'x'.repeat(81) }).errors.name)
      .toBe('El nombre no puede superar 80 caracteres.');
    expect(validateSupplementDraft({ ...emptySupplementDraft(), name: 'A', dosage: 'x'.repeat(81) }).errors.dosage)
      .toBe('La dosis no puede superar 80 caracteres.');
    expect(validateSupplementDraft({ ...emptySupplementDraft(), name: 'A', notes: 'x'.repeat(241) }).errors.notes)
      .toBe('Las notas no pueden superar 240 caracteres.');
  });

  it('validates time and weekdays only when a reminder is enabled', () => {
    expect(validateSupplementDraft({
      ...emptySupplementDraft(), name: 'Magnesio', reminderEnabled: true, reminderTime: '25:00',
    }).errors.reminderTime).toBe('Usa una hora válida en formato HH:MM.');
    expect(validateSupplementDraft({
      ...emptySupplementDraft(), name: 'Magnesio', reminderEnabled: true, reminderWeekdays: [],
    }).errors.reminderWeekdays).toBe('Elige al menos un día para el recordatorio.');
    expect(validateSupplementDraft({
      ...emptySupplementDraft(), name: 'Magnesio', reminderTime: '99:99',
    }).errors).toEqual({});
  });

  it('deduplicates, sorts and discards out-of-range weekdays', () => {
    const result = validateSupplementDraft({
      ...emptySupplementDraft(),
      name: 'Omega 3',
      reminderEnabled: true,
      reminderTime: '21:15',
      reminderWeekdays: [5, 1, 5, 0, 8, 3],
    });
    expect(result.value?.reminderWeekdays).toEqual([1, 3, 5]);
    expect(result.value?.reminderTime).toBe('21:15');
  });

  it('accepts only a 24 hour HH:MM time', () => {
    expect(isValidReminderTime('00:00')).toBe(true);
    expect(isValidReminderTime('23:59')).toBe(true);
    expect(isValidReminderTime('24:00')).toBe(false);
    expect(isValidReminderTime('8:30')).toBe(false);
    expect(isValidReminderTime('08:60')).toBe(false);
  });
});

describe('supplement helpers', () => {
  it('round-trips a stored supplement into an editable draft', () => {
    expect(draftFromSupplement(supplement)).toEqual({
      id: 'supplement-1',
      name: 'Creatina',
      dosage: '5 g',
      notes: '',
      reminderEnabled: true,
      reminderTime: '08:30',
      reminderWeekdays: [1, 3, 5],
    });
  });

  it('describes reminders in local terms', () => {
    expect(reminderSummary(supplement)).toBe('L · X · V · 08:30');
    expect(reminderSummary({ ...supplement, reminderWeekdays: ALL_WEEKDAYS })).toBe('Todos los días · 08:30');
    expect(reminderSummary({ ...supplement, reminderEnabled: false })).toBe('Sin recordatorio');
    expect(reminderSummary({ ...supplement, reminderTime: null })).toBe('Sin recordatorio');
  });

  it('builds the civil date from local time instead of UTC', () => {
    expect(localCivilDate(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
    expect(localCivilDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});
