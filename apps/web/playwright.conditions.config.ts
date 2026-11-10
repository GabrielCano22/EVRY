import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.controlled-probe.ts',
  workers: 1,
  timeout: 30_000,
  outputDir: '../../.worktrees/conditions-probe',
  reporter: [['list'], ['json', { outputFile: '../../.worktrees/conditions-probe/results.json' }]],
  use: { serviceWorkers: 'block' },
});
