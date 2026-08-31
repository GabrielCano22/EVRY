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
const lf = (value) => value.replace(/\r\n/g, '\n');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const gitBytes = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const git = (cwd, ...args) => gitBytes(cwd, ...args).trim();
const fail = (message) => { throw new Error(message); };

function canonicalOrigin(origin) {
  const scp = /^git@github\.com:(.+)$/.exec(origin);
  if (scp) return scp[1].replace(/\/$/, '').replace(/\.git$/, '') === repository;
  try {
    const url = new URL(origin);
    return ['https:', 'ssh:'].includes(url.protocol) && url.hostname === 'github.com'
      && !url.port && !url.search && !url.hash
      && url.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.git$/, '') === repository;
  } catch { return false; }
}

function localReference(document, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) fail('Non-local OpenAPI reference is forbidden.');
  let value = document;
  for (const token of ref.slice(2).split('/')) {
    const key = decodeURIComponent(token).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) fail(`Missing local OpenAPI reference: ${ref}`);
    value = value[key];
  }
  return value;
}

function validateReferences(document, value = document) {
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, 'externalValue')) fail('External OpenAPI examples are forbidden.');
  if (Object.hasOwn(value, '$ref')) localReference(document, value.$ref);
  for (const child of Object.values(value)) validateReferences(document, child);
}

// Explicit arbitrary JSON is legitimate for legacy database JSON fields, but
// cannot stand in for an undocumented successful response or unknown property.
function isJsonValue(schema) {
  const variants = schema.oneOf ?? schema.anyOf;
  return Array.isArray(variants) && variants.length === 5
    && ['string', 'number', 'boolean'].every((type) => variants.some((item) => item.type === type))
    && variants.some((item) => item.type === 'object' && item.additionalProperties === true)
    && variants.some((item) => item.type === 'array' && item.items && Object.keys(item.items).length === 0);
}

function typedSchema(document, schema, refs = new Map(), depth = 0) {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.$ref) {
    if (refs.has(schema.$ref)) return depth > refs.get(schema.$ref);
    return typedSchema(document, localReference(document, schema.$ref), new Map(refs).set(schema.$ref, depth), depth);
  }
  if (depth > 0 && isJsonValue(schema)) return true;
  const compositions = ['allOf', 'oneOf', 'anyOf'].filter((key) => schema[key]);
  if (compositions.length) {
    return compositions.every((key) => Array.isArray(schema[key]) && schema[key].length
      && schema[key].every((child) => typedSchema(document, child, refs, depth)))
      && Object.values(schema.properties ?? {}).every((child) => typedSchema(document, child, refs, depth + 1));
  }
  if (Array.isArray(schema.enum) && schema.enum.length) return true;
  if (['string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)) return true;
  if (schema.type === 'array') return typedSchema(document, schema.items, refs, depth + 1);
  if (schema.type === 'object') {
    const fields = Object.values(schema.properties ?? {});
    return (fields.length > 0 && fields.every((child) => typedSchema(document, child, refs, depth + 1)))
      || (!fields.length && schema.additionalProperties === false)
      || (!fields.length && typedSchema(document, schema.additionalProperties, refs, depth + 1));
  }
  return false;
}

function responseSchema(document, response, refs = new Set()) {
  if (!response?.$ref) return response?.content?.['application/json']?.schema;
  if (refs.has(response.$ref)) return undefined;
  return responseSchema(document, localReference(document, response.$ref), new Set(refs).add(response.$ref));
}

function parameterSchema(document, parameter, refs = new Set()) {
  if (!parameter?.$ref) return parameter?.schema;
  if (refs.has(parameter.$ref)) return undefined;
  return parameterSchema(document, localReference(document, parameter.$ref), new Set(refs).add(parameter.$ref));
}

function validate(document) {
  if (!document.openapi?.startsWith('3.') || !Object.keys(document.paths ?? {}).length) fail('Missing OpenAPI 3 paths.');
  validateReferences(document);
  const ids = new Set();
  for (const [path, item] of Object.entries(document.paths)) {
    if (!path.startsWith('/api/v1/')) fail(`Unexpected unversioned path: ${path}`);
    for (const method of ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']) {
      const operation = item[method];
      if (!operation) continue;
      if (!operation.operationId || ids.has(operation.operationId)) fail(`Missing or duplicated operationId: ${method} ${path}`);
      ids.add(operation.operationId);
      for (const parameter of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
        if (!typedSchema(document, parameterSchema(document, parameter))) fail(`Missing input schema: ${method} ${path} parameter`);
      }
      if (operation.requestBody && !typedSchema(document, responseSchema(document, operation.requestBody))) {
        fail(`Missing input schema: ${method} ${path} request body`);
      }
      const success = Object.entries(operation.responses ?? {}).filter(([status]) => /^2\d\d$/.test(status));
      if (!success.length) fail(`Missing success schema: ${method} ${path}`);
      for (const [status, response] of success) {
        if (status !== '204' && !typedSchema(document, responseSchema(document, response))) {
          fail(`Missing success schema: ${method} ${path} ${status}`);
        }
      }
    }
  }
}

async function generate(bytes) {
  const document = JSON.parse(bytes);
  validate(document);
  return astToString(await openapiTS(document, { defaultNonNullable: false }));
}

async function local() {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  if (lock.repository !== repository || !/^[a-f0-9]{40}$/.test(lock.revision)) fail('Invalid backend revision lock.');
  const bytes = lf(await readFile(documentPath, 'utf8'));
  if (sha256(bytes) !== lock.documentSha256) fail('Copied OpenAPI document does not match its locked hash; use api:sync.');
  return { lock, bytes };
}

async function source(backend) {
  if (!backend) fail('Pass --backend <checkout> or set EVRY_BACKEND_ROOT.');
  const cwd = resolve(backend);
  if (!canonicalOrigin(git(cwd, 'remote', 'get-url', 'origin'))) fail('Unexpected backend repository origin.');
  if (git(cwd, 'status', '--porcelain')) fail('Backend has uncommitted changes; commit generated contract and implementation before syncing.');
  const revision = git(cwd, 'rev-parse', 'HEAD');
  const committed = (path) => {
    try { return lf(gitBytes(cwd, 'show', `${revision}:${path}`)); }
    catch { fail(`Missing committed backend artifact: ${path}`); }
  };
  const bytes = committed('openapi/evry-v1.json');
  const generated = await generate(bytes);
  const sourceClient = committed('openapi/client.generated.ts');
  if (sourceClient !== generated) fail('Backend generated client differs from its OpenAPI schema.');
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
  if (lf(await readFile(clientPath, 'utf8')) !== generated) fail('Generated client drift; run api:generate and commit it.');
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
