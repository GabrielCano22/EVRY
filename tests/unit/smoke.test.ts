import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

test('runs with the America/Bogota timezone', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Bogota');
});

test('provides Testing Library jest-dom matchers', () => {
  document.body.innerHTML = '<main aria-label="EVRY test surface"></main>';

  expect(screen.getByRole('main')).toBeInTheDocument();
});
