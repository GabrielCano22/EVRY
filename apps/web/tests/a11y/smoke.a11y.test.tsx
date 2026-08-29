import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { expect, test } from 'vitest';
import { AccessibleRenderSurface } from './render-accessible';

test('has no automatically detectable accessibility violations', async () => {
  const { container } = render(<AccessibleRenderSurface />);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });

  expect(results.violations).toHaveLength(0);
});
