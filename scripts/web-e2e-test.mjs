import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const loopback = (host) => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host.toLowerCase());
function databaseUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Invalid PostgreSQL ${label} URL.`); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`Invalid PostgreSQL ${label} URL.`);
  let database;
  try { database = decodeURIComponent(url.pathname.slice(1)); } catch { throw new Error('Invalid test database name.'); }
  if (!database || database.includes('/')) throw new Error('Invalid test database name.');
  return { url, database };
}

export function validateWebTestEnvironment(environment) {
  const testUrl = environment.TEST_DATABASE_URL?.trim();
  if (!testUrl) throw new Error('TEST_DATABASE_URL is required.');
  const test = databaseUrl(testUrl, 'test');
  if (!loopback(test.url.hostname)) throw new Error('Test database must be loopback.');
  const params = [...test.url.searchParams];
  if (test.url.hash || params.length > 1 || params.some(([key, value]) => key !== 'schema' || value !== 'public')) {
    throw new Error('Connection-routing query parameters are forbidden.');
  }
  if (!/(^|[^a-z0-9])test([^a-z0-9]|$)/i.test(test.database)) throw new Error('Database requires an explicit test marker.');
  const runtimeUrl = environment.DATABASE_URL?.trim()
    || 'postgresql://blocked:blocked@127.0.0.1:1/evry_runtime_blocked';
  const runtime = databaseUrl(runtimeUrl, 'runtime');
  const sameHost = test.url.hostname.toLowerCase() === runtime.url.hostname.toLowerCase()
    || (loopback(test.url.hostname) && loopback(runtime.url.hostname));
  if (sameHost && (test.url.port || '5432') === (runtime.url.port || '5432')
    && test.database.toLowerCase() === runtime.database.toLowerCase()) {
    throw new Error('Test database must be different from DATABASE_URL.');
  }
  if (!environment.EVRY_BACKEND_ROOT?.trim()) throw new Error('EVRY_BACKEND_ROOT is required.');
  if (environment.VERCEL === '1') throw new Error('Web E2E requires local ingress, not Vercel.');
  return { testUrl, runtimeUrl, backendRoot: resolve(environment.EVRY_BACKEND_ROOT) };
}

function collectSuites(report, testRoot, completed) {
  const fail = () => { throw new Error('Web E2E report is incomplete, filtered, skipped or unsuccessful.'); };
  if (!report || !Array.isArray(report.errors) || report.errors.length || !Array.isArray(report.suites)
    || !report.config?.rootDir || resolve(report.config.rootDir) !== resolve(testRoot)
    || !Array.isArray(report.config.projects)) fail();
  const projects = report.config.projects.map((project) => project.name);
  if (new Set(projects).size !== projects.length || !projects.includes('desktop-chromium')
    || !projects.includes('mobile-chromium')) fail();
  const files = new Map();
  function visit(suites) {
    if (!Array.isArray(suites)) fail();
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        if (typeof spec.file !== 'string' || isAbsolute(spec.file) || typeof spec.id !== 'string'
          || !spec.id || !Array.isArray(spec.tests) || !spec.tests.length) fail();
        const file = resolve(testRoot, spec.file);
        const offset = relative(testRoot, file);
        if (offset.startsWith('..') || isAbsolute(offset)) fail();
        const entry = files.get(file) ?? { keys: new Set(), projects: new Set() };
        for (const test of spec.tests) {
          const key = JSON.stringify([spec.id, test.projectName]);
          if (!projects.includes(test.projectName) || test.expectedStatus !== 'passed' || entry.keys.has(key)) fail();
          if (completed && (test.status !== 'expected' || test.results?.length !== 1
            || test.results[0].status !== 'passed')) fail();
          entry.keys.add(key);
          entry.projects.add(test.projectName);
        }
        files.set(file, entry);
      }
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  if (!files.size) fail();
  return [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, entry]) => {
    if (entry.projects.size !== projects.length) fail();
    return { file, keys: [...entry.keys].sort() };
  });
}

export function discoverWebSuites(report, testRoot) { return collectSuites(report, testRoot, false); }

export function assertWebSuitePassed(report, suite, testRoot) {
  const actual = collectSuites(report, testRoot, true);
  if (actual.length !== 1 || actual[0].file !== suite.file
    || JSON.stringify(actual[0].keys) !== JSON.stringify(suite.keys)
    || report.stats?.expected !== suite.keys.length || report.stats.skipped !== 0
    || report.stats.unexpected !== 0 || report.stats.flaky !== 0) {
    throw new Error('Web E2E results do not cover the exact discovered cases.');
  }
}

export function playwrightFileFilter(file) {
  return '^' + file.split(/[/\\]/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[/\\\\]') + '$';
}

export async function provisionWebSuiteDatabase(Client, environment) {
  const { testUrl } = validateWebTestEnvironment(environment);
  const expected = databaseUrl(testUrl, 'test');
  const client = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT current_database() AS name, host(inet_server_addr()) AS host, inet_server_port() AS port');
    if (rows[0]?.name.toLowerCase() !== expected.database.toLowerCase()
      || !['127.0.0.1', '::1'].includes(rows[0]?.host)
      || rows[0]?.port !== Number(expected.url.port || 5432)) {
      throw new Error('Synthetic database identity mismatch.');
    }
    const database = `evry_web_suite_test_${randomUUID().replaceAll('-', '')}`;
    // Only a generated UUID enters this identifier. Never reuse, reset or drop
    // a supplied database, even when a previous test run failed.
    await client.query(`CREATE DATABASE "${database}"`);
    const url = new URL(testUrl);
    url.pathname = `/${database}`;
    url.searchParams.set('schema', 'public');
    return { database, url: url.href };
  } catch (error) {
    if (error.message === 'Synthetic database identity mismatch.') throw error;
    if (error.code === '42501') throw new Error('PostgreSQL test role requires CREATEDB.');
    throw new Error('Synthetic database provisioning failed.');
  } finally {
    try { await client.end(); } catch { throw new Error('Synthetic database connection did not close.'); }
  }
}

async function command(args, options) {
  const child = spawn(process.execPath, args, { ...options, stdio: 'inherit', windowsHide: true });
  const [code, signal] = await once(child, 'close');
  return signal ? 1 : code ?? 1;
}

async function main() {
  if (process.argv.length > 2) throw new Error('Web E2E gate does not accept case filters or command overrides.');
  // Guard before backend imports, SQL connections, provisioning or subprocesses.
  const configured = validateWebTestEnvironment(process.env);
  const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const webRoot = resolve(frontendRoot, 'apps/web');
  const testRoot = resolve(webRoot, 'tests/e2e');
  const { assertSafeTestDatabase } = await import(pathToFileURL(resolve(configured.backendRoot, 'test/database-safety.ts')).href);
  assertSafeTestDatabase(configured.testUrl, configured.runtimeUrl);
  const backendRequire = createRequire(resolve(configured.backendRoot, 'package.json'));
  const webRequire = createRequire(resolve(webRoot, 'package.json'));
  const cli = webRequire.resolve('@playwright/test/cli');
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: configured.runtimeUrl };
  // Do not inherit libpq service/host routing or ambient database credentials.
  for (const key of Object.keys(process.env)) if (key.startsWith('PG')) { delete process.env[key]; delete env[key]; }
  await mkdir(resolve(frontendRoot, '.worktrees'), { recursive: true });
  const runRoot = await mkdtemp(resolve(frontendRoot, '.worktrees/web-e2e-isolated-'));
  const discoveryFile = resolve(runRoot, 'discovery.json');
  const discoveryCode = await command([cli, 'test', '--list', '--reporter=json', `--output=${resolve(runRoot, 'discovery-artifacts')}`], {
    cwd: webRoot, env: { ...env, PLAYWRIGHT_JSON_OUTPUT_FILE: discoveryFile },
  });
  if (discoveryCode !== 0) throw new Error('Web E2E discovery failed.');
  const suites = discoverWebSuites(JSON.parse(await readFile(discoveryFile, 'utf8')), testRoot);
  const { Client } = backendRequire('pg');
  const summary = { suites: [], expectedCases: suites.reduce((total, suite) => total + suite.keys.length, 0) };
  let failed = false;
  for (const [index, suite] of suites.entries()) {
    const fixture = await provisionWebSuiteDatabase(Client, process.env);
    assertSafeTestDatabase(fixture.url, configured.runtimeUrl);
    console.log(`Web E2E fixture ${relative(testRoot, suite.file)}: ${fixture.database}`);
    const migrationCode = await command([backendRequire.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: configured.backendRoot, env: { ...env, DATABASE_URL: fixture.url, TEST_DATABASE_URL: fixture.url },
    });
    if (migrationCode !== 0) throw new Error('Synthetic database suite migration failed.');
    const output = resolve(runRoot, `suite-${index + 1}`);
    await mkdir(output);
    const reportFile = resolve(output, 'results.json');
    // Playwright treats positional paths as regexes. Anchor the complete path,
    // escaping metacharacters while accepting either Windows separator.
    const filter = playwrightFileFilter(suite.file);
    const code = await command([cli, 'test', filter, '--reporter=list,json', `--output=${resolve(output, 'artifacts')}`], {
      cwd: webRoot, env: { ...env, TEST_DATABASE_URL: fixture.url, PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile },
    });
    let passed = false;
    try {
      assertWebSuitePassed(JSON.parse(await readFile(reportFile, 'utf8')), suite, testRoot);
      passed = code === 0;
    } catch { /* Keep failed reports and run the remaining independent suites. */ }
    summary.suites.push({ file: relative(testRoot, suite.file), database: fixture.database,
      expectedCases: suite.keys.length, passed, report: relative(runRoot, reportFile) });
    failed ||= !passed;
    await writeFile(resolve(runRoot, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  }
  console.log(`Web E2E: ${summary.expectedCases} discovered cases in ${suites.length} isolated files; reports ${runRoot}`);
  if (failed) throw new Error('Web E2E has failed, skipped or incomplete cases.');
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    // Driver errors may contain passwords or URLs. Only our fixed guard/result
    // messages and the maintained backend guard's fixed messages are printable.
    const safe = /^(TEST_DATABASE_URL|Invalid |Test database|Database requires|Connection-routing|EVRY_BACKEND_ROOT|Web E2E|Synthetic database|PostgreSQL test role)/.test(error.message);
    console.error(safe ? error.message : 'Local web E2E verification failed.');
    process.exitCode = 1;
  });
}
