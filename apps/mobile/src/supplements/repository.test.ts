import {
  deleteSupplement,
  listSupplementIntakes,
  listSupplements,
  recordSupplementIntake,
  removeSupplementIntake,
  saveSupplement,
} from './repository';
import { getDatabase, writeTransaction } from '../db/database';

// Real SQLite, production statements; only the Expo bridge and UUID source are
// replaced. The same owner keeps one in-memory database across a test.
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const owner = { userId: 'supplements-user', serverUrl: 'https://api.example.com/api/v1' };
const otherOwner = { userId: 'other-user', serverUrl: 'https://api.example.com/api/v1' };

beforeEach(async () => {
  const database = await getDatabase(owner);
  await database.execAsync('DELETE FROM supplement_intakes; DELETE FROM supplements;');
});

it('creates, lists, updates and deletes a supplement', async () => {
  const created = await saveSupplement(owner, {
    name: 'Creatina',
    dosage: '5 g',
    notes: 'Con agua',
    reminderEnabled: true,
    reminderTime: '08:00',
    reminderWeekdays: [1, 3, 5],
  });
  expect(created).toMatchObject({
    name: 'Creatina',
    dosage: '5 g',
    notes: 'Con agua',
    reminderEnabled: true,
    reminderTime: '08:00',
    reminderWeekdays: [1, 3, 5],
  });

  expect(await listSupplements(owner)).toEqual([created]);

  const updated = await saveSupplement(owner, {
    id: created.id,
    name: 'Creatina monohidrato',
    dosage: null,
    notes: null,
    reminderEnabled: false,
    reminderTime: null,
    reminderWeekdays: [],
  });
  expect(updated.id).toBe(created.id);
  expect(updated.createdAt).toBe(created.createdAt);
  expect(updated).toMatchObject({ name: 'Creatina monohidrato', dosage: null, reminderEnabled: false });

  await deleteSupplement(owner, created.id);
  expect(await listSupplements(owner)).toEqual([]);
});

it('keeps supplements isolated per account', async () => {
  await saveSupplement(owner, {
    name: 'Vitamina D', dosage: null, notes: null, reminderEnabled: false, reminderTime: null, reminderWeekdays: [],
  });
  expect(await listSupplements(otherOwner)).toEqual([]);
});

it('records one intake per supplement and civil day, and repeats it idempotently', async () => {
  const supplement = await saveSupplement(owner, {
    name: 'Magnesio', dosage: null, notes: null, reminderEnabled: false, reminderTime: null, reminderWeekdays: [],
  });
  const first = await recordSupplementIntake(owner, supplement.id, new Date(2026, 10, 9, 8, 0));
  expect(first).toMatchObject({ supplementId: supplement.id, civilDate: '2026-11-09' });

  const second = await recordSupplementIntake(owner, supplement.id, new Date(2026, 10, 9, 21, 30));
  expect(second.civilDate).toBe('2026-11-09');
  const intakes = await listSupplementIntakes(owner, '2026-11-09');
  expect(intakes).toHaveLength(1);
  expect(intakes[0].takenAt).toBe(new Date(2026, 10, 9, 21, 30).toISOString());

  await recordSupplementIntake(owner, supplement.id, new Date(2026, 10, 10, 8, 0));
  expect(await listSupplementIntakes(owner, '2026-11-09')).toHaveLength(1);
  expect(await listSupplementIntakes(owner, '2026-11-10')).toHaveLength(1);
});

it('removes one intake without touching the supplement', async () => {
  const supplement = await saveSupplement(owner, {
    name: 'Zinc', dosage: null, notes: null, reminderEnabled: false, reminderTime: null, reminderWeekdays: [],
  });
  await recordSupplementIntake(owner, supplement.id, new Date(2026, 10, 9, 8, 0));
  await removeSupplementIntake(owner, supplement.id, '2026-11-09');
  expect(await listSupplementIntakes(owner, '2026-11-09')).toEqual([]);
  expect(await listSupplements(owner)).toHaveLength(1);
});

it('deletes the intake history with its supplement', async () => {
  const supplement = await saveSupplement(owner, {
    name: 'Omega 3', dosage: null, notes: null, reminderEnabled: false, reminderTime: null, reminderWeekdays: [],
  });
  await recordSupplementIntake(owner, supplement.id, new Date(2026, 10, 9, 8, 0));
  await deleteSupplement(owner, supplement.id);
  expect(await listSupplementIntakes(owner, '2026-11-09')).toEqual([]);
});

it.each(['save', 'delete', 'record', 'remove'] as const)(
  'serializes %s against an unrelated transaction that rolls back',
  async (action) => {
    const input = {
      name: 'Magnesio', dosage: null, notes: null, reminderEnabled: false, reminderTime: null, reminderWeekdays: [],
    };
    const existing = await saveSupplement(owner, input);
    const date = new Date(2026, 10, 9, 8);
    if (action === 'remove') await recordSupplementIntake(owner, existing.id, date);

    const database = await getDatabase(owner);
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const failure = new Error('unrelated rollback');
    const unrelated = writeTransaction(database, async () => {
      await database.runAsync('DELETE FROM supplements WHERE id = ?', existing.id);
      started();
      await gate;
      throw failure;
    });
    const rejected = expect(unrelated).rejects.toThrow('unrelated rollback');
    await entered;

    let settled = false;
    const operation = (action === 'save' ? saveSupplement(owner, { ...input, name: 'Zinc' })
      : action === 'delete' ? deleteSupplement(owner, existing.id)
      : action === 'record' ? recordSupplementIntake(owner, existing.id, date)
      : removeSupplementIntake(owner, existing.id, '2026-11-09'))
      .finally(() => { settled = true; });
    try {
      // Let already-scheduled asynchronous work run while the other transaction is open.
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
    } finally {
      release();
    }
    await rejected;
    await operation;

    const supplements = await listSupplements(owner);
    const intakes = await listSupplementIntakes(owner, '2026-11-09');
    if (action === 'save') expect(supplements.map((item) => item.name).sort()).toEqual(['Magnesio', 'Zinc']);
    if (action === 'delete') expect(supplements).toEqual([]);
    if (action === 'record') expect(intakes).toHaveLength(1);
    if (action === 'remove') expect(intakes).toEqual([]);
  },
);
