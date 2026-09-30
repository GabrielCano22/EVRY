import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, type APIResponse, type Response } from '@playwright/test';
import { formatCivilDate, monthRange, parseCivilDate, todayCivil } from '@evry/domain';

const api = 'http://127.0.0.1:4000/api/v1';

async function fixtureJson(response: APIResponse | Response) {
  const body = await response.text();
  expect(response.ok(), `${response.url()} returned ${response.status()}: ${body}`).toBeTruthy();
  return JSON.parse(body);
}

test('persist daily readiness, profile consent and cycle CRUD across a civil month boundary', async ({ page, request }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  const email = `personal-${randomUUID()}@example.test`;
  const password = 'Personal-fixture-password-2026';
  const registration = await fixtureJson(await request.post(`${api}/auth/mobile/register`, {
    data: { email, password, name: 'Personal fixture', biologicalSex: 'MALE', trackCycle: false },
  }));
  const headers = { Authorization: `Bearer ${registration.accessToken}` };
  const now = new Date();
  const today = todayCivil(now);
  const { year, month } = parseCivilDate(today);
  const current = monthRange(year, month);
  const previous = monthRange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  let entryId: string | undefined;
  let primaryError: unknown;

  try {
    await page.clock.setFixedTime(now);
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    for (let attempt = 0; attempt < 2; attempt++) {
      const loginResponse = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Ingresar' }).click();
      const login = await loginResponse;
      if (login.status() !== 429 || attempt === 1) {
        expect(login.status()).toBe(200);
        break;
      }
      // The shared real server retains its limiter across journeys. Respect its
      // explicit backoff rather than disabling the limiter or hiding a failed run.
      const retrySeconds = Number(login.headers()['retry-after']);
      expect(Number.isInteger(retrySeconds) && retrySeconds >= 1 && retrySeconds <= 60).toBe(true);
      await expect(page.getByRole('alert').filter({ hasText: 'Demasiadas solicitudes' })).toBeVisible();
      await delay(retrySeconds * 1000);
    }
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('group', { name: 'Estado del día' })).toContainText('Sin registro de hoy');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    const sleep = page.getByRole('slider', { name: 'Horas de sueño' });
    await sleep.press('Home');
    for (let step = 0; step < 16; step++) await sleep.press('ArrowRight');
    await page.getByRole('slider', { name: 'Estrés', exact: true }).press('Home');
    await page.getByRole('slider', { name: 'Dolor muscular' }).press('Home');
    await page.getByRole('slider', { name: 'Motivación' }).press('End');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Estado del día' }).getByText('100', { exact: true })).toBeVisible();
    const readiness = await fixtureJson(await request.get(`${api}/readiness/latest`, { headers }));
    expect(readiness).toMatchObject({ sleepHrs: 8, stress: 1, soreness: 1, motivation: 5, score: 100 });
    expect(readiness.civilDate.slice(0, 10)).toBe(today);

    await page.getByRole('link', { name: 'Perfil', exact: true }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('  Perfil canónico  ');
    await page.getByLabel('Fecha de nacimiento').fill('1995-02-28');
    await page.getByRole('button', { name: 'Movilidad', exact: true }).click();
    await page.getByText('Activar seguimiento', { exact: true }).click();
    await expect(page.getByLabel('Activar seguimiento')).toBeChecked();
    await page.getByLabel('Ciclo (días)').fill('30');
    await page.getByLabel('Período (días)').fill('4');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambios guardados.');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Perfil canónico');
    await expect(page.getByLabel('Sexo registrado')).toHaveValue('MALE');
    await expect(page.getByLabel('Fecha de nacimiento')).toHaveValue('1995-02-28');
    await expect(page.getByRole('button', { name: 'Movilidad', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Ciclo (días)')).toHaveValue('30');
    await expect(page.getByLabel('Período (días)')).toHaveValue('4');
    const profile = await fixtureJson(await request.get(`${api}/users/me`, { headers }));
    expect(profile).toMatchObject({ name: 'Perfil canónico', biologicalSex: 'MALE', goals: ['MOBILITY'], trackCycle: true, avgCycleLen: 30, avgPeriodLen: 4 });
    expect(profile.birthDate.slice(0, 10)).toBe('1995-02-28');

    await page.getByRole('link', { name: 'Ciclo', exact: true }).click();
    await page.getByLabel('Fecha', { exact: true }).fill(current.from);
    await page.getByText('Hoy inicia mi período', { exact: true }).click();
    await expect(page.getByLabel('Hoy inicia mi período')).toBeChecked();
    await page.getByRole('button', { name: 'Ligero', exact: true }).click();
    await page.getByRole('button', { name: 'fatiga', exact: true }).click();
    await page.getByRole('group', { name: 'Energía', exact: true }).getByRole('button', { name: 'Sin dato' }).click();
    await page.getByRole('group', { name: 'Ánimo', exact: true }).getByRole('button', { name: '4', exact: true }).click();
    await page.getByLabel('Notas (opcional)').fill('Registro civil de prueba');
    const created = page.waitForResponse(r => r.url().endsWith('/cycle/entries') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar registro' }).click();
    const saved = await fixtureJson(await created);
    entryId = saved.id;
    expect(saved).toMatchObject({ flow: 'LIGHT', symptoms: ['fatiga'], energy: null, mood: 4, isPeriodStart: true });
    expect(saved.date.slice(0, 10)).toBe(current.from);
    await expect(page.getByRole('status')).toContainText('Registro guardado.');

    await page.reload();
    await page.getByRole('button', { name: /^Editar registro del / }).click();
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(current.from);
    await expect(page.getByLabel('Notas (opcional)')).toHaveValue('Registro civil de prueba');
    await expect(page.getByRole('group', { name: 'Energía', exact: true }).getByRole('button', { name: 'Sin dato' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Fecha', { exact: true }).fill(previous.to);
    await page.getByRole('button', { name: 'Guardar registro' }).click();
    await expect(page.getByRole('status')).toContainText('Registro guardado.');
    const entries = await fixtureJson(await request.get(`${api}/cycle/entries`, { headers }));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: entryId, energy: null, mood: 4, notes: 'Registro civil de prueba' });
    expect(entries[0].date.slice(0, 10)).toBe(previous.to);

    await page.getByRole('button', { name: 'Mes anterior' }).click();
    const calendarDay = page.getByRole('button', {
      name: `Ver actividad del ${formatCivilDate(previous.to, { day: 'numeric', month: 'long', year: 'numeric' })}, inicio de período, 1 síntomas`, exact: true,
    });
    await calendarDay.click();
    const detail = page.getByRole('region', { name: /^Actividad del / });
    await expect(detail).toContainText('Registro civil de prueba');
    await expect(detail).toContainText('Ánimo 4/5');
    await expect(detail).not.toContainText('Energía');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /^Eliminar registro del ciclo / }).click();
    await expect(page.getByRole('status')).toContainText('Registro eliminado.');
    await expect(page.getByRole('button', { name: /^Editar registro del / })).toHaveCount(0);
    expect(await fixtureJson(await request.get(`${api}/cycle/entries`, { headers }))).toEqual([]);
    entryId = undefined;

    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Estado del día' }).getByText('100', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Perfil', exact: true }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Perfil canónico');
    await expect(page.getByLabel('Fecha de nacimiento')).toHaveValue('1995-02-28');
    await expect(page.getByLabel('Activar seguimiento')).toBeChecked();
    await page.getByText('Activar seguimiento', { exact: true }).click();
    await expect(page.getByLabel('Activar seguimiento')).not.toBeChecked();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambios guardados.');
    await expect(page.getByRole('link', { name: 'Ciclo', exact: true })).toHaveCount(0);
    const cycleReads: string[] = [];
    page.on('request', req => { if (req.method() === 'GET' && req.url().startsWith(`${api}/cycle/`)) cycleReads.push(req.url()); });
    await page.goto('/cycle');
    await expect(page.getByText('El seguimiento del ciclo es opcional. Puedes activarlo en tu perfil.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar registro' })).toHaveCount(0);
    expect(cycleReads).toEqual([]);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const cleanupTasks = [request.post(`${api}/auth/mobile/logout`, {
      data: { refreshToken: registration.refreshToken },
    }).then(fixtureJson)];
    if (entryId) cleanupTasks.push(request.delete(`${api}/cycle/entries/${entryId}`, { headers }).then(fixtureJson));
    for (const result of await Promise.allSettled(cleanupTasks)) {
      if (!primaryError && result.status === 'rejected') throw result.reason;
    }
  }
});
