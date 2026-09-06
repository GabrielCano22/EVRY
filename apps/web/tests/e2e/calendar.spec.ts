import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { monthRange, parseCivilDate, timestampToLocalCivil } from '@evry/domain';

const api = 'http://127.0.0.1:4000/api/v1';
const origin = 'http://127.0.0.1:3000';

async function json(response: APIResponse) {
  const body = await response.text();
  expect(
    response.ok(),
    `Fixture request ${response.url()} returned ${response.status()}: ${body}`,
  ).toBeTruthy();
  return JSON.parse(body);
}

async function removeWorkoutFixture(
  request: APIRequestContext,
  workoutId: string,
  headers: Record<string, string>,
) {
  let response = await request.delete(`${api}/workouts/${workoutId}`, { headers });
  if (response.status() === 400) {
    const error = await response.json();
    if (error.message !== 'Cancela una sesión activa en lugar de eliminarla.') {
      throw new Error(`Unexpected workout cleanup response: ${JSON.stringify(error)}`);
    }
    await json(await request.post(`${api}/workouts/${workoutId}/cancel`, { headers, data: {} }));
    response = await request.delete(`${api}/workouts/${workoutId}`, { headers });
  }
  await json(response);
}

test('login and refresh preserve a completed workout in its monthly calendar', async ({ page, request }) => {
  // The Playwright configuration only starts services against an explicitly named test database.
  // Each run owns a unique synthetic account; no existing user or workout is modified.
  const email = `calendar-${randomUUID()}@example.test`;
  const password = 'Calendar-fixture-password-2026';
  const registration = await json(await request.post(`${api}/auth/register`, {
    headers: { Origin: origin }, data: { email, password, name: 'Calendar fixture', trackCycle: false },
  }));
  const headers = { Authorization: `Bearer ${registration.accessToken}`, Origin: origin };
  let exerciseId: string | undefined;
  let workoutId: string | undefined;
  let primaryError: unknown;
  try {
    const exercise = await json(await request.post(`${api}/exercises`, {
      headers, data: { name: 'Sentadilla calendario', muscleGroup: 'QUADS', equipment: 'BARBELL' },
    }));
    exerciseId = exercise.id;
    const workout = await json(await request.post(`${api}/workouts`, { headers, data: { name: 'Sesión calendario' } }));
    workoutId = workout.id;
    for (const [order, weightKg, reps, isWarmup] of [[0, 20, 5, true], [1, 40, 10, false]] as const) {
      await json(await request.post(`${api}/workouts/${workoutId}/sets`, {
        headers, data: { exerciseId, order, weightKg, reps, isWarmup, clientMutationId: randomUUID() },
      }));
    }
    const finished = await json(await request.post(`${api}/workouts/${workoutId}/finish`, { headers, data: {} }));
    const fixtureDay = timestampToLocalCivil(finished.endedAt);
    await page.clock.setFixedTime(new Date(finished.endedAt));

    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('group', { name: 'Sesiones 30D' })).toContainText('1');

    // A full navigation drops the in-memory access token and exercises the real refresh cookie.
    const refreshed = page.waitForResponse(response => response.url().endsWith('/auth/refresh') && response.request().method() === 'POST');
    const reads: URL[] = [];
    page.on('request', req => { if (req.method() === 'GET' && req.url().startsWith(api)) reads.push(new URL(req.url())); });
    await page.goto('/progress');
    expect((await refreshed).status()).toBe(200);
    const day = page.getByRole('button', { name: /con sesión de entrenamiento/ });
    await expect(day).toHaveCount(1);
    await day.click();
    const calendarDetails = page.getByRole('region', { name: /^Actividad del / });
    await expect(calendarDetails.getByText('Sesión calendario', { exact: true })).toBeVisible();
    await expect(calendarDetails.getByText(/2\s*(?:s|series)\s*·\s*400\s*kg/)).toBeVisible();

    const { year, month } = parseCivilDate(fixtureDay);
    const current = monthRange(year, month);
    expect(reads.some(url => url.pathname.endsWith('/progress/activity')
      && url.searchParams.get('from') === current.from && url.searchParams.get('to') === fixtureDay)).toBe(true);
    expect(reads.some(url => url.pathname.endsWith('/workouts'))).toBe(false);
    expect(reads.some(url => url.pathname.includes('/cycle/'))).toBe(false);

    const previous = monthRange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
    const previousRead = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/progress/activity') && url.searchParams.get('from') === previous.from;
    });
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    const previousResponse = await previousRead;
    expect(previousResponse.status()).toBe(200);
    expect(new URL(previousResponse.url()).searchParams.get('to')).toBe(previous.to);
    await expect(page.getByRole('button', { name: /con sesión de entrenamiento/ })).toHaveCount(0);
    await expect(calendarDetails).toHaveCount(0);
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(page.getByRole('button', { name: /con sesión de entrenamiento/ })).toHaveCount(1);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (workoutId) await removeWorkoutFixture(request, workoutId, headers);
      if (exerciseId) await json(await request.delete(`${api}/exercises/${exerciseId}`, { headers }));
      await json(await request.post(`${api}/auth/logout`, { headers: { Origin: origin } }));
    } catch (cleanupError) {
      if (!primaryError) throw cleanupError;
    }
  }
});
