const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { test } = require('node:test');

const projectRoot = resolve(__dirname, '..');
const child = `
  const { existsSync } = require('node:fs');
  const { join } = require('node:path');
  const { getDefaultConfig } = require('expo/metro-config');
  const exported = require('@expo/metro/metro/DeltaBundler/getTransformCacheKey');
  const getKey = exported.default ?? exported;
  const root = ${JSON.stringify(projectRoot)};
  const file = join(root, 'metro.config.js');
  const config = existsSync(file) ? require(file) : getDefaultConfig(root);
  const key = getKey({
    cacheVersion: config.cacheVersion,
    projectRoot: config.projectRoot,
    transformerConfig: {
      transformerPath: config.transformerPath,
      transformerConfig: config.transformer,
    },
  });
  console.log(JSON.stringify({ key }));
`;

function transformCacheKey(endpoint, privateSecret) {
  const run = spawnSync(process.execPath, ['-e', child], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      EXPO_PUBLIC_API_BASE_URL: endpoint,
      JWT_ACCESS_SECRET: privateSecret,
    },
    encoding: 'utf8',
    timeout: 60_000,
    windowsHide: true,
  });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout.trim()).key;
}

test('different public API endpoints cannot reuse Metro production transforms', () => {
  const first = transformCacheKey('https://api-a.example.invalid/api/v1', 'private-test-one');
  const second = transformCacheKey('https://api-b.example.invalid/api/v1', 'private-test-one');
  assert.notEqual(first, second);
});

test('the same endpoint keeps a deterministic transform key independent of private server secrets', () => {
  const first = transformCacheKey('https://api-a.example.invalid/api/v1', 'private-test-one');
  const second = transformCacheKey('https://api-a.example.invalid/api/v1', 'private-test-two');
  assert.equal(first, second);
});
