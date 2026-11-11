import type { components } from '@evry/api-client';
import { continueServerWorkout, enqueueWorkout, getDatabase, keepReviewAsDraft, loadActiveWorkout, loadRecoveredDrafts, markSyncAttempt, markSyncFailure, markSyncSuccess, pendingSyncRows, saveWorkout, syncReviews } from './database';
import type { LocalWorkout } from '../training/workout-domain';
import type { SyncWorkoutInput } from '../api/client';
import * as SQLite from 'expo-sqlite';

// Exercise the production SQL on real SQLite; only the native Expo bridge is replaced.
jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const alice = { userId: 'user-a', serverUrl: 'https://api.example.com/api/v1' };
const bob = { userId: 'user-b', serverUrl: 'https://api.example.com/api/v1' };

const workout: LocalWorkout = {
  clientId: 'local-workout', revision: 0, status: 'ACTIVE', name: 'Fuerza',
  startedAt: '2026-08-30T10:00:00.000Z', notes: null, sets: [], deletedSetClientIds: [],
};
const serverVersion: components['schemas']['SyncCanonicalWorkout'] = {
  id: 'server-workout', userId: 'user-a', name: 'Fuerza del servidor', startedAt: '2026-08-30T10:00:00.000Z',
  endedAt: null, cancelledAt: null, status: 'ACTIVE', clientId: null, lastSyncId: 'server-sync', revision: 4,
  cyclePhase: null, notes: 'Controla el descenso', routineId: 'routine-1',
  createdAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-30T10:30:00.000Z', routine: null,
  sets: [{
    id: 'server-set', workoutId: 'server-workout', exerciseId: 'exercise-1', order: 0,
    weightKg: 50, reps: 5, durationS: null, rpe: 7, isWarmup: true, setType: 'WARMUP',
    completedAt: '2026-08-30T10:25:00.000Z', clientMutationId: 'mutation-1', clientId: null,
    revision: 2, techniqueStable: false, updatedAt: '2026-08-30T10:25:00.000Z',
    exercise: {
      id: 'exercise-1', sourceId: null, name: 'Sentadilla', muscleGroup: 'QUADS', equipment: 'BARBELL',
      category: null, bodyPart: null, target: null, secondaryMuscles: [], equipmentLabel: null,
      isCustom: false, ownerId: null, isCompound: true, tags: [], description: null, mediaId: null,
      imagePath: null, gifPath: null, attribution: null, instructions: null, instructionSteps: null,
      createdAt: '2026-08-30T10:00:00.000Z',
    },
  }],
};
function payload(syncId: string, name = 'Fuerza'): SyncWorkoutInput {
  return { clientId: workout.clientId, syncId, baseRevision: 0, status: 'ACTIVE', name, startedAt: workout.startedAt, sets: [], deletedSetClientIds: [] };
}

beforeEach(async () => {
  const database = await getDatabase(alice);
  await database.execAsync('DELETE FROM workouts; DELETE FROM id_mapping;');
});

describe('damaged workout hydration', () => {
  const message = 'La sesión guardada contiene datos inválidos. Los datos locales se conservan.';
  const damagedPayloads = [
    '{"private-note":',
    'null',
    '{}',
    JSON.stringify({ ...workout, sets: {} }),
    JSON.stringify({ ...workout, sets: [null] }),
    JSON.stringify({ ...workout, deletedSetClientIds: [5] }),
    JSON.stringify({ ...workout, revision: -1 }),
    JSON.stringify({ ...workout, clientId: 'another-workout' }),
    JSON.stringify({ ...workout, status: 'COMPLETED' }),
    JSON.stringify({ ...workout, status: { toString: 'private-note' } }),
  ];

  it.each(damagedPayloads)('rejects damaged active payload without changing it or its outbox: %s', async (raw) => {
    await enqueueWorkout(alice, workout, 'preserved', payload('preserved'));
    const database = await getDatabase(alice);
    await database.runAsync('UPDATE workouts SET payload = ? WHERE client_id = ?', raw, workout.clientId);
    const queue = await pendingSyncRows(alice);

    await expect(loadActiveWorkout(alice)).rejects.toThrow(message);

    expect(await database.getFirstAsync('SELECT payload FROM workouts WHERE client_id = ?', workout.clientId)).toEqual({ payload: raw });
    expect(await pendingSyncRows(alice)).toEqual(queue);
  });

  it('does not silently omit a damaged recovered draft among valid drafts', async () => {
    const database = await getDatabase(alice);
    await saveWorkout(alice, { ...workout, clientId: 'good-draft', status: 'DRAFT' });
    await saveWorkout(alice, { ...workout, clientId: 'bad-draft', status: 'DRAFT' });
    await database.runAsync('UPDATE workouts SET payload = ? WHERE client_id = ?', '{}', 'bad-draft');

    await expect(loadRecoveredDrafts(alice)).rejects.toThrow(message);

    expect(await database.getFirstAsync('SELECT payload FROM workouts WHERE client_id = ?', 'bad-draft')).toEqual({ payload: '{}' });
    expect(await database.getAllAsync('SELECT client_id FROM workouts ORDER BY client_id')).toEqual([{ client_id: 'bad-draft' }, { client_id: 'good-draft' }]);
  });

  it('loads legitimate nullable sets, symbolic IDs and completed draft extensions unchanged', async () => {
    const draft = {
      ...workout, clientId: 'completed-draft', status: 'DRAFT' as const,
      endedAt: '2026-08-30T11:00:00.000Z', extraRecoveryNote: 'Keep this extension',
      sets: [{ clientId: 'old-set', exerciseId: 'old-exercise', revision: 1, order: 0,
        weightKg: null, reps: null, durationS: 60, rpe: null, isWarmup: false,
        techniqueStable: null, completedAt: workout.startedAt }],
    };
    await saveWorkout(alice, draft);
    expect(await loadRecoveredDrafts(alice)).toEqual([draft]);
  });
});

it('coalesces never-sent edits into the latest persisted workout', async () => {
  await enqueueWorkout(alice, workout, 'first', payload('first'));
  await enqueueWorkout(alice, { ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));
  expect((await pendingSyncRows(alice)).map((row) => row.syncId)).toEqual(['latest']);
  expect((await loadActiveWorkout(alice))?.name).toBe('Actualizado');
});

it.each(['enqueue', 'reviews', 'keep-draft', 'acknowledge'] as const)(
  'rejects damaged source data during %s without changing source, queue or mappings', async (operation) => {
    const source: LocalWorkout = { ...workout, deletedSetClientIds: ['deleted-set'], sets: [{
      clientId: 'protected-set', revision: 0, exerciseId: 'exercise-1', order: 0,
      weightKg: 50, reps: 8, durationS: null, rpe: 7, isWarmup: false,
      techniqueStable: true, completedAt: workout.startedAt,
    }] };
    await enqueueWorkout(alice, source, 'protected-sync', {
      ...payload('protected-sync'), deletedSetClientIds: source.deletedSetClientIds,
      sets: source.sets.map(({ revision, ...set }) => ({ ...set, baseRevision: revision })),
    });
    const [sent] = await pendingSyncRows(alice);
    if (operation === 'reviews' || operation === 'keep-draft') {
      await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'REVISION_CONFLICT', serverVersion);
    }
    const database = await getDatabase(alice);
    await database.runAsync('INSERT INTO id_mapping VALUES (?, ?, ?, ?)',
      'workout', workout.clientId, 'previous-server', workout.startedAt);
    await database.runAsync('UPDATE workouts SET payload = ? WHERE client_id = ?',
      JSON.stringify({ ...source, notes: 23 }), workout.clientId);
    const snapshot = async () => Promise.all(['workouts', 'sync_queue', 'id_mapping']
      .map((table) => database.getAllAsync(`SELECT * FROM ${table}`)));
    const before = await snapshot();
    const action = operation === 'enqueue'
      ? () => enqueueWorkout(alice, { ...workout, name: 'New edit' }, 'new-edit', payload('new-edit'))
      : operation === 'reviews' ? () => syncReviews(alice)
        : operation === 'keep-draft' ? () => keepReviewAsDraft(alice, workout.clientId)
          : () => markSyncSuccess(alice, sent, { revision: 1, mapping: { workout: { serverId: 'server-new' }, sets: [] } });

    await expect(action()).rejects.toThrow('La sesión guardada contiene datos inválidos. Los datos locales se conservan.');
    expect(await snapshot()).toEqual(before);
  },
);

it('archives a recovered draft in the same transaction as its new syncable workout', async () => {
  const draft: LocalWorkout = { ...workout, clientId: 'draft-atomic', status: 'DRAFT' };
  await saveWorkout(alice, draft);
  await enqueueWorkout(alice, workout, 'recovered', payload('recovered'), draft);

  expect(await loadRecoveredDrafts(alice)).toEqual([]);
  expect(await loadActiveWorkout(alice)).toMatchObject({ clientId: 'local-workout', status: 'ACTIVE' });
  expect((await pendingSyncRows(alice)).map((row) => row.syncId)).toEqual(['recovered']);
});

it.each(['changed', 'damaged', 'missing', 'archived'] as const)(
  'does not overwrite a %s draft snapshot or create a phantom recovered session', async (change) => {
    const draft: LocalWorkout = { ...workout, clientId: 'source-draft', status: 'DRAFT' };
    await saveWorkout(alice, draft);
    const database = await getDatabase(alice);
    if (change === 'missing') {
      await database.runAsync('DELETE FROM workouts WHERE client_id = ?', draft.clientId);
    } else if (change === 'damaged') {
      await database.runAsync('UPDATE workouts SET payload = ? WHERE client_id = ?', '{}', draft.clientId);
    } else {
      await saveWorkout(alice, change === 'archived'
        ? { ...draft, status: 'CANCELLED', cancelledAt: '2026-08-30T11:00:00Z' }
        : { ...draft, notes: 'New local note, same revision' });
    }
    const snapshot = () => Promise.all(['workouts', 'sync_queue', 'id_mapping']
      .map((table) => database.getAllAsync(`SELECT * FROM ${table}`)));
    const before = await snapshot();
    await expect(enqueueWorkout(alice, workout, 'recover-stale', payload('recover-stale'), draft))
      .rejects.toThrow(change === 'damaged' ? 'Los datos locales se conservan.' : 'El borrador cambió.');
    expect(await snapshot()).toEqual(before);
  },
);

it('accepts equivalent reordered draft properties and preserves nested extensions on archival', async () => {
  const draft = { ...workout, clientId: 'ordered-draft', status: 'DRAFT' as const,
    recoveryMetadata: { source: 'offline', flags: ['keep', 'order'] } };
  await saveWorkout(alice, draft);
  // Move top-level fields too, without changing the actual snapshot values.
  const caller = Object.fromEntries(Object.entries(draft).reverse()) as typeof draft;
  caller.recoveryMetadata = { flags: ['keep', 'order'], source: 'offline' };
  await enqueueWorkout(alice, workout, 'recover-ordered', payload('recover-ordered'), caller);
  const database = await getDatabase(alice);
  const archived = await database.getFirstAsync<{ payload: string }>('SELECT payload FROM workouts WHERE client_id = ?', draft.clientId);
  expect(JSON.parse(archived!.payload)).toMatchObject({ status: 'CANCELLED', recoveryMetadata: draft.recoveryMetadata });
});

it('rejects changed nested extension arrays without archiving the newer draft', async () => {
  const draft = { ...workout, clientId: 'extension-draft', status: 'DRAFT' as const,
    recoveryMetadata: { flags: ['first', 'second'] } };
  await saveWorkout(alice, draft);
  const latest = { ...draft, recoveryMetadata: { flags: ['second', 'first'] } };
  await saveWorkout(alice, latest);
  await expect(enqueueWorkout(alice, workout, 'recover-extension', payload('recover-extension'), draft))
    .rejects.toThrow('El borrador cambió.');
  expect(await loadRecoveredDrafts(alice)).toEqual([latest]);
  expect(await loadActiveWorkout(alice)).toBeNull();
  expect(await pendingSyncRows(alice)).toEqual([]);
});

it('does not invent inherited JSON fields when checking a changed draft snapshot', async () => {
  const draft = { ...workout, clientId: 'own-json-fields', status: 'DRAFT' as const,
    recoveryMetadata: JSON.parse('{"__proto__":null}') };
  await saveWorkout(alice, draft);
  // These are ordinary persisted JSON fields, not prototype mutations.
  const latest = JSON.parse(`${JSON.stringify(draft).slice(0, -1)},"__proto__":{"__proto__":null}}`);
  expect(Object.hasOwn(latest, '__proto__')).toBe(true);
  await saveWorkout(alice, latest);
  await expect(enqueueWorkout(alice, workout, 'recover-own-fields', payload('recover-own-fields'), draft))
    .rejects.toThrow('El borrador cambió.');
  expect(await loadRecoveredDrafts(alice)).toEqual([latest]);
  expect(await loadActiveWorkout(alice)).toBeNull();
  expect(await pendingSyncRows(alice)).toEqual([]);
});

it('preserves literal JSON extension keys when archiving an unchanged draft', async () => {
  const body = JSON.stringify({ ...workout, clientId: 'literal-extension', status: 'DRAFT' });
  const draft: LocalWorkout = JSON.parse(`${body.slice(0, -1)},"__proto__":{"tag":"keep"}}`);
  await saveWorkout(alice, draft);
  await enqueueWorkout(alice, workout, 'recover-literal', payload('recover-literal'), draft);
  const database = await getDatabase(alice);
  const archived = await database.getFirstAsync<{ payload: string }>('SELECT payload FROM workouts WHERE client_id = ?', draft.clientId);
  const stored = JSON.parse(archived!.payload);
  expect(Object.hasOwn(stored, '__proto__')).toBe(true);
  expect(stored.__proto__).toEqual({ tag: 'keep' });
  expect(Object.hasOwn(draft, '__proto__')).toBe(true);
  expect(draft.status).toBe('DRAFT');
});

it('retains the draft and creates no active session or sync row if archival fails', async () => {
  const draft: LocalWorkout = { ...workout, clientId: 'draft-failure', status: 'DRAFT' };
  await saveWorkout(alice, draft);
  const database = await getDatabase(alice);
  await database.execAsync(`CREATE TRIGGER fail_draft_archive BEFORE UPDATE OF status ON workouts
    WHEN OLD.client_id = 'draft-failure' BEGIN SELECT RAISE(ABORT, 'archive failed'); END;`);
  try {
    await expect(enqueueWorkout(alice, workout, 'recovered', payload('recovered'), draft)).rejects.toThrow('archive failed');
    expect(await loadRecoveredDrafts(alice)).toMatchObject([{ clientId: 'draft-failure', status: 'DRAFT' }]);
    expect(await loadActiveWorkout(alice)).toBeNull();
    expect(await pendingSyncRows(alice)).toEqual([]);
  } finally {
    await database.execAsync('DROP TRIGGER fail_draft_archive;');
  }
});

it('replays an uncertain send unchanged before sending a newer edit with the acknowledged revision', async () => {
  await enqueueWorkout(alice, workout, 'uncertain', payload('uncertain'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'pending', 'network_error');
  await enqueueWorkout(alice, { ...workout, name: 'Actualizado' }, 'latest', payload('latest', 'Actualizado'));

  const retry = await pendingSyncRows(alice);
  expect(retry.map((row) => row.syncId)).toEqual(['uncertain']);
  expect(JSON.parse(retry[0].payload)).toEqual(payload('uncertain'));
  await markSyncAttempt(alice, retry[0].id);
  await markSyncSuccess(alice, retry[0], { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } });

  const next = await pendingSyncRows(alice);
  expect(next.map((row) => row.syncId)).toEqual(['latest']);
  expect(JSON.parse(next[0].payload)).toMatchObject({ baseRevision: 1, name: 'Actualizado' });
  expect(await loadActiveWorkout(alice)).toMatchObject({ revision: 1, name: 'Actualizado' });
});

it('persists every canonical server field when a conflicted workout is continued', async () => {
  await enqueueWorkout(alice, workout, 'conflicted-sync', payload('conflicted-sync'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'REVISION_CONFLICT', serverVersion);

  const [review] = await syncReviews(alice);
  await continueServerWorkout(alice, {
    ...review,
    serverVersion: {
      ...review.serverVersion!, clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
      sets: [{ ...review.serverVersion!.sets[0], clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544' }],
    },
  });

  expect(await loadActiveWorkout(alice)).toMatchObject({
    clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
    revision: 4,
    notes: 'Controla el descenso',
    routineId: 'routine-1',
    sets: [{
      clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544',
      isWarmup: true,
      techniqueStable: false,
      completedAt: '2026-08-30T10:25:00.000Z',
    }],
  });
  expect(await pendingSyncRows(alice)).toEqual([]);
});

describe('continuing a server workout after recovering its local draft', () => {
  const canonicalClientId = '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748';
  async function collision(destination: {
    status: 'CANCELLED' | 'DRAFT'; state: 'synced' | 'pending'; serverId: string; revision: number; queued?: boolean;
  }) {
    // Recovery archives the original local row while the new session receives
    // another clientId. The server can still return that original identity.
    await saveWorkout(alice, { ...workout, clientId: canonicalClientId,
      status: destination.status, revision: destination.revision,
      cancelledAt: '2026-08-30T11:00:00.000Z', notes: 'Archived local version' });
    const database = await getDatabase(alice);
    await database.runAsync('UPDATE workouts SET server_id = ?, sync_state = ? WHERE client_id = ?',
      destination.serverId, destination.state, canonicalClientId);
    await enqueueWorkout(alice, workout, 'recovered-active-conflict', payload('recovered-active-conflict'));
    const [sent] = await pendingSyncRows(alice);
    await markSyncAttempt(alice, sent.id);
    await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', {
      ...serverVersion, clientId: canonicalClientId,
      sets: [{ ...serverVersion.sets[0], clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544' }],
    });
    if (destination.queued) {
      await database.runAsync(
        `INSERT INTO sync_queue (sync_id, workout_client_id, payload, state, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
        'archived-pending', canonicalClientId, JSON.stringify({ ...payload('archived-pending'), clientId: canonicalClientId }),
        workout.startedAt, workout.startedAt,
      );
    }
    const [review] = await syncReviews(alice);
    return { database, review };
  }

  it('resumes the canonical session when its earlier synced local archive already exists', async () => {
    const { database, review } = await collision({ status: 'CANCELLED', state: 'synced', serverId: 'server-workout', revision: 3 });
    const unrelatedDraft: LocalWorkout = { ...workout, clientId: 'unrelated-draft', status: 'DRAFT', notes: 'Preserve my other draft' };
    await saveWorkout(alice, unrelatedDraft);

    await expect(continueServerWorkout(alice, review)).resolves.toBeUndefined();

    expect(await loadActiveWorkout(alice)).toMatchObject({ clientId: canonicalClientId, revision: 4,
      notes: 'Controla el descenso', sets: [{ reps: 5, weightKg: 50, techniqueStable: false }] });
    expect(await database.getFirstAsync('SELECT server_id FROM workouts WHERE client_id = ?', canonicalClientId))
      .toEqual({ server_id: 'server-workout' });
    expect(await database.getFirstAsync('SELECT client_id FROM workouts WHERE client_id = ?', workout.clientId)).toBeNull();
    expect(await loadRecoveredDrafts(alice)).toEqual([unrelatedDraft]);
    expect(await syncReviews(alice)).toEqual([]);
    expect(await pendingSyncRows(alice)).toEqual([]);
  });

  it.each([
    { status: 'DRAFT', state: 'synced', serverId: 'server-workout', revision: 3 },
    { status: 'CANCELLED', state: 'pending', serverId: 'server-workout', revision: 3 },
    { status: 'CANCELLED', state: 'synced', serverId: 'another-server-workout', revision: 3 },
    { status: 'CANCELLED', state: 'synced', serverId: 'server-workout', revision: 5 },
    { status: 'CANCELLED', state: 'synced', serverId: 'server-workout', revision: 3, queued: true },
  ] as const)('preserves a colliding $status/$state row with identity $serverId and revision $revision', async destination => {
    const { database, review } = await collision(destination);
    const rows = await database.getAllAsync('SELECT * FROM workouts ORDER BY client_id');
    const queue = await database.getAllAsync('SELECT * FROM sync_queue ORDER BY id');

    await expect(continueServerWorkout(alice, review)).rejects.toThrow();

    expect(await database.getAllAsync('SELECT * FROM workouts ORDER BY client_id')).toEqual(rows);
    expect(await database.getAllAsync('SELECT * FROM sync_queue ORDER BY id')).toEqual(queue);
    expect(await syncReviews(alice)).toEqual([review]);
  });
});

it('preserves the local session and review when server identities have not been adopted', async () => {
  await enqueueWorkout(alice, workout, 'unadopted-sync', payload('unadopted-sync'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', serverVersion);
  const [review] = await syncReviews(alice);
  await expect(continueServerWorkout(alice, review)).rejects.toThrow(/identidades/);
  expect(await loadActiveWorkout(alice)).toMatchObject({ clientId: workout.clientId, name: workout.name, revision: 0 });
  expect(await syncReviews(alice)).toEqual([review]);
});

it('prepares persistent server identities before replacing a legacy conflicted local session', async () => {
  await enqueueWorkout(alice, workout, 'adopt-sync', payload('adopt-sync'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', serverVersion);
  const [review] = await syncReviews(alice);
  const requested: string[] = [];
  await continueServerWorkout(alice, review, async (server) => {
    requested.push(server.id);
    return {
      ...server, clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748', revision: 5,
      sets: [{ ...server.sets[0], clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544', revision: 3 }],
    };
  });
  expect(requested).toEqual(['server-workout']);
  expect(await loadActiveWorkout(alice)).toMatchObject({
    clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748', revision: 5,
    sets: [{ clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544', revision: 3, reps: 5 }],
  });
  expect(await syncReviews(alice)).toEqual([]);
  expect(await pendingSyncRows(alice)).toEqual([]);
});

it('preserves the session and review when server identity preparation cannot connect', async () => {
  await enqueueWorkout(alice, workout, 'adopt-offline', payload('adopt-offline'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', serverVersion);
  const [review] = await syncReviews(alice);
  await expect(continueServerWorkout(alice, review, async () => {
    throw new TypeError('No hay conexión para adoptar la sesión.');
  })).rejects.toThrow('No hay conexión');
  expect(await loadActiveWorkout(alice)).toMatchObject({ clientId: workout.clientId, name: workout.name, revision: 0 });
  expect(await syncReviews(alice)).toEqual([review]);
});

it('keeps edits made while server identity adoption is awaiting its response', async () => {
  await enqueueWorkout(alice, workout, 'adopt-edit-race', payload('adopt-edit-race'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', serverVersion);
  const [review] = await syncReviews(alice);
  const result = continueServerWorkout(alice, review, async (server) => {
    await enqueueWorkout(alice, { ...workout, notes: 'Edición guardada durante la espera' },
      'edit-during-adoption', { ...payload('edit-during-adoption'), notes: 'Edición guardada durante la espera' });
    return { ...server, clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
      sets: [{ ...server.sets[0], clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544' }] };
  });
  await expect(result).rejects.toThrow(/cambió/);
  expect(await loadActiveWorkout(alice)).toMatchObject({
    clientId: 'local-workout', notes: 'Edición guardada durante la espera',
  });
  expect(await syncReviews(alice)).toEqual([review]);
});

it('does not delete a recovered draft when an earlier adoption response arrives', async () => {
  await enqueueWorkout(alice, workout, 'adopt-draft-race', payload('adopt-draft-race'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await markSyncFailure(alice, sent.id, workout.clientId, 'requires_review', 'ACTIVE_WORKOUT_CONFLICT', serverVersion);
  const [review] = await syncReviews(alice);
  const result = continueServerWorkout(alice, review, async (server) => {
    await keepReviewAsDraft(alice, workout.clientId);
    return { ...server, clientId: '4ef7ca0b-d56a-4dd3-81a8-0121a26f0748',
      sets: [{ ...server.sets[0], clientId: 'c879669e-6af4-41bd-912e-b279ef9f0544' }] };
  });
  await expect(result).rejects.toThrow(/cambió/);
  expect(await loadRecoveredDrafts(alice)).toMatchObject([{ clientId: 'local-workout', status: 'DRAFT', name: 'Fuerza (recuperado)' }]);
  expect(await loadActiveWorkout(alice)).toBeNull();
  expect(await syncReviews(alice)).toEqual([]);
});

it('keeps a conflicted local workout recoverable when a stored server version is malformed', async () => {
  await enqueueWorkout(alice, workout, 'malformed-sync', payload('malformed-sync'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  const database = await getDatabase(alice);
  await database.runAsync(
    "UPDATE sync_queue SET state = 'requires_review', last_error = ? WHERE id = ?",
    JSON.stringify({ code: 'REVISION_CONFLICT', serverVersion: {} }),
    sent.id,
  );

  const [review] = await syncReviews(alice);

  expect(review.serverVersion).toBeNull();
  await expect(continueServerWorkout(alice, review)).rejects.toThrow('no devolvió una sesión recuperable');
  expect(await loadActiveWorkout(alice)).toMatchObject({ clientId: workout.clientId, name: workout.name, revision: 0 });
  expect(await syncReviews(alice)).toHaveLength(1);
});

it('does not expose a newer payload while the same workout has an in-flight send', async () => {
  await enqueueWorkout(alice, workout, 'in-flight', payload('in-flight'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await enqueueWorkout(alice, workout, 'latest', payload('latest'));
  expect(await pendingSyncRows(alice)).toEqual([]);
});

it('serializes a local edit with an arriving acknowledgement without losing either', async () => {
  await enqueueWorkout(alice, workout, 'first', payload('first'));
  const [sent] = await pendingSyncRows(alice);
  await markSyncAttempt(alice, sent.id);
  await Promise.all([
    enqueueWorkout(alice, { ...workout, name: 'Última edición' }, 'latest', payload('latest', 'Última edición')),
    markSyncSuccess(alice, sent, { revision: 1, mapping: { workout: { serverId: 'server-1' }, sets: [] } }),
  ]);
  expect(await loadActiveWorkout(alice)).toMatchObject({ revision: 1, name: 'Última edición' });
  const [next] = await pendingSyncRows(alice);
  expect(JSON.parse(next.payload)).toMatchObject({ baseRevision: 1, name: 'Última edición' });
});

it('isolates account caches and reopens the original account without deleting its data', async () => {
  const first = await getDatabase(alice);
  await first.runAsync('INSERT OR REPLACE INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)', 'private-a', '{"name":"Private A"}', '2026-08-30');
  const second = await getDatabase(bob);
  expect(await second.getAllAsync('SELECT id FROM routine_cache')).toEqual([]);
  const reopened = await getDatabase({ ...alice });
  expect(await reopened.getAllAsync('SELECT id FROM routine_cache')).toEqual([{ id: 'private-a' }]);
});

it('separates identical user IDs on different API environments', async () => {
  const first = await getDatabase(alice);
  await first.runAsync('INSERT OR REPLACE INTO routine_cache (id, payload, updated_at) VALUES (?, ?, ?)', 'private-a', '{}', '2026-08-30');
  const staging = await getDatabase({ ...alice, serverUrl: 'https://staging.example.com/api/v1' });
  expect(await staging.getAllAsync('SELECT id FROM routine_cache')).toEqual([]);
});

it('preserves the unowned legacy database without copying its records into a new account', async () => {
  const legacy = await SQLite.openDatabaseAsync('evry.db');
  await legacy.execAsync('CREATE TABLE IF NOT EXISTS legacy_workouts (name TEXT); INSERT INTO legacy_workouts VALUES (\'Unassigned workout\');');
  const account = await getDatabase({ ...alice, userId: 'new-account' });
  expect(await account.getAllAsync('SELECT client_id FROM workouts')).toEqual([]);
  expect(await legacy.getAllAsync('SELECT name FROM legacy_workouts')).toEqual([{ name: 'Unassigned workout' }]);
});

it('applies an acknowledgement only to the originating database even when queue IDs collide', async () => {
  const firstOwner = { ...alice, userId: 'ack-first' };
  const secondOwner = { ...bob, userId: 'ack-second' };
  await enqueueWorkout(firstOwner, workout, 'first', payload('first'));
  await enqueueWorkout(secondOwner, { ...workout, name: 'Other account' }, 'second', payload('second', 'Other account'));
  const [first] = await pendingSyncRows(firstOwner);
  const [second] = await pendingSyncRows(secondOwner);
  expect(first.id).toBe(second.id);
  await markSyncAttempt(firstOwner, first.id);
  await markSyncSuccess(firstOwner, first, { revision: 1, mapping: { workout: { serverId: 'server-first' }, sets: [] } });
  expect(await pendingSyncRows(firstOwner)).toEqual([]);
  expect(await pendingSyncRows(secondOwner)).toEqual([second]);
  expect(await loadActiveWorkout(secondOwner)).toMatchObject({ name: 'Other account', revision: 0 });
});
