import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { evaluateWebVitals } from './helpers/web-vitals';
import { applyControlledConditions } from './helpers/controlled-conditions';

const require = createRequire(import.meta.url);
const observer = readFileSync(require.resolve('next/dist/compiled/web-vitals/web-vitals.js'), 'utf8');

test('compiled login lab baseline with real typing and checkbox interactions', async ({ page, context }, testInfo) => {
  const values: Partial<Record<'LCP' | 'INP' | 'CLS', number>> = {};
  const blockedOrigins = new Set<string>();
  const browserErrors: string[] = [];
  const inpEntries: unknown[] = [];
  let longFrames: unknown[] = [];
  let scriptResources: unknown[] = [];
  let applied: Awaited<ReturnType<typeof applyControlledConditions>> | null = null;
  let result: ReturnType<typeof evaluateWebVitals> | null = null;
  let phase = 'setup';
  let matchedNetworkRequests = 0;
  try {
  page.on('pageerror', error => browserErrors.push(error.name));
  await context.route('**/*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === 'http://127.0.0.1:3000') return route.continue();
    blockedOrigins.add(origin);
    await route.abort('blockedbyclient');
  });
  await page.exposeFunction('evryLabMetric', (metric: { name: string; value: number; entries?: unknown[] }) => {
    if (metric.name === 'LCP' || metric.name === 'INP' || metric.name === 'CLS') {
      values[metric.name] = metric.value;
      if (metric.name === 'INP') inpEntries.splice(0, inpEntries.length, ...(metric.entries ?? []));
    }
  });
  await page.addInitScript({ content: `(() => {
    if (location.origin !== 'http://127.0.0.1:3000') return;
    window.evryLabInitialVisibility = document.visibilityState;
    window.evryLabLongFrames = [];
    if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
      new PerformanceObserver(list => window.evryLabLongFrames.push(...list.getEntries().map(entry => ({
        startTime: entry.startTime, duration: entry.duration, blockingDuration: entry.blockingDuration,
        scripts: entry.scripts.map(script => ({
          duration: script.duration, invoker: script.invoker, invokerType: script.invokerType,
          functionName: script.sourceFunctionName, source: script.sourceURL ? new URL(script.sourceURL).pathname : '',
        })),
      })))).observe({ type: 'long-animation-frame', buffered: true });
    }
    const module = { exports: {} };
    const __dirname = '';
    ${observer}
    for (const name of ['onLCP', 'onINP', 'onCLS']) {
      module.exports[name](metric => window.evryLabMetric({ name: metric.name, value: metric.value,
        entries: metric.name === 'INP' ? metric.entries.map(entry => ({
          name: entry.name, startTime: entry.startTime, duration: entry.duration,
          processingStart: entry.processingStart, processingEnd: entry.processingEnd,
          tag: entry.target?.tagName, inputType: entry.target?.type, classes: entry.target?.className,
        })) : undefined }),
        { reportAllChanges: true });
    }
  })();` });

  if (testInfo.project.metadata.controlledPerformance === true) {
    phase = 'applying-conditions';
    applied = await applyControlledConditions(page);
    applied.session.on('Network.requestWillBeSentExtraInfo', event => {
      if (event.appliedNetworkConditionsId === applied?.ruleId) matchedNetworkRequests++;
    });
  }
  phase = 'navigation';
  await page.goto('/login');
  expect(browserErrors, 'observer initialization must not fail silently').toEqual([]);
  await expect(page.getByRole('heading', { name: 'Bienvenida de vuelta' })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  });
  await testInfo.attach('initial-visibility.json', {
    contentType: 'application/json',
    body: JSON.stringify(await page.evaluate(() => ({
      initial: (window as unknown as { evryLabInitialVisibility: string }).evryLabInitialVisibility,
      current: document.visibilityState,
      paint: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: entry.startTime })),
    }))),
  });
  // An actionable DOM can precede the first paint in a fast headless browser.
  // First input finalizes LCP, so do not interact until an actual candidate exists.
  await expect.poll(() => typeof values.LCP, { message: 'actual LCP candidate before first input' }).toBe('number');
  phase = 'interactions';
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.keyboard.type('lab@example.test', { delay: 30 });
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue('lab@example.test');
  await page.getByLabel('Contraseña', { exact: true }).click();
  await page.keyboard.type('Synthetic-lab-only-2026', { delay: 30 });
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('Synthetic-lab-only-2026');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  longFrames = await page.evaluate(() => (window as unknown as { evryLabLongFrames: unknown[] }).evryLabLongFrames);
  // Collect after the interactions: diagnostics must not delay first input or
  // give React extra time to hydrate before the existing measured actions.
  scriptResources = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(entry => new URL(entry.name).pathname.endsWith('.js'))
    .map(entry => {
      const resource = entry as PerformanceResourceTiming;
      return { path: new URL(resource.name).pathname, startTime: resource.startTime,
        responseEnd: resource.responseEnd, duration: resource.duration,
        transferSize: resource.transferSize, decodedBodySize: resource.decodedBodySize };
    }));
  // Real document navigation finalizes visibility/pagehide observers; no synthetic lifecycle events.
  await page.goto('about:blank');
    phase = 'evaluation';
    expect(browserErrors, 'measurement must not hide browser errors').toEqual([]);
    expect([...blockedOrigins], 'login must not require remote resources').toEqual([]);
    await expect.poll(() => Object.keys(values).sort()).toEqual(['CLS', 'INP', 'LCP']);
    result = evaluateWebVitals(values);
    if (testInfo.project.metadata.controlledPerformance === true) {
      expect(applied, 'controlled measurements may not silently use the baseline').not.toBeNull();
      expect(matchedNetworkRequests, 'actual login requests must match the acknowledged network rule').toBeGreaterThan(0);
    }
    expect(result.withinBudget).toBe(true);
  } finally {
    await testInfo.attach('login-web-vitals.json', {
      contentType: 'application/json',
      body: JSON.stringify({
        scope: testInfo.project.metadata.controlledPerformance === true
          ? 'controlled login-only synthetic lab; no authentication, API or field acceptance'
          : 'login-only synthetic lab; no authentication, API, throttling or field acceptance',
        controlledConditionsRequested: testInfo.project.metadata.controlledPerformance === true,
        controlledConditionsApplied: applied?.profile ?? null,
        phase,
        browserErrors,
        inpEntries,
        longFrames,
        scriptResources,
        matchedNetworkRequests,
        confidenceAcceptance: 'not assessed: three visits per profile are exploratory only',
        nextVersion: require('next/package.json').version,
        buildId: readFileSync('.next/BUILD_ID', 'utf8').trim(),
        browserVersion: context.browser()?.version(),
        project: testInfo.project.name,
        repetition: testInfo.repeatEachIndex,
        blockedOrigins: [...blockedOrigins],
        values,
        evaluation: result,
      }, null, 2),
    });
  }
});
