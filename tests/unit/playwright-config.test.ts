import { expect, test } from 'vitest';
import { buildPlaywrightConfig } from '../../playwright.config.options';

const frontendRoot = 'D:/workspace/EVRY/.worktrees/release-candidate';
const backendRoot = 'D:/workspace/EVRY-Backend/.worktrees/release-candidate';
type WebServer = {
  env?: Record<string, string | undefined>;
  url?: string;
  reuseExistingServer?: boolean;
};

function createEnvironment() {
  return {
    TEST_DATABASE_URL: 'postgresql://evry:secret@localhost:5432/evry_test',
    DATABASE_URL: 'postgresql://evry:secret@localhost:5432/evry',
    TZ: 'UTC',
  };
}

test('sets the Playwright process and both e2e servers to the Bogotá timezone', () => {
  const environment = createEnvironment();
  const config = buildPlaywrightConfig({ frontendRoot, backendRoot, environment });
  const webServers = config.webServer;

  expect(Array.isArray(webServers)).toBe(true);
  const [frontendServer, backendServer] = webServers as WebServer[];

  expect(environment.TZ).toBe('America/Bogota');
  expect(frontendServer?.env?.TZ).toBe('America/Bogota');
  expect(backendServer?.env?.TZ).toBe('America/Bogota');
});

test('starts e2e servers without reuse and probes backend health', () => {
  const config = buildPlaywrightConfig({
    frontendRoot,
    backendRoot,
    environment: createEnvironment(),
  });
  const webServers = config.webServer;

  expect(Array.isArray(webServers)).toBe(true);
  const [, backendServer] = webServers as WebServer[];

  expect(backendServer).toMatchObject({
    url: 'http://127.0.0.1:4000/health',
    reuseExistingServer: false,
  });
});

test('prepara el origen público canónico y fixtures JWT de prueba seguros para sus servidores', () => {
  const config = buildPlaywrightConfig({
    frontendRoot,
    backendRoot,
    environment: createEnvironment(),
  });
  const webServers = config.webServer;

  expect(Array.isArray(webServers)).toBe(true);
  const [frontendServer, backendServer] = webServers as WebServer[];
  const accessSecret = backendServer?.env?.JWT_ACCESS_SECRET;
  const refreshSecret = backendServer?.env?.JWT_REFRESH_SECRET;

  expect(frontendServer?.env?.NEXT_PUBLIC_API_BASE_URL).toBe('http://127.0.0.1:4000/api');
  expect(frontendServer?.env?.NEXT_PUBLIC_API_URL).toBeUndefined();
  expect(accessSecret).not.toBe(refreshSecret);
  expect(accessSecret?.length).toBeGreaterThanOrEqual(32);
  expect(refreshSecret?.length).toBeGreaterThanOrEqual(32);
});

test('rejects equivalent PostgreSQL database identities in Playwright configuration', () => {
  expect(() => buildPlaywrightConfig({
    frontendRoot,
    backendRoot,
    environment: {
      TEST_DATABASE_URL: 'postgresql://test-user:secret@LOCALHOST:5432/evry_test?application_name=test',
      DATABASE_URL: 'postgres://production:secret@localhost/evry_test',
    },
  })).toThrow('different');
});
