import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const backendRoot = resolve(frontendRoot, '../../..', 'EVRY-Backend', '.worktrees', 'release-candidate');
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
const runtimeDatabaseUrl = process.env.DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required before starting Playwright services.');
}

if (testDatabaseUrl === runtimeDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must be different from DATABASE_URL.');
}

if (!/(^|[^a-z0-9])test([^a-z0-9]|$)/i.test(testDatabaseUrl)) {
  throw new Error('TEST_DATABASE_URL must contain an explicit test marker.');
}

const backendEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '4000',
  APP_TIME_ZONE: 'America/Bogota',
  JWT_ACCESS_SECRET: 'evry-test-access-secret-only',
  JWT_REFRESH_SECRET: 'evry-test-refresh-secret-only',
  SWAGGER_ENABLED: 'false',
  DATABASE_URL: testDatabaseUrl,
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    timezoneId: 'America/Bogota',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
      cwd: frontendRoot,
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run start:dev',
      cwd: backendRoot,
      url: 'http://127.0.0.1:4000/api',
      env: backendEnvironment,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
