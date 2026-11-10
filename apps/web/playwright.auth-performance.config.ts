import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildPlaywrightConfig } from './playwright.config.options';
import { assertLocalPerformanceDatabase } from './tests/e2e/helpers/performance-database';

assertLocalPerformanceDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const backendRoot = process.env.EVRY_BACKEND_ROOT?.trim()
  ? resolve(process.env.EVRY_BACKEND_ROOT) : resolve(frontendRoot, '../../../backend');
process.env.EVRY_WEB_AUTH_PERFORMANCE_RUN_ID ??= `${Date.now()}-${randomUUID()}`;
const runId = process.env.EVRY_WEB_AUTH_PERFORMANCE_RUN_ID;
if (!/^\d+-[a-f0-9-]{36}$/.test(runId)) throw new Error('Invalid local performance run ID');
const outputDir = fileURLToPath(new URL(`../../.worktrees/web-auth-performance-${runId}/`, import.meta.url));
const base = buildPlaywrightConfig({ frontendRoot, backendRoot, environment: process.env });
if (!Array.isArray(base.webServer) || base.webServer.length !== 2) throw new Error('Expected isolated web and API test servers');
const servers = base.webServer;
const localApiRunner = resolve(frontendRoot, '../../scripts/web-performance-api-server.cjs');

export default defineConfig({
  ...base,
  webServer: [servers[0], {
    ...servers[1],
    command: `node "${localApiRunner}"`,
    env: { ...servers[1].env, EVRY_BACKEND_ROOT: backendRoot },
  }],
  testMatch: '**/*.authenticated-performance.ts',
  timeout: 420_000,
  // An early failure must not immediately replay 93 set creations against the
  // same real IP limiter in the next profile. A failed run remains failed.
  maxFailures: 1,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  use: { baseURL: 'http://127.0.0.1:3000', timezoneId: 'America/Bogota', serviceWorkers: 'block', actionTimeout: 10_000, navigationTimeout: 15_000 },
});
