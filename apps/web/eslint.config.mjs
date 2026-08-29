import nextTypescript from "eslint-config-next/typescript";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [...nextTypescript, ...nextCoreWebVitals, {
  ignores: ['.next/**', '.next-dev/**', 'node_modules/**'],
  rules: {
    // Existing client loaders are migrated to TanStack Query incrementally.
    'react-hooks/set-state-in-effect': 'off',
  },
}, {
  files: ['app/(app)/progress/page.tsx'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
}, {
  files: ['app/(app)/workout/*/page.tsx', 'app/(app)/workout/routines/*/page.tsx'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',
  },
}, {
  files: ['components/ExerciseMedia.tsx'],
  rules: {
    '@next/next/no-img-element': 'off',
  },
}];

export default config;
