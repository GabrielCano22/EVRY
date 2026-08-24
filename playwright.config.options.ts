import { defineConfig, devices } from '@playwright/test';

type DatabaseIdentity = {
  protocol: 'postgresql';
  host: string;
  port: string;
  database: string;
};

type PlaywrightConfigOptions = {
  frontendRoot: string;
  backendRoot: string;
  environment: Record<string, string | undefined>;
};

const testTimeZone = 'America/Bogota';
const testApiBaseUrl = 'http://127.0.0.1:4000/api';
const testAccessSecret = 'evry-playwright-access-secret-fixture-2026';
const testRefreshSecret = 'evry-playwright-refresh-secret-fixture-2026';

function parsePostgresDatabaseUrl(url: string, variableName: string): DatabaseIdentity {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  const database = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '').toLowerCase();

  if (!parsed.hostname || !database || database.includes('/')) {
    throw new Error(`${variableName} must identify a PostgreSQL database.`);
  }

  return {
    protocol: 'postgresql',
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || '5432',
    database,
  };
}

function isExplicitTestDatabase(databaseName: string): boolean {
  return /(^|[^a-z0-9])test([^a-z0-9]|$)/i.test(databaseName);
}

function identifiesSameDatabase(left: DatabaseIdentity, right: DatabaseIdentity): boolean {
  return left.protocol === right.protocol
    && left.host === right.host
    && left.port === right.port
    && left.database === right.database;
}

export function buildPlaywrightConfig({
  frontendRoot,
  backendRoot,
  environment,
}: PlaywrightConfigOptions) {
  environment.TZ = testTimeZone;

  const testDatabaseUrl = environment.TEST_DATABASE_URL?.trim();
  const runtimeDatabaseUrl = environment.DATABASE_URL?.trim();

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required before starting Playwright services.');
  }

  const testDatabase = parsePostgresDatabaseUrl(testDatabaseUrl, 'TEST_DATABASE_URL');
  const runtimeDatabase = runtimeDatabaseUrl
    ? parsePostgresDatabaseUrl(runtimeDatabaseUrl, 'DATABASE_URL')
    : undefined;

  if (runtimeDatabase && identifiesSameDatabase(testDatabase, runtimeDatabase)) {
    throw new Error('TEST_DATABASE_URL must be different from DATABASE_URL.');
  }

  if (!isExplicitTestDatabase(testDatabase.database)) {
    throw new Error('TEST_DATABASE_URL must contain an explicit test marker.');
  }

  const { NEXT_PUBLIC_API_URL: _legacyApiUrl, ...canonicalEnvironment } = environment;
  const frontendEnvironment = {
    ...canonicalEnvironment,
    TZ: testTimeZone,
    NEXT_PUBLIC_API_BASE_URL: testApiBaseUrl,
  };
  const backendEnvironment = {
    ...environment,
    TZ: testTimeZone,
    NODE_ENV: 'test',
    PORT: '4000',
    APP_TIME_ZONE: testTimeZone,
    JWT_ACCESS_SECRET: testAccessSecret,
    JWT_REFRESH_SECRET: testRefreshSecret,
    SWAGGER_ENABLED: 'false',
    DATABASE_URL: testDatabaseUrl,
  };

  return defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    use: {
      baseURL: 'http://127.0.0.1:3000',
      timezoneId: testTimeZone,
    },
    projects: [
      { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'mobile-chromium', use: { ...devices['iPhone 13'] } },
    ],
    webServer: [
      {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
        cwd: frontendRoot,
        env: frontendEnvironment,
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: false,
      },
      {
        command: 'npm run start:dev',
        cwd: backendRoot,
        url: 'http://127.0.0.1:4000/health',
        env: backendEnvironment,
        reuseExistingServer: false,
      },
    ],
  });
}
