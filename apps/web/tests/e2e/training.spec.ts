import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

const api = 'http://127.0.0.1:4000/api/v1';
const origin = 'http://127.0.0.1:3000';

async function fixtureJson(response: APIResponse) {
  const body = await response.text();
  expect(response.ok(), `Fixture request ${response.url()} returned ${response.status()}: ${body}`).toBeTruthy();
  return JSON.parse(body);
}

async function removeWorkout(
  request: APIRequestContext,
  workoutId: string,
  headers: Record<string, string>,
) {
  let response = await request.delete(`${api}/workouts/${workoutId}`, { headers });
  if (response.status() === 400) {
    const error = await response.json();
    expect(error.message).toBe('Cancela una sesión activa en lugar de eliminarla.');
    await fixtureJson(await request.post(`${api}/workouts/${workoutId}/cancel`, { headers, data: {} }));
    response = await request.delete(`${api}/workouts/${workoutId}`, { headers });
  }
  await fixtureJson(response);
}

test('register, train from a routine and preserve edited sets in progress and history', async ({ page, request }, testInfo) => {
  // This longer journey exercises actual UI writes against the isolated test database.
  test.setTimeout(60_000);
  const suffix = randomUUID();
  const email = `training-${suffix}@example.test`;
  const password = 'Training-fixture-password-2026';
  const exerciseName = `Sentadilla UI ${suffix.slice(0, 8)}`;
  const routineName = 'Rutina de prueba UI';
  let headers: Record<string, string> | undefined;
  let exerciseId: string | undefined;
  let routineId: string | undefined;
  let workoutId: string | undefined;
  let primaryError: unknown;

  try {
    if (testInfo.project.name === 'desktop-chromium') {
      await page.goto('/register');
      await page.getByRole('button', { name: 'Prefiero no decir' }).click();
      await page.getByLabel('Nombre', { exact: true }).fill('Training fixture');
      await page.getByLabel('Correo electrónico').fill(email);
      await page.getByLabel('Contraseña (mín. 8 caracteres)').fill(password);
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.getByRole('link', { name: 'Perfil', exact: true }).click();
      await page.getByRole('button', { name: 'Cerrar sesión' }).click();
      await expect(page).toHaveURL(/\/login$/);
    } else {
      // Keep the responsive journey independent from the web registration limiter.
      await fixtureJson(await request.post(`${api}/auth/mobile/register`, {
        data: { email, password, name: 'Training fixture', trackCycle: false },
      }));
      await page.goto('/login');
    }
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    const loginResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/login'
      && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    const login = await loginResponse;
    expect(login.status()).toBe(200);
    const authentication = await login.json();
    headers = { Authorization: `Bearer ${authentication.accessToken}`, Origin: origin };
    await expect(page).toHaveURL(/\/dashboard$/);

    // Only catalog setup and cleanup bypass the UI. The account, routine, workout and
    // every set mutation below must be performed through the same controls as a user.
    const exercise = await fixtureJson(await request.post(`${api}/exercises`, {
      headers,
      data: { name: exerciseName, muscleGroup: 'QUADS', equipment: 'BARBELL' },
    }));
    exerciseId = exercise.id;

    await page.getByRole('link', { name: 'Entrena', exact: true }).click();
    await page.getByRole('button', { name: 'Crear rutina', exact: true }).click();
    await page.getByLabel('Nombre de la rutina').fill(routineName);
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Elegir ejercicio' });
    await picker.getByPlaceholder('Buscar por nombre, músculo o equipo…').fill(exerciseName);
    await picker.getByRole('button', { name: `Agregar ${exerciseName}`, exact: true }).click();
    await expect(picker).toHaveCount(0);
    const createdRoutine = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/routines'
      && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar rutina' }).click();
    const routineResponse = await createdRoutine;
    expect(routineResponse.status()).toBe(201);
    routineId = (await routineResponse.json()).id;
    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('heading', { name: routineName })).toBeVisible();

    const createdWorkout = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/routines/${routineId}/start`
      && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Empezar rutina' }).click();
    const workoutResponse = await createdWorkout;
    expect(workoutResponse.status()).toBe(201);
    workoutId = (await workoutResponse.json()).id;
    await expect(page).toHaveURL(`${origin}/workout/${workoutId}`);
    await page.getByRole('button', { name: 'Empezar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Registrar serie' })).toBeVisible();

    for (const count of [1, 2]) {
      // The first stepper controls weight; each new routine set starts at its planned 0 kg / 10 reps.
      await page.getByRole('button', { name: 'Sumar', exact: true }).first().click();
      await page.getByRole('button', { name: 'Registrar serie' }).click();
      await expect(page.getByText(`${count} series totales · 1 ejercicios`, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Registrar serie' })).toBeEnabled();
    }

    await page.getByRole('button', { name: 'Editar serie 1', exact: true }).click();
    await page.getByLabel('Peso (kg)', { exact: true }).fill('40');
    await page.getByLabel('Repeticiones', { exact: true }).fill('8');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toHaveCount(0);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar serie 2', exact: true }).click();
    await expect(page.getByText('1 series totales · 1 ejercicios', { exact: true })).toBeVisible();

    // Reload discards the query cache: assertions now require the persisted server version.
    await page.reload();
    await expect(page.getByText('1 series totales · 1 ejercicios', { exact: true })).toBeVisible();
    const sessionVolume = page.locator('aside').filter({ has: page.getByRole('heading', { name: 'Volumen de la sesión' }) });
    await expect(sessionVolume).toContainText('320');
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('group', { name: 'Sesiones 30D' })).toContainText('1');

    await page.getByRole('link', { name: 'Progreso', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Sesiones completadas' }).locator('p').first()).toHaveText('1');
    await expect(page.getByRole('group', { name: 'Volumen', exact: true }).locator('p').first()).toHaveText('320kg');
    await page.getByRole('region', { name: 'Progreso por ejercicio' })
      .getByRole('button', { name: exerciseName, exact: true }).click();
    const detail = page.getByRole('dialog', { name: exerciseName });
    await detail.getByRole('tab', { name: 'Progreso', exact: true }).click();
    await expect(detail.getByText('1 sesiones · 1 series de trabajo · 320 kg de volumen', { exact: true })).toBeVisible();
    await detail.getByRole('tab', { name: 'Historial', exact: true }).click();
    await expect(detail.getByRole('heading', { name: routineName })).toBeVisible();
    await expect(detail.getByText('Serie 1: 40 kg × 8 repeticiones · RPE 7', { exact: true })).toBeVisible();
    await expect(detail.getByText(/^Serie 2:/)).toHaveCount(0);
    await detail.getByRole('button', { name: 'Cerrar ficha' }).click();

    await page.getByRole('link', { name: 'Entrena', exact: true }).click();
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    const historyEntry = page.getByRole('link').filter({ has: page.getByRole('heading', { name: routineName }) });
    await expect(historyEntry).toContainText('1 series');
    await expect(historyEntry).toContainText('320 kg');
    await historyEntry.click();
    await expect(page.getByText('FINALIZADA', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(?:Registrar|Editar|Eliminar) serie/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finalizar', exact: true })).toHaveCount(0);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (headers) {
        if (workoutId) await removeWorkout(request, workoutId, headers);
        if (routineId) await fixtureJson(await request.delete(`${api}/routines/${routineId}`, { headers }));
        if (exerciseId) await fixtureJson(await request.delete(`${api}/exercises/${exerciseId}`, { headers }));
      }
    } catch (cleanupError) {
      if (!primaryError) throw cleanupError;
    }
  }
});
