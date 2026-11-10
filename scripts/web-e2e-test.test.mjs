import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWebTestEnvironment, discoverWebSuites, assertWebSuitePassed, provisionWebSuiteDatabase, playwrightFileFilter } from './web-e2e-test.mjs';

const root = resolve('apps/web/tests/e2e');
const backendRoot = resolve('../backend');
const safe = 'postgresql://fixture@127.0.0.1:55438/evry_web_test?schema=public';
const runtime = 'postgresql://blocked@127.0.0.1:1/evry_runtime_blocked';
const environment = (url = safe, runtimeUrl = runtime) => ({ TEST_DATABASE_URL: url, DATABASE_URL: runtimeUrl, EVRY_BACKEND_ROOT: backendRoot });

test('accepts the explicit local provisioning identity without replacing its database', () => {
  assert.deepEqual(validateWebTestEnvironment(environment()), { testUrl: safe, runtimeUrl: runtime, backendRoot });
});

for (const [name, url, runtimeUrl, error] of [
  ['missing URL', '', runtime, /TEST_DATABASE_URL is required/],
  ['remote host', 'postgresql://fixture@example.test/evry_test', runtime, /loopback/],
  ['wrong protocol', 'https://secret@example.test/evry_test', runtime, /PostgreSQL/],
  ['unmarked database', 'postgresql://fixture@127.0.0.1/evry', runtime, /test marker/],
  ['database path traversal', 'postgresql://fixture@127.0.0.1/evry_test%2Fother', runtime, /database name/],
  ['host override', `${safe}&host=example.test`, runtime, /query parameters/],
  ['address override', `${safe}&hostaddr=192.0.2.1`, runtime, /query parameters/],
  ['non-public schema', safe.replace('schema=public', 'schema=private'), runtime, /query parameters/],
  ['duplicate schema', `${safe}&schema=public`, runtime, /query parameters/],
  ['URL fragment', `${safe}#secret`, runtime, /query parameters/],
  ['same runtime with different credentials', safe, safe.replace('fixture@', 'other:private-password@'), /different from DATABASE_URL/],
  ['same runtime through localhost alias', safe, 'postgresql://other@localhost:55438/evry_web_test', /different from DATABASE_URL/],
]) {
  test(`refuses ${name} before constructing a PostgreSQL client`, async () => {
    let constructions = 0;
    class NoConnection { constructor() { constructions++; } }
    await assert.rejects(provisionWebSuiteDatabase(NoConnection, environment(url, runtimeUrl)), error);
    assert.equal(constructions, 0);
  });
}

function report(files = ['alpha.spec.ts', 'nested/beta.spec.ts'], completed = false) {
  return {
    config: { rootDir: root, projects: [{ name: 'desktop-chromium' }, { name: 'mobile-chromium' }] },
    errors: [],
    stats: { expected: files.length * 2, skipped: 0, unexpected: 0, flaky: 0 },
    suites: files.map((file) => ({ file, suites: [{ specs: ['desktop-chromium', 'mobile-chromium'].map((projectName) => ({
      id: `${file}-case`, file, tests: [{ projectName, expectedStatus: 'passed',
        status: completed ? 'expected' : 'skipped', results: completed ? [{ status: 'passed' }] : [] }],
    })) }] })),
  };
}

test('discovers nested files and every project case without a fixed file allowlist', () => {
  assert.deepEqual(discoverWebSuites(report(), root), [
    { file: resolve(root, 'alpha.spec.ts'), keys: ['["alpha.spec.ts-case","desktop-chromium"]', '["alpha.spec.ts-case","mobile-chromium"]'] },
    { file: resolve(root, 'nested/beta.spec.ts'), keys: ['["nested/beta.spec.ts-case","desktop-chromium"]', '["nested/beta.spec.ts-case","mobile-chromium"]'] },
  ]);
});

for (const [name, mutate] of [
  ['compiler errors', (value) => { value.errors.push({ message: 'compile error' }); }],
  ['empty discovery', (value) => { value.suites = []; }],
  ['missing mobile project', (value) => { value.config.projects.pop(); }],
  ['missing project case', (value) => { value.suites[0].suites[0].specs.pop(); }],
  ['escaping file', (value) => { value.suites[0].suites[0].specs[0].file = '../outside.spec.ts'; }],
  ['duplicate case', (value) => { value.suites[0].suites[0].specs.push(value.suites[0].suites[0].specs[0]); }],
]) {
  test(`rejects ${name} instead of claiming a reduced discovery`, () => {
    const value = report(); mutate(value);
    assert.throws(() => discoverWebSuites(value, root), /Web E2E/);
  });
}

test('accepts a complete passed report for the exact discovered file and cases', () => {
  const [suite] = discoverWebSuites(report(['alpha.spec.ts']), root);
  assert.doesNotThrow(() => assertWebSuitePassed(report(['alpha.spec.ts'], true), suite, root));
});

for (const [name, mutate] of [
  ['missing project', (value) => { value.suites[0].suites[0].specs.pop(); }],
  ['unexpected file', (value) => { value.suites.push(...report(['extra.spec.ts'], true).suites); }],
  ['skipped case', (value) => { value.suites[0].suites[0].specs[0].tests[0].results[0].status = 'skipped'; }],
  ['flaky retry', (value) => { value.suites[0].suites[0].specs[0].tests[0].results.unshift({ status: 'failed' }); }],
  ['failure', (value) => { value.stats.unexpected = 1; }],
]) {
  test(`refuses a report with ${name}`, () => {
    const [suite] = discoverWebSuites(report(['alpha.spec.ts']), root);
    const value = report(['alpha.spec.ts'], true); mutate(value);
    assert.throws(() => assertWebSuitePassed(value, suite, root), /Web E2E/);
  });
}

function databaseClient(identity = { name: 'evry_web_test', host: '127.0.0.1', port: 55438 }) {
  const queries = [];
  let closed = 0;
  class Client {
    async connect() {}
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith('SELECT')) return { rows: [identity] };
      return { rows: [] };
    }
    async end() { closed++; }
  }
  return { Client, queries, get closed() { return closed; } };
}

test('provisions distinct fresh databases without reusing, deleting or resetting the supplied fixture', async () => {
  const driver = databaseClient();
  const first = await provisionWebSuiteDatabase(driver.Client, environment());
  const second = await provisionWebSuiteDatabase(driver.Client, environment());
  assert.notEqual(first.database, second.database);
  for (const fixture of [first, second]) {
    assert.match(fixture.database, /^evry_web_suite_test_[a-f0-9]{32}$/);
    assert.equal(new URL(fixture.url).pathname, `/${fixture.database}`);
    assert.equal(new URL(fixture.url).search, '?schema=public');
  }
  assert.equal(driver.queries.length, 4);
  assert.match(driver.queries[0], /^SELECT current_database/);
  assert.equal(driver.queries[1], `CREATE DATABASE "${first.database}"`);
  assert.equal(driver.queries[3], `CREATE DATABASE "${second.database}"`);
  assert.equal(driver.closed, 2);
});

for (const [name, identity] of [
  ['different database', { name: 'evry', host: '127.0.0.1', port: 55438 }],
  ['remote server', { name: 'evry_web_test', host: '192.0.2.1', port: 55438 }],
  ['different port', { name: 'evry_web_test', host: '127.0.0.1', port: 5432 }],
]) {
  test(`refuses ${name} after connecting, without provisioning`, async () => {
    const driver = databaseClient(identity);
    await assert.rejects(provisionWebSuiteDatabase(driver.Client, environment()), /Synthetic database identity/);
    assert.equal(driver.queries.length, 1);
    assert.equal(driver.closed, 1);
  });
}

for (const file of ['/workspace/[qa]/history.pagination.spec.ts', 'D:/workspace/test+run/calendar.spec.ts', 'D:\\workspace\\test+run\\calendar.spec.ts']) {
  test(`selects exactly the discovered file with escaped metacharacters: ${file}`, () => {
    const regex = new RegExp(playwrightFileFilter(file));
    assert.equal(regex.test(file), true);
    assert.equal(regex.test(file.replace('spec.ts', 'specXts')), false);
    assert.equal(regex.test(`${file}.extra`), false);
    assert.equal(regex.test(`prefix${file}`), false);
  });
}

const runner = fileURLToPath(new URL('./web-e2e-test.mjs', import.meta.url));
for (const [name, overrides, args, expected] of [
  ['missing provisioning URL', { TEST_DATABASE_URL: '' }, [], /TEST_DATABASE_URL is required/],
  ['remote URL with a credential', { TEST_DATABASE_URL: 'postgresql://fixture:never-print-this@example.test/evry_test' }, [], /loopback/],
  ['routing override', { TEST_DATABASE_URL: `${safe}&host=example.test` }, [], /query parameters/],
  ['runtime loopback alias', { DATABASE_URL: 'postgresql://other:never-print-this@localhost:55438/evry_web_test' }, [], /different from DATABASE_URL/],
  ['nonlocal ingress', { VERCEL: '1' }, [], /local ingress/],
  ['case filtering', {}, ['--grep=one-case'], /does not accept case filters/],
]) {
  test(`CLI refuses ${name} before importing backend or provisioning`, () => {
    const result = spawnSync(process.execPath, [runner, ...args], {
      encoding: 'utf8', env: { ...process.env, ...environment(), EVRY_BACKEND_ROOT: resolve('/nonexistent-evry-backend'), ...overrides },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.doesNotMatch(result.stderr, /Cannot find module|ENOENT|never-print-this|postgresql:\/\//);
  });
}
