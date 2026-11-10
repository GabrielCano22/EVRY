import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import baseline from './playwright.auth-performance.config';

const outputDir = fileURLToPath(new URL(
  `../../.worktrees/web-auth-controlled-performance-${process.env.EVRY_WEB_AUTH_PERFORMANCE_RUN_ID}/`, import.meta.url,
));

export default defineConfig({
  ...baseline,
  outputDir,
  reporter: [['list'], ['json', { outputFile: `${outputDir}/results.json` }]],
  retries: 0,
  projects: baseline.projects?.map(project => ({
    ...project,
    name: `controlled-${project.name}`,
    metadata: { ...project.metadata, controlledPerformance: true },
  })),
});
