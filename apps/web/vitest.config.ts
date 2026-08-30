import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    maxWorkers: 2,
    pool: 'threads',
    setupFiles: ['./vitest.setup.ts'],
    env: {
      TZ: 'America/Bogota',
    },
  },
});
