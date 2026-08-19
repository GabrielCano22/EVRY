import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL('.', import.meta.url)),
});

const config = [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['.next/**', '.next-dev/**', 'node_modules/**'],
  },
  {
    files: ['app/(app)/progress/page.tsx'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['app/(app)/workout/*/page.tsx', 'app/(app)/workout/routines/*/page.tsx'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['components/ExerciseMedia.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
