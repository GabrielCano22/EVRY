import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import openapiTS, { astToString } from 'openapi-typescript';

const script = fileURLToPath(new URL('./api-contract.mjs', import.meta.url));
const fixture = () => ({ openapi: '3.0.0', info: { title: 'Contract fixture', version: '1' }, paths: {
  '/api/v1/things': { get: { operationId: 'listThings', responses: { 200: { description: 'Items', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } } } } } } },
} });
const exec = (cwd, file, args) => spawnSync(file, args, { cwd, encoding: 'utf8', shell: false });
function git(cwd, ...args) {
  const result = exec(cwd, 'git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const run = (root, command, backend) => exec(root, process.execPath, [script, command, ...(backend ? ['--backend', backend] : [])]);
const runAsync = (root, command) => new Promise((resolveResult, reject) => {
  const child = spawn(process.execPath, [script, command], { cwd: root, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.on('error', reject);
  child.on('close', (status) => resolveResult({ status, stdout, stderr }));
});

async function workspace(t) {
  const prefix = join(tmpdir(), 'evry-contract-test-');
  const dir = await mkdtemp(prefix);
  t.after(async () => {
    assert.ok(resolve(dir).startsWith(resolve(prefix)));
    await rm(dir, { recursive: true, force: true });
  });
  const front = join(dir, 'frontend');
  const back = join(dir, 'backend');
  await mkdir(front);
  await mkdir(join(back, 'openapi'), { recursive: true });
  git(back, 'init', '-b', 'test-contract');
  git(back, 'config', 'user.name', 'Contract Fixture');
  git(back, 'config', 'user.email', 'contract@example.invalid');
  git(back, 'config', 'core.autocrlf', 'false');
  git(back, 'remote', 'add', 'origin', 'https://github.com/GabrielCano22/EVRY-Backend.git');
  const document = fixture();
  await writeFile(join(back, 'openapi/evry-v1.json'), `${JSON.stringify(document, null, 2)}\n`);
  await writeFile(join(back, 'openapi/client.generated.ts'), astToString(await openapiTS(document)));
  git(back, 'add', '.'); git(back, 'commit', '-m', 'Contract fixture');
  return { front, back };
}

test('imports the exact committed backend contract and verifies both generated artifacts', async (t) => {
  const { front, back } = await workspace(t);
  const imported = run(front, 'sync', back);
  assert.equal(imported.status, 0, imported.stderr);
  const lock = JSON.parse(await readFile(join(front, 'packages/api-client/openapi/backend.lock.json')));
  assert.equal(lock.revision, git(back, 'rev-parse', 'HEAD'));
  assert.equal(await readFile(join(front, 'packages/api-client/openapi/evry-v1.json'), 'utf8'), await readFile(join(back, 'openapi/evry-v1.json'), 'utf8'));
  assert.equal(run(front, 'check').status, 0);
  assert.equal(run(front, 'verify-backend', back).status, 0);
});

test('rejects handwritten changes in the copied document and generated client', async (t) => {
  const { front, back } = await workspace(t);
  assert.equal(run(front, 'sync', back).status, 0);
  await writeFile(join(front, 'packages/api-client/src/schema.ts'), 'export interface paths {}\n');
  assert.notEqual(run(front, 'check').status, 0);
  assert.equal(run(front, 'generate').status, 0);
  const path = join(front, 'packages/api-client/openapi/evry-v1.json');
  await writeFile(path, `${await readFile(path, 'utf8')} `);
  assert.notEqual(run(front, 'check').status, 0);
});

test('rejects uncommitted backend contracts instead of creating an unreproducible lock', async (t) => {
  const { front, back } = await workspace(t);
  await writeFile(join(back, 'openapi/evry-v1.json'), '{}');
  const result = run(front, 'sync', back);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /uncommitted/);
});

test('fails verification when the backend revision differs from the pinned source', async (t) => {
  const { front, back } = await workspace(t);
  assert.equal(run(front, 'sync', back).status, 0);
  git(back, 'commit', '--allow-empty', '-m', 'Another revision');
  const result = run(front, 'verify-backend', back);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /revision/);
});

test('refuses a committed success response without a schema', async (t) => {
  const { front, back } = await workspace(t);
  const document = fixture();
  document.paths['/api/v1/things'].get.responses[200] = { description: 'Unspecified' };
  await writeFile(join(back, 'openapi/evry-v1.json'), JSON.stringify(document));
  git(back, 'add', '.'); git(back, 'commit', '-m', 'Incomplete contract');
  const result = run(front, 'sync', back);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /success schema/);
});

test('imports the committed LF bytes from a clean CRLF backend checkout', async (t) => {
  const { front, back } = await workspace(t);
  const windowsCheckout = join(back, '..', 'backend-crlf');
  git(back, 'clone', '-c', 'core.autocrlf=true', back, windowsCheckout);
  git(windowsCheckout, 'remote', 'set-url', 'origin', 'https://github.com/GabrielCano22/EVRY-Backend.git');
  assert.match(await readFile(join(windowsCheckout, 'openapi/evry-v1.json'), 'utf8'), /\r\n/);
  assert.equal(git(windowsCheckout, 'status', '--porcelain'), '');
  const imported = run(front, 'sync', windowsCheckout);
  assert.equal(imported.status, 0, imported.stderr);
  const committed = exec(back, 'git', ['show', 'HEAD:openapi/evry-v1.json']);
  assert.equal(committed.status, 0, committed.stderr);
  assert.equal(await readFile(join(front, 'packages/api-client/openapi/evry-v1.json'), 'utf8'), committed.stdout);
  const verified = run(front, 'verify-backend', back);
  assert.equal(verified.status, 0, verified.stderr);
});

test('checks equivalent frontend CRLF files without modifying either artifact or lock', async (t) => {
  const { front, back } = await workspace(t);
  assert.equal(run(front, 'sync', back).status, 0);
  const documentPath = join(front, 'packages/api-client/openapi/evry-v1.json');
  const clientPath = join(front, 'packages/api-client/src/schema.ts');
  const lockPath = join(front, 'packages/api-client/openapi/backend.lock.json');
  for (const path of [documentPath, clientPath]) {
    await writeFile(path, (await readFile(path, 'utf8')).replace(/\n/g, '\r\n'));
  }
  const before = await Promise.all([documentPath, clientPath, lockPath].map((path) => readFile(path, 'utf8')));
  const checked = run(front, 'check');
  assert.equal(checked.status, 0, checked.stderr);
  const verified = run(front, 'verify-backend', back);
  assert.equal(verified.status, 0, verified.stderr);
  assert.deepEqual(await Promise.all([documentPath, clientPath, lockPath].map((path) => readFile(path, 'utf8'))), before);
});

test('refuses ignored artifacts absent from the pinned commit', async (t) => {
  const { front, back } = await workspace(t);
  await writeFile(join(back, '.gitignore'), 'openapi/\n');
  git(back, 'rm', '--cached', 'openapi/evry-v1.json', 'openapi/client.generated.ts');
  git(back, 'add', '.gitignore');
  git(back, 'commit', '-m', 'Ignore artifacts');
  assert.equal(git(back, 'status', '--porcelain'), '');
  const result = run(front, 'sync', back);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /committed.*artifact/);
});

test('reads both committed artifacts instead of assume-unchanged worktree replacements', async (t) => {
  const { front, back } = await workspace(t);
  const committed = await readFile(join(back, 'openapi/evry-v1.json'), 'utf8');
  git(back, 'update-index', '--assume-unchanged', 'openapi/evry-v1.json', 'openapi/client.generated.ts');
  await writeFile(join(back, 'openapi/evry-v1.json'), '{}');
  await writeFile(join(back, 'openapi/client.generated.ts'), 'not the committed client');
  assert.equal(git(back, 'status', '--porcelain'), '');
  const result = run(front, 'sync', back);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(join(front, 'packages/api-client/openapi/evry-v1.json'), 'utf8'), committed);
});

test('only accepts the canonical GitHub repository using HTTPS, SSH or SCP origins', async (t) => {
  const { front, back } = await workspace(t);
  for (const [origin, accepted] of [
    ['https://github.com/GabrielCano22/EVRY-Backend.git', true],
    ['ssh://git@github.com/GabrielCano22/EVRY-Backend.git', true],
    ['git@github.com:GabrielCano22/EVRY-Backend.git', true],
    ['https://evilgithub.com/GabrielCano22/EVRY-Backend.git', false],
    ['https://example.invalid/github.com/GabrielCano22/EVRY-Backend.git', false],
    ['git@evilgithub.com:GabrielCano22/EVRY-Backend.git', false],
    ['https://github.com/GabrielCano22/Other.git', false],
    ['http://github.com/GabrielCano22/EVRY-Backend.git', false],
  ]) {
    await t.test(origin, () => {
      git(back, 'remote', 'set-url', 'origin', origin);
      const result = run(front, 'sync', back);
      assert.equal(result.status, accepted ? 0 : 1, result.stderr);
      if (!accepted) assert.match(result.stderr, /repository origin/);
    });
  }
});

test('rejects untyped success bodies even behind local response or schema references', async (t) => {
  const { front, back } = await workspace(t);
  for (const [name, schema, responseReference] of [
    ['empty schema', {}, false],
    ['generic object', { type: 'object' }, false],
    ['array without typed items', { type: 'array', items: {} }, false],
    ['untyped object property', { type: 'object', properties: { value: {} } }, false],
    ['untyped union branch', { oneOf: [{ type: 'string' }, {}] }, false],
    ['referenced empty schema', { $ref: '#/components/schemas/Untyped' }, false],
    ['referenced response without a schema', undefined, true],
  ]) {
    await t.test(name, async () => {
      const document = fixture();
      document.components = { schemas: { Untyped: {} }, responses: { Unspecified: { description: 'No schema' } } };
      if (responseReference) {
        document.paths['/api/v1/things'].get.responses[200] = { $ref: '#/components/responses/Unspecified' };
      } else {
        document.paths['/api/v1/things'].get.responses[200].content['application/json'].schema = schema;
      }
      await writeFile(join(back, 'openapi/evry-v1.json'), `${JSON.stringify(document)}\n`);
      // Keep the client consistent, so a stale-client error cannot satisfy this test.
      await writeFile(join(back, 'openapi/client.generated.ts'), astToString(await openapiTS(document)));
      git(back, 'add', '.');
      git(back, 'commit', '-m', name);
      const result = run(front, 'sync', back);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /success schema/);
    });
  }
});

test('accepts concrete local response references, composed records and typed dictionaries', async (t) => {
  const { front, back } = await workspace(t);
  const document = fixture();
  document.paths['/api/v1/things'].get.responses[200] = { $ref: '#/components/responses/Things~1response' };
  document.components = {
    responses: { 'Things/response': { description: 'Items', content: { 'application/json': { schema: {
      type: 'array', items: { $ref: '#/components/schemas/Thing~1record~0v1' },
    } } } } },
    schemas: { 'Thing/record~v1': { type: 'object', properties: {
      id: { type: 'string' },
      labels: { type: 'object', additionalProperties: { type: 'string' } },
      parent: { type: 'object', nullable: true, allOf: [{ $ref: '#/components/schemas/Thing~1record~0v1' }] },
    } } },
  };
  await writeFile(join(back, 'openapi/evry-v1.json'), `${JSON.stringify(document)}\n`);
  await writeFile(join(back, 'openapi/client.generated.ts'), astToString(await openapiTS(document)));
  git(back, 'add', '.');
  git(back, 'commit', '-m', 'Concrete references');
  const imported = run(front, 'sync', back);
  assert.equal(imported.status, 0, imported.stderr);
  const checked = run(front, 'check');
  assert.equal(checked.status, 0, checked.stderr);
});

test('rejects external references before offline checks can perform network requests', async (t) => {
  const { front, back } = await workspace(t);
  assert.equal(run(front, 'sync', back).status, 0);
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }));
  });
  await new Promise((resolveListening) => server.listen(0, '127.0.0.1', resolveListening));
  t.after(() => new Promise((resolveClosed) => { server.closeAllConnections(); server.close(resolveClosed); }));
  const url = `http://127.0.0.1:${server.address().port}/external.json`;
  for (const kind of ['$ref', 'externalValue']) {
    await t.test(kind, async () => {
      const document = fixture();
      const media = document.paths['/api/v1/things'].get.responses[200].content['application/json'];
      if (kind === '$ref') media.schema = { $ref: url };
      else media.examples = { remote: { externalValue: url } };
      const bytes = `${JSON.stringify(document)}\n`;
      const lockPath = join(front, 'packages/api-client/openapi/backend.lock.json');
      const lock = JSON.parse(await readFile(lockPath, 'utf8'));
      lock.documentSha256 = createHash('sha256').update(bytes).digest('hex');
      await writeFile(join(front, 'packages/api-client/openapi/evry-v1.json'), bytes);
      await writeFile(lockPath, JSON.stringify(lock));
      requests = 0;
      const result = await runAsync(front, 'check');
      assert.equal(requests, 0, 'The supposedly offline check requested an external resource.');
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /[Ee]xternal|[Nn]on-local/);
    });
  }
});
