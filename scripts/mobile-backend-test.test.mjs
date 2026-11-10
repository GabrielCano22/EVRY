import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { waitForBackendReady } from './mobile-backend-ready.mjs';

test('local Windows accepts fixture readiness after 30 seconds but before 120 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const child = new EventEmitter();
  const readiness = waitForBackendReady(child, { platform: 'win32', ci: undefined });
  t.mock.timers.tick(81000);
  child.emit('message', { ready: 'http://127.0.0.1:4321' });
  assert.equal(await readiness, 'http://127.0.0.1:4321');
});

for (const [name, platform, ci, deadline] of [
  ['local Windows', 'win32', undefined, 120000],
  ['Windows CI', 'win32', 'true', 30000],
  ['Linux', 'linux', undefined, 30000],
  ['macOS', 'darwin', undefined, 30000],
]) {
  test(`${name} rejects a fixture that misses its preparation deadline`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const child = new EventEmitter();
    const readiness = waitForBackendReady(child, { platform, ci });
    const rejected = assert.rejects(readiness, /initialization timed out/);
    t.mock.timers.tick(deadline);
    child.emit('message', { ready: 'http://127.0.0.1:4321' });
    await rejected;
  });
}

const runner = fileURLToPath(new URL('./mobile-backend-test.mjs', import.meta.url));
const safe = 'postgresql://fixture@127.0.0.1:55438/evry_contract_test';
for (const [name, url, runtime, expected] of [
  ['missing test URL', '', '', /TEST_DATABASE_URL is required/],
  ['remote database', 'postgresql://fixture@example.com/evry_test', '', /loopback/],
  ['runtime database name', 'postgresql://fixture@127.0.0.1:55438/evry', '', /test marker/],
  ['same runtime identity with different credentials', safe, 'postgresql://other@127.0.0.1:55438/evry_contract_test', /different from DATABASE_URL/],
  ['host address override', `${safe}?hostaddr=192.0.2.1`, '', /query parameters/],
  ['Unix socket override', `${safe}?host=/var/run/postgresql`, '', /query parameters/],
]) {
  test(`refuses ${name} before loading any backend or opening a listener`, () => {
    const result = spawnSync(process.execPath, [runner], {
      encoding: 'utf8',
      env: { ...process.env, TEST_DATABASE_URL: url, DATABASE_URL: runtime, EVRY_BACKEND_ROOT: '/nonexistent-evry-backend' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.doesNotMatch(result.stderr, /Cannot find module|ENOENT|fixture@|postgresql:\/\//);
  });
}
