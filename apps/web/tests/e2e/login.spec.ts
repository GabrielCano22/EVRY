import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('login remains keyboard-accessible at 200% zoom', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });

  await expect(page.getByRole('heading', { name: 'Bienvenida de vuelta' })).toBeVisible();
  const email = page.getByRole('textbox', { name: 'Correo electrónico' });
  const password = page.getByLabel('Contraseña');
  await email.focus();
  await page.keyboard.type('persona@example.com');
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? '')))
    .toEqual([]);
});
