import * as Crypto from 'expo-crypto';
import { getDatabase, writeTransaction, type DatabaseOwner } from '../db/database';
import {
  localCivilDate,
  type Supplement,
  type SupplementInput,
  type SupplementIntake,
} from './supplement';

interface SupplementRow {
  id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  reminder_enabled: number;
  reminder_time: string | null;
  reminder_weekdays: string;
  created_at: string;
  updated_at: string;
}

interface IntakeRow {
  supplement_id: string;
  taken_at: string;
  civil_date: string;
}

function weekdays(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((day): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function toSupplement(row: SupplementRow): Supplement {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    notes: row.notes,
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    reminderWeekdays: weekdays(row.reminder_weekdays),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSupplements(owner: DatabaseOwner): Promise<Supplement[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<SupplementRow>(
    'SELECT id, name, dosage, notes, reminder_enabled, reminder_time, reminder_weekdays, created_at, updated_at FROM supplements ORDER BY name COLLATE NOCASE ASC',
  );
  return rows.map(toSupplement);
}

export async function saveSupplement(owner: DatabaseOwner, input: SupplementInput): Promise<Supplement> {
  const database = await getDatabase(owner);
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  return writeTransaction(database, async () => {
    await database.runAsync(
      `INSERT INTO supplements
      (id, name, dosage, notes, reminder_enabled, reminder_time, reminder_weekdays, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       dosage = excluded.dosage,
       notes = excluded.notes,
       reminder_enabled = excluded.reminder_enabled,
       reminder_time = excluded.reminder_time,
       reminder_weekdays = excluded.reminder_weekdays,
       updated_at = excluded.updated_at`,
      id,
      input.name,
      input.dosage,
      input.notes,
      input.reminderEnabled ? 1 : 0,
      input.reminderTime,
      JSON.stringify(input.reminderWeekdays),
      now,
      now,
    );
    const row = await database.getFirstAsync<SupplementRow>(
      'SELECT id, name, dosage, notes, reminder_enabled, reminder_time, reminder_weekdays, created_at, updated_at FROM supplements WHERE id = ?',
      id,
    );
    if (!row) throw new Error('No se pudo leer el suplemento guardado.');
    return toSupplement(row);
  });
}

export async function deleteSupplement(owner: DatabaseOwner, id: string): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync('DELETE FROM supplements WHERE id = ?', id);
  });
}

export async function listSupplementIntakes(owner: DatabaseOwner, civilDate = localCivilDate()): Promise<SupplementIntake[]> {
  const database = await getDatabase(owner);
  const rows = await database.getAllAsync<IntakeRow>(
    'SELECT supplement_id, taken_at, civil_date FROM supplement_intakes WHERE civil_date = ? ORDER BY taken_at ASC',
    civilDate,
  );
  return rows.map((row) => ({ supplementId: row.supplement_id, takenAt: row.taken_at, civilDate: row.civil_date }));
}

/** One intake per supplement and civil day; repeating the action is idempotent. */
export async function recordSupplementIntake(
  owner: DatabaseOwner,
  supplementId: string,
  at = new Date(),
): Promise<SupplementIntake> {
  const database = await getDatabase(owner);
  const takenAt = at.toISOString();
  const civilDate = localCivilDate(at);
  await writeTransaction(database, async () => {
    await database.runAsync(
      `INSERT INTO supplement_intakes (id, supplement_id, taken_at, civil_date)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(supplement_id, civil_date) DO UPDATE SET taken_at = excluded.taken_at`,
      Crypto.randomUUID(),
      supplementId,
      takenAt,
      civilDate,
    );
  });
  return { supplementId, takenAt, civilDate };
}

export async function removeSupplementIntake(
  owner: DatabaseOwner,
  supplementId: string,
  civilDate = localCivilDate(),
): Promise<void> {
  const database = await getDatabase(owner);
  await writeTransaction(database, async () => {
    await database.runAsync(
      'DELETE FROM supplement_intakes WHERE supplement_id = ? AND civil_date = ?',
      supplementId,
      civilDate,
    );
  });
}
