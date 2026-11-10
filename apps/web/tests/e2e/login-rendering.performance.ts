import { expect, test } from '@playwright/test';

test('login content remains fully readable at the beginning of its entrance animation', async ({ page, context }) => {
  await context.route('**/*', async route => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:3000') return route.continue();
    await route.abort('blockedbyclient');
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/login');
  const card = page.locator('.animate-rise');
  await expect(card).toBeVisible();
  await card.evaluate(element => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error('Missing actual entrance animation');
    animation.pause();
    animation.currentTime = 0;
  });
  await expect(card).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { name: 'Bienvenida de vuelta' })).toBeVisible();
});
