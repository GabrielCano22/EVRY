import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import baseline from './playwright.auth-controlled-performance.config';

const outputDir = fileURLToPath(new URL(
  `../../.worktrees/web-startup-diagnostic-${process.env.EVRY_WEB_AUTH_PERFORMANCE_RUN_ID}/`, import.meta.url,
));

// Separate opt-in diagnostic, never an alternative to the unprofiled CI gate.
export default defineConfig({
  ...baseline,
  // Keep startup output in this opt-in diagnostic so a readiness timeout can
  // be attributed to Next or Nest without changing either deadline or probe.
  webServer: Array.isArray(baseline.webServer) ? baseline.webServer.map((server, index) => ({
    ...server,
    name: index === 0 ? 'diagnostic-web' : 'diagnostic-api',
    stdout: 'pipe' as const,
    env: { ...server.env, EVRY_LOCAL_STARTUP_DIAGNOSTICS: '1' },
  })) : baseline.webServer,
  outputDir,
  testMatch: '**/*.startup-diagnostic.ts',
  projects: baseline.projects?.filter(project => project.name === 'controlled-desktop-chromium'),
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
});
