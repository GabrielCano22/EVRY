import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, type APIRequestContext, type APIResponse, type Page, type Request } from '@playwright/test';
import { todayCivil } from '@evry/domain';
import { evaluateWebVitals } from './helpers/web-vitals';
import { applyControlledConditions } from './helpers/controlled-conditions';
import { finalizeLabVisit } from './helpers/finalize-lab-visit';

const api = 'http://127.0.0.1:4000/api/v1';
const web = 'http://127.0.0.1:3000';
const require = createRequire(import.meta.url);
const observer = readFileSync(require.resolve('next/dist/compiled/web-vitals/web-vitals.js'), 'utf8');

async function json<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `Synthetic fixture HTTP ${response.status()} ${new URL(response.url()).pathname}`).toBe(true);
  return response.json() as Promise<T>;
}

async function createFixture(request: APIRequestContext) {
  const suffix = randomUUID();
  const email = `web-performance-${suffix}@example.test`;
  const password = `Synthetic-performance-${suffix}`;
  const user = await json<{ accessToken: string }>(await request.post(`${api}/auth/mobile/register`, {
    data: { email, password, name: 'Web performance fixture', biologicalSex: 'MALE', trackCycle: true },
  }));
  const headers = { Authorization: `Bearer ${user.accessToken}` };
  const exerciseName = `Ejercicio sintético ${suffix.slice(0, 8)}`;
  const exercise = await json<{ id: string }>(await request.post(`${api}/exercises`, {
    headers, data: { name: exerciseName, muscleGroup: 'CHEST', equipment: 'BARBELL' },
  }));
  const routine = await json<{ id: string }>(await request.post(`${api}/routines`, {
    headers, data: { name: 'Rutina sintética', exercises: [{ exerciseId: exercise.id, order: 0, targetSets: 3, targetReps: 10, targetWeightKg: 60 }] },
  }));
  for (let i = 0; i < 30; i++) {
    const workout = await json<{ id: string }>(await request.post(`${api}/workouts`, { headers, data: { name: `Sesión sintética ${i + 1}` } }));
    for (let order = 0; order < 3; order++) {
      await json(await request.post(`${api}/workouts/${workout.id}/sets`, {
        headers, data: { exerciseId: exercise.id, order, weightKg: 60, reps: 10, rpe: 7, clientMutationId: randomUUID() },
      }));
    }
    await json(await request.post(`${api}/workouts/${workout.id}/finish`, { headers, data: {} }));
  }
  const active = await json<{ id: string }>(await request.post(`${api}/workouts`, {
    headers, data: { name: 'Sesión activa sintética', routineId: routine.id },
  }));
  for (let order = 0; order < 3; order++) {
    await json(await request.post(`${api}/workouts/${active.id}/sets`, {
      headers, data: { exerciseId: exercise.id, order, weightKg: 60, reps: 10, rpe: 7, clientMutationId: randomUUID() },
    }));
  }
  await json(await request.post(`${api}/readiness/checkin`, {
    headers, data: { sleepHrs: 8, stress: 1, soreness: 1, motivation: 5 },
  }));
  await json(await request.post(`${api}/cycle/entries`, {
    headers, data: { date: todayCivil(), isPeriodStart: true, flow: 'LIGHT', energy: 4, mood: 4, notes: 'Registro sintético' },
  }));
  const summary = await json<{ summary: { sessionsCompleted: number; volumeKg: number } }>(
    await request.get(`${api}/progress/overview?period=all`, { headers }),
  );
  expect(summary.summary).toMatchObject({ sessionsCompleted: 30, volumeKg: 54000 });
  return { email, password, headers, exerciseName, activeId: active.id };
}

test('compiled authenticated screens with populated synthetic data and rotating refresh cookies', async ({ browser, request }, testInfo) => {
  const fixture = await createFixture(request);
  const options = testInfo.project.use;
  const loginContext = await browser.newContext({ ...options, serviceWorkers: 'block' });
  loginContext.setDefaultTimeout(10_000);
  loginContext.setDefaultNavigationTimeout(15_000);
  let storage;
  try {
    await loginContext.route('**/*', async route => {
      if ([web, new URL(api).origin].includes(new URL(route.request().url()).origin)) return route.continue();
      await route.abort('blockedbyclient');
    });
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${web}/login`);
    await loginPage.getByLabel('Correo electrónico').fill(fixture.email);
    await loginPage.getByLabel('Contraseña', { exact: true }).fill(fixture.password);
    const response = loginPage.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST');
    await loginPage.getByRole('button', { name: 'Ingresar' }).click();
    expect((await response).status()).toBe(200);
    await expect(loginPage).toHaveURL(`${web}/dashboard`);
    await expect(loginPage.getByRole('group', { name: 'Sesiones 30D' })).toContainText('30');
    storage = await loginContext.storageState();
    const refresh = storage.cookies.find(cookie => cookie.name === 'evry_refresh');
    expect(!!refresh && refresh.httpOnly && refresh.path === '/api' && refresh.sameSite === 'Lax', 'Scoped HttpOnly refresh cookie').toBe(true);
  } finally {
    await loginContext.close();
  }

  const scenarios: Array<{ name: string; path: string; ready(page: Page): Promise<void>; interact(page: Page): Promise<void> }> = [
    { name: 'dashboard', path: '/dashboard', async ready(page) {
      await expect(page.getByRole('group', { name: 'Sesiones 30D' })).toContainText('30');
      await expect(page.getByRole('group', { name: 'Estado del día' }).getByText('100', { exact: true })).toBeVisible();
    }, async interact(page) {
      // Daily readiness already exists: its creation form is correctly absent.
      await page.getByRole('button', { name: 'Mis rutinas', exact: true }).click();
      await expect(page).toHaveURL(`${web}/workout`);
      await expect(page.getByRole('heading', { name: 'Rutina sintética', exact: true })).toBeVisible();
    } },
    { name: 'profile', path: '/profile', async ready(page) {
      await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Web performance fixture');
      await expect(page.getByLabel('Activar seguimiento')).toBeChecked();
    }, async interact(page) {
      await page.getByLabel('Nombre', { exact: true }).click();
      await page.keyboard.press('End');
      await page.keyboard.type(' temporal', { delay: 20 });
    } },
    { name: 'progress', path: '/progress', async ready(page) {
      await expect(page.getByRole('group', { name: 'Sesiones completadas' }).locator('p').first()).toHaveText('30');
      await expect(page.getByRole('group', { name: 'Volumen', exact: true }).locator('p').first()).toHaveText('54.000kg');
      // Both calendar queries must finish before changing the overview period.
      await expect(page.getByRole('button', { name: /con sesión de entrenamiento, inicio de período/ })).toHaveCount(1);
    }, async interact(page) {
      await page.getByLabel('Periodo de progreso').selectOption('all');
      await page.getByRole('region', { name: 'Progreso por ejercicio' }).getByRole('button', { name: fixture.exerciseName, exact: true }).click();
      const detail = page.getByRole('dialog', { name: fixture.exerciseName });
      await detail.getByRole('tab', { name: 'Progreso', exact: true }).click();
      await expect(detail.getByText('30 sesiones · 90 series de trabajo · 54.000 kg de volumen', { exact: true })).toBeVisible();
      await detail.getByRole('tab', { name: 'Historial', exact: true }).click();
      await expect(detail.getByText('Serie 1: 60 kg × 10 repeticiones · RPE 7').first()).toBeVisible();
      await detail.getByRole('button', { name: 'Cerrar ficha' }).click();
    } },
    { name: 'routines', path: '/workout', async ready(page) {
      await expect(page.getByRole('heading', { name: 'Rutina sintética', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Sesión activa sintética', exact: true })).toBeVisible();
    }, async interact(page) {
      await page.getByRole('button', { name: 'Historial', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Sesión sintética 30', exact: true })).toBeVisible();
    } },
    { name: 'active-session', path: `/workout/${fixture.activeId}`, async ready(page) {
      await expect(page.getByText('3 series totales · 1 ejercicios', { exact: true })).toBeVisible();
    }, async interact(page) {
      await page.getByRole('button', { name: 'Añadir serie', exact: true }).click();
      await page.getByRole('button', { name: 'Aumentar Peso', exact: true }).click();
      await page.getByRole('button', { name: 'Registrar serie', exact: true }).click();
      await expect(page.getByText('4 series totales · 1 ejercicios', { exact: true })).toBeVisible();
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Eliminar serie 4', exact: true }).click();
      await expect(page.getByText('3 series totales · 1 ejercicios', { exact: true })).toBeVisible();
    } },
    { name: 'cycle', path: '/cycle', async ready(page) {
      await expect(page.getByRole('button', { name: /^Editar registro del / })).toHaveCount(1);
    }, async interact(page) {
      await page.getByRole('button', { name: /^Editar registro del / }).click();
      await expect(page.getByLabel('Notas (opcional)')).toHaveValue('Registro sintético');
      await page.getByLabel('Notas (opcional)').click();
      await page.keyboard.type(' temporal', { delay: 20 });
    } },
  ];

  const controlledBudgetFailures: Array<{ scenario: string; repetition: number; values: Partial<Record<'LCP' | 'INP' | 'CLS', number>> }> = [];
  for (let repetition = 0; repetition < 3; repetition++) for (const scenario of scenarios) {
    // Keep the real 10/minute refresh limiter enabled: independent documents are paced.
    await delay(7000);
    const context = await browser.newContext({ ...options, storageState: storage, serviceWorkers: 'block' });
    context.setDefaultTimeout(10_000);
    context.setDefaultNavigationTimeout(15_000);
    const values: Partial<Record<'LCP' | 'INP' | 'CLS', number>> = {};
    const blockedOrigins = new Set<string>();
    const responses: Array<{ path: string; method: string; status: number }> = [];
    const webFailures: Array<{ path: string; status: number }> = [];
    const requestFailures: Array<{ path: string; method: string; reason: string; expectedLifecycleCancellation: boolean; expectedExpiredAccessCancellation: boolean }> = [];
    const expiredAccessProbes = new WeakSet<Request>();
    const layoutShifts: unknown[] = [];
    const lcpEntries: unknown[] = [];
    const inpEntries: unknown[] = [];
    let mainThreadDiagnostics: unknown = null;
    let resourceTimings: unknown[] = [];
    const browserErrors: string[] = [];
    let evaluation: ReturnType<typeof evaluateWebVitals> | null = null;
    let applied: Awaited<ReturnType<typeof applyControlledConditions>> | null = null;
    let matchedNetworkRequests = 0;
    let conditionsAppliedBeforeDocument = false;
    const controlledRequested = testInfo.project.metadata.controlledPerformance === true;
    let finalizing = false;
    try {
      await context.route('**/*', async route => {
        const origin = new URL(route.request().url()).origin;
        if ([web, new URL(api).origin].includes(origin)) return route.continue();
        blockedOrigins.add(origin);
        await route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.on('request', request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()
          && request.url() === `${web}${scenario.path}`) {
          conditionsAppliedBeforeDocument = applied !== null;
        }
      });
      page.on('pageerror', error => browserErrors.push(error.name));
      page.on('response', response => {
        if (response.url().startsWith(`${api}/`)) responses.push({ path: new URL(response.url()).pathname, method: response.request().method(), status: response.status() });
        if (new URL(response.url()).origin === web && response.status() >= 400) webFailures.push({ path: new URL(response.url()).pathname, status: response.status() });
        if (new URL(response.url()).pathname === '/api/v1/users/me' && response.status() === 401 && response.request().method() === 'GET') expiredAccessProbes.add(response.request());
      });
      page.on('requestfailed', request => {
        const url = new URL(request.url());
        const reason = request.failure()?.errorText ?? 'Unknown network failure';
        const expectedLifecycleCancellation = reason === 'net::ERR_ABORTED' && request.method() === 'GET'
          && (finalizing || (url.origin === web && url.searchParams.has('_rsc') && request.headers()['next-router-prefetch'] === '1'));
        // Classify transport cancellation separately from genuine network errors.
        // A 401 still fails the exact cold-bootstrap/zero-HTTP-error checks below.
        const expectedExpiredAccessCancellation = reason === 'net::ERR_ABORTED' && expiredAccessProbes.has(request);
        requestFailures.push({ path: url.pathname, method: request.method(), reason, expectedLifecycleCancellation, expectedExpiredAccessCancellation });
      });
      await page.exposeFunction('evryLabShift', (entry: unknown) => layoutShifts.push(entry));
      await page.exposeFunction('evryLabMetric', (metric: { name: string; value: number; entries?: unknown[] }) => {
        if (metric.name === 'LCP' || metric.name === 'INP' || metric.name === 'CLS') values[metric.name] = metric.value;
        if (metric.name === 'LCP') lcpEntries.splice(0, lcpEntries.length, ...(metric.entries ?? []));
        if (metric.name === 'INP') inpEntries.splice(0, inpEntries.length, ...(metric.entries ?? []));
      });
      await page.addInitScript({ content: `(() => {
        if (location.origin !== '${web}') return;
        const module = { exports: {} }; const __dirname = '';
        ${observer}
        // Keep collection in the page: no per-task IPC, DOM/input values or
        // profiling pauses during measurement. Unsupported data is explicit.
        window.__evryMainThread = {
          supported: PerformanceObserver.supportedEntryTypes.includes('longtask'), tasks: [],
          eventTimingSupported: PerformanceObserver.supportedEntryTypes.includes('event'), events: [],
        };
        if (window.__evryMainThread.supported) new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__evryMainThread.tasks.push({
            startTime: entry.startTime, duration: entry.duration, name: entry.name,
          });
        }).observe({type:'longtask', buffered:true});
        // The worst INP entry can be pointerdown while click processing follows
        // it. Preserve the interaction's other events, not just that one entry.
        if (window.__evryMainThread.eventTimingSupported) new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (entry.interactionId) window.__evryMainThread.events.push({
            name: entry.name, startTime: entry.startTime, duration: entry.duration,
            processingStart: entry.processingStart, processingEnd: entry.processingEnd,
            interactionId: entry.interactionId, tag: entry.target?.tagName,
          });
        }).observe({type:'event', buffered:true, durationThreshold:16});
        new PerformanceObserver(list => { for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.evryLabShift({value:entry.value, startTime:entry.startTime,
            sources:entry.sources.map(source => ({tag:source.node?.nodeName,
              classes:source.node instanceof Element ? source.node.className : null,
              previous:source.previousRect.toJSON(), current:source.currentRect.toJSON()}))});
        }}).observe({type:'layout-shift', buffered:true});
        for (const name of ['onLCP', 'onINP', 'onCLS']) module.exports[name](
          metric => window.evryLabMetric({name: metric.name, value: metric.value,
            entries: metric.name === 'LCP' ? metric.entries.map(entry => ({
              startTime: entry.startTime, renderTime: entry.renderTime, loadTime: entry.loadTime,
              size: entry.size, tag: entry.element?.tagName, classes: entry.element?.className,
              path: entry.url ? new URL(entry.url).pathname : '',
            })) : metric.name === 'INP' ? metric.entries.map(entry => ({
              name: entry.name, startTime: entry.startTime, duration: entry.duration,
              processingStart: entry.processingStart, processingEnd: entry.processingEnd,
              interactionId: entry.interactionId, tag: entry.target?.tagName,
            })) : undefined}), {reportAllChanges:true});
      })();` });
      if (controlledRequested) {
        applied = await applyControlledConditions(page);
        applied.session.on('Network.requestWillBeSentExtraInfo', event => {
          if (event.appliedNetworkConditionsId === applied?.ruleId) matchedNetworkRequests++;
        });
      }
      await page.goto(`${web}${scenario.path}`);
      if (controlledRequested) {
        expect(applied, 'requested controlled conditions must be applied before navigation').not.toBeNull();
        expect(conditionsAppliedBeforeDocument, 'conditions must precede the actual document request').toBe(true);
        expect(matchedNetworkRequests, 'actual requests must match the acknowledged rule').toBeGreaterThan(0);
      }
      await expect(page).toHaveURL(`${web}${scenario.path}`);
      await scenario.ready(page);
      // Next's hidden live region announces navigation; it is not an application error.
      await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
      });
      await expect.poll(() => typeof values.LCP).toBe('number');
      // Explicit diagnostic run only: sampled CPU stacks perturb timing and
      // cannot prove performance acceptance. The normal gate never starts it.
      const cpuDiagnostic = process.env.EVRY_LOCAL_CLICK_CPU_DIAGNOSTICS === '1'
        && scenario.name === 'routines' && applied !== null;
      if (cpuDiagnostic) {
        await applied!.session.send('Profiler.enable');
        await applied!.session.send('Profiler.start');
      }
      try {
        await scenario.interact(page);
      } finally {
        if (cpuDiagnostic) {
          const { profile } = await applied!.session.send('Profiler.stop');
          // Preserve sampled stacks/timings, never query strings or source text.
          for (const node of profile.nodes) {
            const url = node.callFrame.url;
            node.callFrame.url = url.startsWith(`${web}/_next/static/`)
              ? new URL(url).pathname : '';
          }
          await testInfo.attach(`routines-${repetition}-diagnostic.cpuprofile`, {
            contentType: 'application/json', body: JSON.stringify(profile),
          });
          await applied!.session.send('Profiler.disable');
        }
      }
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      // Diagnostics follow measured actions: they must not give extra idle time
      // before first interaction. Strip URL parameters and never capture values.
      resourceTimings = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
        const resource = entry as PerformanceResourceTiming;
        return { path: new URL(resource.name).pathname, initiator: resource.initiatorType,
          startTime: resource.startTime, responseEnd: resource.responseEnd, duration: resource.duration,
          transferSize: resource.transferSize, decodedBodySize: resource.decodedBodySize };
      }));
      await finalizeLabVisit(page, () => values.INP, async () => {
        finalizing = true;
        mainThreadDiagnostics = await page.evaluate(() =>
          (window as unknown as { __evryMainThread: unknown }).__evryMainThread);
        expect(mainThreadDiagnostics, 'capture diagnostics before their document is destroyed')
          .toMatchObject({ supported: expect.any(Boolean), tasks: expect.any(Array),
            eventTimingSupported: expect.any(Boolean), events: expect.any(Array) });
      });
      await expect.poll(() => Object.keys(values).sort()).toEqual(['CLS', 'INP', 'LCP']);
      expect(browserErrors).toEqual([]);
      expect(webFailures).toEqual([]);
      expect(requestFailures.filter(failure => !failure.expectedLifecycleCancellation && !failure.expectedExpiredAccessCancellation)).toEqual([]);
      // A fresh document has no access token: restore through its genuine
      // HttpOnly cookie before querying the user, without an unnecessary 401.
      // Require this exact sequence; do not accept extra or failed auth calls.
      expect(responses.filter(response => ['/api/v1/users/me', '/api/v1/auth/refresh'].includes(response.path))).toEqual([
        { path: '/api/v1/auth/refresh', method: 'POST', status: 200 },
        { path: '/api/v1/users/me', method: 'GET', status: 200 },
      ]);
      expect(responses.filter(response => response.status >= 400)).toEqual([]);
      expect([...blockedOrigins]).toEqual([]);
      evaluation = evaluateWebVitals(values);
      if (controlledRequested && !evaluation.withinBudget) {
        // Record every measured budget violation, then fail the profile below.
        // Functional/network/authentication errors still abort immediately.
        controlledBudgetFailures.push({ scenario: scenario.name, repetition, values: { ...values } });
      } else {
        expect(evaluation.withinBudget, `${scenario.name} actual lab budget`).toBe(true);
      }
      // Refresh rotation is propagated in memory only, never to logs/files/artifacts.
      const rotated = await context.storageState();
      const previousRefresh = storage.cookies.find(cookie => cookie.name === 'evry_refresh');
      const nextRefresh = rotated.cookies.find(cookie => cookie.name === 'evry_refresh');
      expect(!!nextRefresh && nextRefresh.httpOnly && nextRefresh.path === '/api' && nextRefresh.sameSite === 'Lax', 'Scoped HttpOnly rotated cookie').toBe(true);
      expect(!!nextRefresh && nextRefresh.value !== previousRefresh?.value, 'Refresh cookie rotates on each isolated visit').toBe(true);
      storage = rotated;
    } finally {
      await testInfo.attach(`${scenario.name}-${repetition}-web-vitals.json`, {
        contentType: 'application/json',
        body: JSON.stringify({
          scope: 'direct authenticated document; warm loopback API; three exploratory visits/profile; no field/native/confidence acceptance',
          scenario: scenario.name, repetition, project: testInfo.project.name,
          controlledConditionsRequested: controlledRequested,
          clickCpuDiagnosticsRequested: process.env.EVRY_LOCAL_CLICK_CPU_DIAGNOSTICS === '1',
          controlledConditionsApplied: applied?.profile ?? null,
          matchedNetworkRequests,
          conditionsAppliedBeforeDocument,
          lcpEntries, inpEntries, mainThreadDiagnostics, resourceTimings,
          nextVersion: require('next/package.json').version, browserVersion: browser.version(),
          buildId: readFileSync('.next/BUILD_ID', 'utf8').trim(),
          fixture: { completedSessions: 30, completedSets: 90, volumeKg: 54000, activeSets: 3, cycleEntries: 1 },
          blockedOrigins: [...blockedOrigins], responses, webFailures, requestFailures, browserErrors, layoutShifts, values, evaluation,
        }, null, 2),
      });
      await context.close();
    }
  }
  const final = await json<{ summary: { sessionsCompleted: number; volumeKg: number } }>(await request.get(`${api}/progress/overview?period=all`, { headers: fixture.headers }));
  expect(final.summary).toMatchObject({ sessionsCompleted: 30, volumeKg: 54000 });
  const active = await json<{ status: string; sets: unknown[] }>(await request.get(`${api}/workouts/${fixture.activeId}`, { headers: fixture.headers }));
  expect(active.status).toBe('ACTIVE');
  expect(active.sets).toHaveLength(3);
  expect(controlledBudgetFailures, 'all controlled authenticated visits must meet the unchanged budgets').toEqual([]);
});
