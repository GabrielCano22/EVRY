import { expect, test } from '@playwright/test';
import { applyControlledConditions } from './helpers/controlled-conditions';

const web = 'http://127.0.0.1:3000';
const api = 'http://127.0.0.1:4000/api/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

test('diagnose compiled populated dashboard startup CPU; not performance acceptance', async ({ browser }, testInfo) => {
  const email = process.env.EVRY_DIAGNOSTIC_FIXTURE_EMAIL;
  const suffix = /^web-performance-([a-f0-9-]{36})@example\.test$/.exec(email ?? '')?.[1];
  if (!suffix) throw new Error('Requires a retained synthetic performance fixture, never a real account');
  const context = await browser.newContext({
    ...testInfo.project.use, timezoneId: 'America/Bogota', serviceWorkers: 'block',
  });
  try {
    const login = await context.request.post(`${api}/auth/login`, {
      headers: { Origin: web }, data: { email, password: `Synthetic-performance-${suffix}` },
    });
    expect(login.ok()).toBe(true);
    const { accessToken } = await login.json() as { accessToken: string };
    const overview = await context.request.get(`${api}/progress/overview?period=all`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(overview.ok()).toBe(true);
    expect((await overview.json()).summary).toMatchObject({ sessionsCompleted: 30, volumeKg: 54000 });
    expect((await context.cookies()).some(cookie => cookie.httpOnly && cookie.path === '/api')).toBe(true);
    const page = await context.newPage();
    await page.route('**/*', route => {
      return [web, new URL(api).origin].includes(new URL(route.request().url()).origin)
        ? route.continue() : route.abort('blockedbyclient');
    });
    const { session, profile } = await applyControlledConditions(page);
    const timeline: Array<{ name: string; cat: string; ph: string; ts: number; dur?: number; pid: number; tid: number; path?: string }> = [];
    session.on('Tracing.dataCollected', ({ value }) => {
      for (const raw of value) {
        // The protocol dictionary type is broad; validate actual event shapes.
        const event: unknown = raw;
        if (!isRecord(event) || typeof event.name !== 'string' || typeof event.cat !== 'string'
          || typeof event.ph !== 'string' || typeof event.ts !== 'number'
          || typeof event.pid !== 'number' || typeof event.tid !== 'number') continue;
        let path: string | undefined;
        const data = isRecord(event.args) && isRecord(event.args.data) ? event.args.data : undefined;
        try { if (typeof data?.url === 'string') path = new URL(data.url).pathname; } catch { /* Do not retain raw URLs. */ }
        timeline.push({ name: event.name, cat: event.cat, ph: event.ph, ts: event.ts,
          dur: typeof event.dur === 'number' ? event.dur : undefined, pid: event.pid, tid: event.tid, path });
      }
    });
    await session.send('Tracing.start', {
      categories: 'devtools.timeline,v8,blink.user_timing,loading', transferMode: 'ReportEvents',
    });
    await session.send('Profiler.enable');
    await session.send('Profiler.start');
    await page.goto(`${web}/dashboard`);
    await expect(page.getByRole('group', { name: 'Sesiones 30D' })).toContainText('30');
    await expect(page.getByRole('group', { name: 'Estado del día' }).getByText('100', { exact: true })).toBeVisible();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const { profile: cpu } = await session.send('Profiler.stop');
    const timelineCompleted = new Promise<void>(resolve => session.once('Tracing.tracingComplete', () => resolve()));
    await session.send('Tracing.end');
    await timelineCompleted;
    await testInfo.attach('dashboard-startup-timeline-diagnostic.json', {
      contentType: 'application/json', body: JSON.stringify({
        scope: 'Sanitized single profiled timeline; not LCP/INP acceptance. Nested durations must not be summed.',
        events: timeline,
      }),
    });
    for (const node of cpu.nodes) {
      if (node.callFrame.url) {
        try { const url = new URL(node.callFrame.url); node.callFrame.url = `${url.origin}${url.pathname}`; }
        catch { node.callFrame.url = ''; }
      }
    }
    await testInfo.attach('dashboard-startup-diagnostic.cpuprofile', {
      contentType: 'application/json', body: JSON.stringify(cpu),
    });
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
      const resource = entry as PerformanceResourceTiming;
      return { path: new URL(resource.name).pathname, startTime: resource.startTime,
        responseEnd: resource.responseEnd, duration: resource.duration };
    }));
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return { startTime: entry.startTime, requestStart: entry.requestStart,
        responseStart: entry.responseStart, responseEnd: entry.responseEnd,
        domInteractive: entry.domInteractive, domContentLoadedEventEnd: entry.domContentLoadedEventEnd };
    });
    const refreshes = resources.filter(resource => resource.path === '/api/v1/auth/refresh');
    expect(refreshes, 'One adopted cookie rotation, not a second client bootstrap').toHaveLength(1);
    expect(refreshes[0].startTime, 'Initial HTML starts restoration before document initialization completes')
      .toBeLessThan(navigation.domInteractive);
    expect(resources.filter(resource => resource.path === '/api/v1/users/me')).toHaveLength(1);
    expect(await page.evaluate(() => window.__evryDocumentRefresh)).toBeUndefined();
    await testInfo.attach('dashboard-startup-diagnostic.json', {
      contentType: 'application/json', body: JSON.stringify({
        scope: 'Single profiled startup of retained 30-session synthetic fixture; NOT LCP/INP acceptance',
        conditions: profile, navigation, resources,
      }),
    });
  } finally {
    await context.close();
  }
});
