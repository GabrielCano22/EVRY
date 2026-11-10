import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const localWindows = process.platform === 'win32' && !process.env.CI;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Local Windows thread initialization exceeded the worker-start deadline.
    // Use one isolated process locally; CI and other hosts retain two threads.
    // Case selection, isolation and all test/worker deadlines stay unchanged.
    maxWorkers: localWindows ? 1 : 2,
    pool: localWindows ? 'forks' : 'threads',
    setupFiles: ['./vitest.setup.ts'],
    env: {
      TZ: 'America/Bogota',
    },
  },
});
