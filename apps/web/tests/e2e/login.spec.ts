import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function esperaQueLaTarjetaDeIngresoSeEstabilice(page: import('@playwright/test').Page) {
  const tarjeta = page.locator('.animate-rise');
  await expect(tarjeta).toBeVisible();
  await tarjeta.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map(async (animation) => {
      try {
        await animation.finished;
      } catch {
        // The animation may be cancelled by a navigation; the settled opacity check below remains authoritative.
      }
    }));
  });
  await expect(tarjeta).toHaveCSS('opacity', '1');
}

async function verificaIngresoAccesible(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });

  await esperaQueLaTarjetaDeIngresoSeEstabilice(page);
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
}

test('login remains keyboard-accessible at 200% zoom after its entrance animation finishes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await verificaIngresoAccesible(page);
});

test('login remains keyboard-accessible at 200% zoom with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await verificaIngresoAccesible(page);
});
