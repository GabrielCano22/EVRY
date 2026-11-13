import type { MobileSession } from '../api/client';
import * as repository from './repository';
import { emptySupplementDraft, localCivilDate } from './supplement';
import { recordIntakeFromNotification, useSupplementsStore } from './store';
import { useSessionStore } from '../auth/session-store';

jest.mock('../auth/session-store', () => ({
  useSessionStore: { getState: jest.fn() },
}));

jest.mock('./repository', () => ({
  listSupplements: jest.fn(), listSupplementIntakes: jest.fn(), saveSupplement: jest.fn(),
  deleteSupplement: jest.fn(), recordSupplementIntake: jest.fn(), removeSupplementIntake: jest.fn(),
}));
const repo = jest.mocked(repository);
const session = {} as MobileSession;
const supplement = { id: 'a', name: 'A', dosage: null, notes: null, reminderEnabled: false,
  reminderTime: null, reminderWeekdays: [], createdAt: '', updatedAt: '' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks();
  useSupplementsStore.getState().reset();
  jest.mocked(useSessionStore.getState).mockReturnValue({ status: 'authenticated', session } as ReturnType<typeof useSessionStore.getState>);
  repo.listSupplements.mockResolvedValue([supplement]);
  repo.listSupplementIntakes.mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

it('serializes a save and intake, retains both snapshots and releases saving', async () => {
  const write = deferred<typeof supplement>();
  repo.saveSupplement.mockReturnValue(write.promise);
  repo.recordSupplementIntake.mockResolvedValue({ supplementId: 'a', takenAt: 'taken', civilDate: localCivilDate() });
  repo.listSupplementIntakes.mockResolvedValueOnce([]).mockResolvedValueOnce([{ supplementId: 'a', takenAt: 'taken', civilDate: localCivilDate() }]);
  const save = useSupplementsStore.getState().save(session, { ...emptySupplementDraft(), name: 'A' });
  const intake = useSupplementsStore.getState().markTaken(session, 'a');
  expect(useSupplementsStore.getState().saving).toBe(true);
  write.resolve(supplement);
  await Promise.all([save, intake]);
  expect(useSupplementsStore.getState()).toMatchObject({ saving: false, supplements: [supplement], intakes: { a: 'taken' } });
});

it('continues after a failed write and releases saving only when all saves finish', async () => {
  const first = deferred<typeof supplement>();
  const second = deferred<typeof supplement>();
  repo.saveSupplement.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const draft = { ...emptySupplementDraft(), name: 'A' };
  const a = useSupplementsStore.getState().save(session, draft);
  const b = useSupplementsStore.getState().save(session, draft);
  first.reject(new Error('failed'));
  await expect(a).rejects.toThrow('failed');
  expect(useSupplementsStore.getState().saving).toBe(true);
  second.resolve(supplement);
  await b;
  expect(useSupplementsStore.getState().saving).toBe(false);
});

it('does not publish a previous-day snapshot when a read crosses local midnight', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 9, 23, 59));
  const read = deferred<Awaited<ReturnType<typeof repository.listSupplementIntakes>>>();
  repo.listSupplementIntakes.mockReturnValueOnce(read.promise).mockResolvedValueOnce([]);
  const loading = useSupplementsStore.getState().load(session);
  await Promise.resolve();
  jest.setSystemTime(new Date(2026, 10, 10, 0, 1));
  read.resolve([{ supplementId: 'a', takenAt: 'yesterday', civilDate: '2026-11-09' }]);
  await loading;
  expect(repo.listSupplementIntakes).toHaveBeenLastCalledWith(session, '2026-11-10');
  expect(useSupplementsStore.getState()).toMatchObject({ intakes: {}, intakesDay: '2026-11-10' });
});

it('ignores a late snapshot after reset', async () => {
  const read = deferred<typeof supplement[]>();
  repo.listSupplements.mockReturnValueOnce(read.promise);
  const loading = useSupplementsStore.getState().load(session);
  await Promise.resolve();
  useSupplementsStore.getState().reset();
  read.resolve([supplement]);
  await loading;
  expect(useSupplementsStore.getState()).toMatchObject({ session: null, supplements: [], saving: false });
});

it.each(['logout', 'account change'])('does not record a notification after %s during its load', async (change) => {
  const read = deferred<typeof supplement[]>();
  repo.listSupplements.mockReturnValueOnce(read.promise);
  const recording = recordIntakeFromNotification(session, 'a');
  await Promise.resolve();
  const nextSession = change === 'logout' ? null : {} as MobileSession;
  jest.mocked(useSessionStore.getState).mockReturnValue({ status: nextSession ? 'authenticated' : 'anonymous', session: nextSession } as ReturnType<typeof useSessionStore.getState>);
  read.resolve([supplement]);
  await recording;
  expect(repo.recordSupplementIntake).not.toHaveBeenCalled();
});

it('records a notification after loading the authenticated session', async () => {
  repo.recordSupplementIntake.mockResolvedValue({ supplementId: 'a', takenAt: 'taken', civilDate: localCivilDate() });
  await recordIntakeFromNotification(session, 'a');
  expect(repo.recordSupplementIntake).toHaveBeenCalledTimes(1);
  expect(useSupplementsStore.getState()).toMatchObject({ session, ready: true });
});

it('does not write a queued notification after logout, even before the supplements store resets', async () => {
  await useSupplementsStore.getState().load(session);
  const read = deferred<typeof supplement[]>();
  repo.listSupplements.mockReturnValueOnce(read.promise);
  const loading = useSupplementsStore.getState().load(session);
  await Promise.resolve();
  const recording = recordIntakeFromNotification(session, 'a');
  const rejected = expect(recording).rejects.toThrow('sesión actual');
  jest.mocked(useSessionStore.getState).mockReturnValue({ status: 'anonymous', session: null } as ReturnType<typeof useSessionStore.getState>);
  read.resolve([supplement]);
  await Promise.all([loading, rejected]);
  expect(repo.recordSupplementIntake).not.toHaveBeenCalled();
  expect(useSupplementsStore.getState().error).toBeNull();
});

it.each(['reset', 'account change'])('rejects queued writes invalidated by %s without disturbing the new state', async (change) => {
  const read = deferred<typeof supplement[]>();
  repo.listSupplements.mockReturnValueOnce(read.promise);
  const loading = useSupplementsStore.getState().load(session);
  await Promise.resolve();
  const queued = useSupplementsStore.getState().save(session, { ...emptySupplementDraft(), name: 'A' });
  const rejected = expect(queued).rejects.toThrow('sesión actual');
  const nextSession = {} as MobileSession;
  let nextLoad: Promise<void> | undefined;
  if (change === 'reset') useSupplementsStore.getState().reset();
  else nextLoad = useSupplementsStore.getState().load(nextSession);
  read.resolve([supplement]);
  await Promise.all([loading, rejected, nextLoad]);
  expect(repo.saveSupplement).not.toHaveBeenCalled();
  expect(useSupplementsStore.getState()).toMatchObject({ session: change === 'reset' ? null : nextSession, saving: false, error: null, ready: change !== 'reset' });
});
