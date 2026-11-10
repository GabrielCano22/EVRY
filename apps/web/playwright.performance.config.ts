import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

process.env.EVRY_WEB_PERFORMANCE_RUN_ID ??= `${Date.now()}-${randomUUID()}`;
const runId = process.env.EVRY_WEB_PERFORMANCE_RUN_ID;
if (!/^\d+-[a-f0-9-]{36}$/.test(runId)) throw new Error('Invalid local performance run ID');
const outputDir = fileURLToPath(new URL(`../../.worktrees/web-performance-${runId}/`, import.meta.url));

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.performance.ts',
  timeout: 45_000,
  workers: 1,
  repeatEach: 3,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  use: { baseURL: 'http://127.0.0.1:3000', serviceWorkers: 'block' },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
