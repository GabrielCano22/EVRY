import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';

const repository = 'GabrielCano22/EVRY-Backend';
const root = process.cwd();
const contractDir = join(root, 'packages/api-client/openapi');
const documentPath = join(contractDir, 'evry-v1.json');
const lockPath = join(contractDir, 'backend.lock.json');
const clientPath = join(root, 'packages/api-client/src/schema.ts');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const fail = (message) => { throw new Error(message); };

function validate(document) {
  if (!document.openapi?.startsWith('3.') || !Object.keys(document.paths ?? {}).length) fail('Missing OpenAPI 3 paths.');
  const ids = new Set();
  for (const [path, item] of Object.entries(document.paths)) {
    if (!path.startsWith('/api/v1/')) fail(`Unexpected unversioned path: ${path}`);
    for (const method of ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']) {
      const operation = item[method];
      if (!operation) continue;
      if (!operation.operationId || ids.has(operation.operationId)) fail(`Missing or duplicated operationId: ${method} ${path}`);
      ids.add(operation.operationId);
      const success = Object.entries(operation.responses ?? {}).filter(([status]) => /^2\d\d$/.test(status));
      if (!success.length) fail(`Missing success schema: ${method} ${path}`);
      for (const [status, response] of success) {
        if (status !== '204' && !response.content?.['application/json']?.schema && !response.$ref) {
          fail(`Missing success schema: ${method} ${path} ${status}`);
        }
      }
    }
  }
}

async function generate(bytes) {
  const document = JSON.parse(bytes);
  validate(document);
  return astToString(await openapiTS(document));
}

async function local() {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  if (lock.repository !== repository || !/^[a-f0-9]{40}$/.test(lock.revision)) fail('Invalid backend revision lock.');
  const bytes = await readFile(documentPath, 'utf8');
  if (sha256(bytes) !== lock.documentSha256) fail('Copied OpenAPI document does not match its locked hash; use api:sync.');
  return { lock, bytes };
}

async function source(backend) {
  if (!backend) fail('Pass --backend <checkout> or set EVRY_BACKEND_ROOT.');
  const cwd = resolve(backend);
  const origin = git(cwd, 'remote', 'get-url', 'origin').replace(/\.git$/, '').replace(/\/$/, '');
  if (!origin.endsWith(`github.com/${repository}`) && !origin.endsWith(`github.com:${repository}`)) fail('Unexpected backend repository origin.');
  if (git(cwd, 'status', '--porcelain')) fail('Backend has uncommitted changes; commit generated contract and implementation before syncing.');
  const revision = git(cwd, 'rev-parse', 'HEAD');
  const bytes = await readFile(join(cwd, 'openapi/evry-v1.json'), 'utf8');
  const generated = await generate(bytes);
  const sourceClient = await readFile(join(cwd, 'openapi/client.generated.ts'), 'utf8');
  if (sourceClient.replace(/\r\n/g, '\n') !== generated) fail('Backend generated client differs from its OpenAPI schema.');
  return { revision, bytes, generated };
}

async function main() {
  const command = process.argv[2] ?? 'check';
  const backendIndex = process.argv.indexOf('--backend');
  const backend = backendIndex >= 0 ? process.argv[backendIndex + 1] : process.env.EVRY_BACKEND_ROOT;
  if (command === 'ref') {
    const { lock } = await local();
    process.stdout.write(lock.revision);
    return;
  }
  if (command === 'sync') {
    const data = await source(backend);
    await mkdir(contractDir, { recursive: true });
    await mkdir(join(root, 'packages/api-client/src'), { recursive: true });
    await writeFile(documentPath, data.bytes);
    await writeFile(clientPath, data.generated);
    await writeFile(lockPath, `${JSON.stringify({ repository, revision: data.revision, documentSha256: sha256(data.bytes), clientSha256: sha256(data.generated) }, null, 2)}\n`);
    process.stdout.write(`Imported backend contract ${data.revision}\n`);
    return;
  }
  const { lock, bytes } = await local();
  const generated = await generate(bytes);
  if (sha256(generated) !== lock.clientSha256) fail('Generated client does not match the locked backend client.');
  if (command === 'generate') {
    await writeFile(clientPath, generated);
    return;
  }
  if ((await readFile(clientPath, 'utf8')).replace(/\r\n/g, '\n') !== generated) fail('Generated client drift; run api:generate and commit it.');
  if (command === 'verify-backend') {
    const data = await source(backend);
    if (data.revision !== lock.revision) fail('Backend revision differs from the pinned source.');
    if (data.bytes !== bytes) fail('Backend document differs from the copied source.');
  } else if (command !== 'check') {
    fail(`Unknown command: ${command}`);
  }
  process.stdout.write('Contract verified.\n');
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
