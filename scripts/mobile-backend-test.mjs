import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { waitForBackendReady } from './mobile-backend-ready.mjs';

let server;
async function closeServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    if (child.exitCode !== 0) throw new Error('Compiled backend exited abnormally.');
    return;
  }
  let forced = false;
  const closed = once(child, 'close');
  const timer = setTimeout(() => { forced = true; child.kill('SIGKILL'); }, 10000);
  if (child.connected) child.send('close');
  else { forced = true; child.kill('SIGKILL'); }
  await closed;
  clearTimeout(timer);
  if (forced || child.exitCode !== 0) throw new Error('Compiled backend did not close cleanly.');
}
try {
  // Validate before imports, database connections or subprocesses. No dotenv.
  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!testUrl) throw new Error('TEST_DATABASE_URL is required.');
  let parsed;
  try { parsed = new URL(testUrl); } catch { throw new Error('Invalid PostgreSQL test URL.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('Invalid PostgreSQL test URL.');
  if (!['127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('Test database must be loopback.');
  if ([...parsed.searchParams.keys()].some((key) => key !== 'schema') || parsed.hash) {
    throw new Error('Connection-routing query parameters are forbidden.');
  }
  const database = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '').toLowerCase();
  if (database.includes('/') || !/(^|[^a-z0-9])test([^a-z0-9]|$)/i.test(database)) {
    throw new Error('Database requires an explicit test marker.');
  }
  if (process.env.DATABASE_URL?.trim()) {
    let runtime;
    try { runtime = new URL(process.env.DATABASE_URL.trim()); } catch { throw new Error('Invalid runtime database URL.'); }
    if (runtime.hostname.toLowerCase() === parsed.hostname.toLowerCase() &&
      (runtime.port || '5432') === (parsed.port || '5432') &&
      decodeURIComponent(runtime.pathname).replace(/^\/+|\/+$/g, '').toLowerCase() === database) {
      throw new Error('Test database must be different from DATABASE_URL.');
    }
  }
  const backendRoot = process.env.EVRY_BACKEND_ROOT;
  if (!backendRoot) throw new Error('EVRY_BACKEND_ROOT is required.');
  // Also consume the backend's maintained database guard, not just our stricter
  // routing boundary. Node24 strips its type-only declarations.
  const { assertSafeTestDatabase } = await import(pathToFileURL(resolve(backendRoot, 'test/database-safety.ts')).href);
  assertSafeTestDatabase(testUrl, process.env.DATABASE_URL);
  const backendRequire = createRequire(resolve(backendRoot, 'package.json'));
  const { Client } = backendRequire('pg');
  const env = { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'evry-mobile-contract-access-fixture-at-least-32-characters',
    JWT_REFRESH_SECRET: 'evry-mobile-contract-refresh-fixture-at-least-32-characters',
    JWT_ACCESS_TTL: '15m', JWT_REFRESH_TTL: '30d', APP_TIME_ZONE: 'America/Bogota',
    CORS_ORIGIN: 'http://127.0.0.1:3000', SWAGGER_ENABLED: 'false', PORT: '4000' };
  for (const key of Object.keys(env)) if (key.startsWith('PG')) delete env[key];
  const connection = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
  try {
    await connection.connect();
    const { rows } = await connection.query('SELECT current_database() AS name, host(inet_server_addr()) AS host, inet_server_port() AS port');
    if (rows[0]?.name.toLowerCase() !== database ||
      !['127.0.0.1', '::1'].includes(rows[0]?.host) || rows[0]?.port !== Number(parsed.port || 5432)) {
      throw new Error('Synthetic database identity mismatch.');
    }
  } finally { await connection.end(); }
  // Quotas survive API restarts. Isolate whole suites with freshly migrated
  // databases, never requests with quota resets, delays or guard overrides.
  // The supplied database is only the verified local provisioning connection;
  // neither it nor previously created fixtures are reset or dropped.
  for (const suite of ['backend.contract.ts', 'backend-adoption.contract.ts', 'backend-restart.contract.ts', 'backend-domains.contract.ts', 'backend-progress.contract.tsx']) {
    const suiteDatabase = `evry_mobile_suite_test_${randomUUID().replaceAll('-', '')}`;
    const suiteUrl = new URL(testUrl);
    suiteUrl.pathname = `/${suiteDatabase}`;
    suiteUrl.searchParams.set('schema', 'public');
    assertSafeTestDatabase(suiteUrl.href, process.env.DATABASE_URL);
    const provision = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
    try {
      await provision.connect();
      // The identifier contains only a fixed prefix and a generated UUID. No
      // IF NOT EXISTS: collisions must fail rather than reuse existing data.
      await provision.query(`CREATE DATABASE "${suiteDatabase}"`);
    } finally { await provision.end(); }
    console.log(`Mobile contract fixture ${suite}: ${suiteDatabase}`);
    const suiteEnv = { ...env, DATABASE_URL: suiteUrl.href, TEST_DATABASE_URL: suiteUrl.href };
    const migration = spawn(process.execPath, [backendRequire.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: backendRoot, env: suiteEnv, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true,
    });
    const [migrationCode] = await once(migration, 'exit');
    if (migrationCode !== 0) throw new Error('Synthetic database suite migration failed.');
    server = fork(resolve(backendRoot, 'scripts/benchmark-api-server.cjs'), [], {
      cwd: backendRoot, env: suiteEnv, execArgv: [], stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true,
    });
    const ready = await waitForBackendReady(server);
    const origin = new URL(ready);
    if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:') throw new Error('Backend listener must be loopback.');
    const require = createRequire(resolve('apps/mobile/package.json'));
    const test = spawn(process.execPath, [require.resolve('jest/bin/jest'),
      '--config', resolve('apps/mobile/jest.config.cjs'), '--rootDir', resolve('apps/mobile'),
      '--runInBand', '--testMatch', `**/${suite}`], {
      cwd: process.cwd(), windowsHide: true, stdio: 'inherit',
      env: { ...suiteEnv, EXPO_PUBLIC_API_BASE_URL: `${origin.origin}/api/v1` },
    });
    const [code] = await once(test, 'exit');
    process.exitCode = code ?? 1;
    await closeServer(server);
    server = undefined;
    if (process.exitCode !== 0) break;
  }
} catch (error) {
  // Report fixed guard messages only; connection errors can include credentials.
  const safeMessage = error instanceof Error && /^(TEST_DATABASE_URL|Invalid |Test database|Connection-routing|Database requires|EVRY_BACKEND_ROOT|Synthetic database|Compiled backend|Backend listener)/.test(error.message);
  console.error(safeMessage ? error.message : 'Local mobile/backend verification failed.');
  process.exitCode = 1;
} finally {
  if (server) {
    try { await closeServer(server); }
    catch { console.error('Backend did not close cleanly.'); process.exitCode = 1; }
  }
}
