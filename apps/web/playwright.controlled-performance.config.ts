import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import baseline from './playwright.performance.config';

const outputDir = fileURLToPath(new URL(
  `../../.worktrees/web-controlled-performance-${process.env.EVRY_WEB_PERFORMANCE_RUN_ID}/`, import.meta.url,
));

export default defineConfig({
  ...baseline,
  testMatch: '**/login.performance.ts',
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  retries: 0,
  projects: [
    { name: 'Controlled Desktop Chrome', metadata: { controlledPerformance: true }, use: { ...devices['Desktop Chrome'] } },
    { name: 'Controlled Mobile Chrome', metadata: { controlledPerformance: true }, use: { ...devices['Pixel 5'] } },
  ],
});
