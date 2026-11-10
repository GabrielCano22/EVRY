import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

it('recovers and synchronizes an offline workout across three terminated JavaScript processes', async () => {
  const backendRequire = createRequire(resolve(process.env.EVRY_BACKEND_ROOT!, 'package.json'));
  const { Client } = backendRequire('pg');
  const postgres = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
  const id = randomUUID();
  const exerciseId = randomUUID();
  const email = `restart-${id}@example.test`;
  const password = 'synthetic-restart-password';
  const root = resolve(__dirname, '../../../../.worktrees');
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(resolve(root, 'native-restart-'));
  const mobileRoot = resolve(__dirname, '../..');
  await postgres.connect();
  try {
    const hash = await backendRequire('bcrypt').hash(password, 10);
    await postgres.query('INSERT INTO "User" (id,email,"passwordHash",name,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      [id, email, hash, 'Synthetic restart']);
    await postgres.query('INSERT INTO "Exercise" (id,name,"muscleGroup",equipment,"isCustom","ownerId") VALUES ($1,$2,\'CORE\',\'BODYWEIGHT\',true,$3)',
      [exerciseId, 'Synthetic restart exercise', id]);
    const pids: number[] = [];
    for (const phase of ['create-offline', 'finish-offline', 'sync-online']) {
      const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'),
        '--config', resolve(mobileRoot, 'jest.config.cjs'), '--runInBand', '--testMatch', '**/backend-restart.phase.ts'], {
        cwd: mobileRoot, encoding: 'utf8', windowsHide: true, timeout: 30000,
        env: { ...process.env, EVRY_RESTART_DIRECTORY: directory, EVRY_RESTART_PHASE: phase,
          EVRY_RESTART_USER: id, EVRY_RESTART_EMAIL: email, EVRY_RESTART_PASSWORD: password, EVRY_RESTART_EXERCISE: exerciseId },
      });
      writeFileSync(resolve(directory, `${phase}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`);
      // Exit is mandatory before the next phase starts. No isolateModules or
      // shared JS object can supply identity, workout or pending outbox state.
      expect({ phase, status: result.status, error: result.error?.message, report: result.status ? result.stderr : '' })
        .toEqual({ phase, status: 0, error: undefined, report: '' });
      pids.push(result.pid);
      if (phase !== 'sync-online') {
        expect((await postgres.query('SELECT id FROM "Workout" WHERE "userId"=$1', [id])).rows).toEqual([]);
      }
    }
    expect(new Set(pids).size).toBe(3);
    expect((await postgres.query('SELECT status,revision FROM "Workout" WHERE "userId"=$1', [id])).rows)
      .toEqual([{ status: 'COMPLETED', revision: 1 }]);
    expect((await postgres.query('SELECT s.reps,s."weightKg" FROM "WorkoutSet" s JOIN "Workout" w ON w.id=s."workoutId" WHERE w."userId"=$1', [id])).rows)
      .toEqual([{ reps: 9, weightKg: 55 }]);
    expect((await postgres.query('SELECT "sessionsCount" FROM "ExerciseStat" WHERE "userId"=$1', [id])).rows)
      .toEqual([{ sessionsCount: 1 }]);
  } finally {
    try {
      await postgres.query('DELETE FROM "User" WHERE id=$1', [id]);
      await postgres.query('DELETE FROM "Exercise" WHERE id=$1', [exerciseId]);
    } finally { await postgres.end(); }
  }
}, 90000); // New three-process integration watchdog, not a changed existing limit.
