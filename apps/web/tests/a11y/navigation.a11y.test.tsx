import { cleanup, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/AppShell';

// Only Next's external route context is supplied; links, icons and store are real.
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));

afterEach(cleanup);

it('makes the mobile profile shortcut discoverable by its purpose', () => {
  render(<AppShell><h2>Entrenamiento</h2></AppShell>);
  const header = screen.getByRole('banner');
  expect(within(header).getByRole('link', { name: 'Abrir perfil' }))
    .toHaveAttribute('href', '/profile');
});

it('does not expose an unnamed navigation link in the actual shell', async () => {
  const { container } = render(<AppShell><h2>Entrenamiento</h2></AppShell>);
  const result = await axe(container, { runOnly: { type: 'rule', values: ['link-name'] } });
  expect(result.violations).toHaveLength(0);
});
