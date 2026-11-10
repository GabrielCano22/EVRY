import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse } from '@playwright/test';

const api = 'http://127.0.0.1:4000/api/v1';
async function json<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `Synthetic history fixture ${response.status()} ${new URL(response.url()).pathname}`).toBe(true);
  return response.json() as Promise<T>;
}

test('older completed workouts remain accessible through real paginated API reads', async ({ page, request }) => {
  test.setTimeout(60000);
  const suffix = randomUUID();
  const email = `history-${suffix}@example.test`;
  const password = `Synthetic-history-${suffix}`;
  const auth = await json<{ accessToken: string }>(await request.post(`${api}/auth/mobile/register`, {
    data: { email, password, name: 'History fixture', trackCycle: false },
  }));
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const exercise = await json<{ id: string }>(await request.post(`${api}/exercises`, {
    headers, data: { name: `Ejercicio historial ${suffix.slice(0, 8)}`, muscleGroup: 'CHEST', equipment: 'BARBELL' },
  }));
  let oldestId = '';
  for (let index = 1; index <= 24; index++) {
    const workout = await json<{ id: string }>(await request.post(`${api}/workouts`, {
      headers, data: { name: `Historial prueba ${index}` },
    }));
    if (index === 1) oldestId = workout.id;
    await json(await request.post(`${api}/workouts/${workout.id}/sets`, {
      headers, data: { exerciseId: exercise.id, order: 0, weightKg: 10, reps: 5, clientMutationId: randomUUID() },
    }));
    await json(await request.post(`${api}/workouts/${workout.id}/finish`, { headers, data: {} }));
  }
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Historial prueba 24', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Historial prueba \d+$/ })).toHaveCount(20);
  await expect(page.getByRole('heading', { name: 'Historial prueba 1', exact: true })).toHaveCount(0);
  const older = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/workouts' && url.searchParams.get('skip') === '20';
  });
  await page.getByRole('button', { name: 'Cargar más sesiones', exact: true }).click();
  const response = await older;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).searchParams.get('take')).toBe('20');
  await expect(page.getByRole('heading', { name: /^Historial prueba \d+$/ })).toHaveCount(24);
  await expect(page.getByRole('link', { name: /Historial prueba 1\s/ })).toHaveAttribute('href', `/workout/${oldestId}`);
  await expect(page.getByRole('button', { name: 'Cargar más sesiones', exact: true })).toHaveCount(0);
});
