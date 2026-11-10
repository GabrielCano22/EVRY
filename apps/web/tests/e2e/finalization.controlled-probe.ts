import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { finalizeLabVisit } from './helpers/finalize-lab-visit';

const require = createRequire(import.meta.url);
const observer = readFileSync(require.resolve('next/dist/compiled/web-vitals/web-vitals.js'), 'utf8');

test('awaits diagnostic capture before destroying the measured document', async ({ page }) => {
  let inp: number | undefined;
  await page.exposeFunction('recordLabINP', (value: number) => { inp = value; });
  await page.setContent('<h1>Sesión conservada</h1><button onclick="const start=performance.now();while(performance.now()-start<120){};this.textContent=\'Registrado\'">Registrar</button>');
  await page.addScriptTag({ content: `(() => {
    window.requestIdleCallback = callback => setTimeout(() => callback({ didTimeout:false, timeRemaining:()=>50 }), 500);
    const module = {exports:{}}; const __dirname = '';
    ${observer}
    module.exports.onINP(metric => window.recordLabINP(metric.value), {reportAllChanges:true});
  })();` });
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Registrado', exact: true })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => inp).toBeGreaterThanOrEqual(120);

  let allowCapture!: () => void;
  const capturePermission = new Promise<void>(resolve => { allowCapture = resolve; });
  let captureStarted!: () => void;
  const started = new Promise<void>(resolve => { captureStarted = resolve; });
  let captureFinished!: () => void;
  const finished = new Promise<void>(resolve => { captureFinished = resolve; });
  let heading: string | null | undefined;
  let captureFailed = false;
  const closing = finalizeLabVisit(page, () => inp, async () => {
    captureStarted();
    await capturePermission;
    try {
      heading = await page.evaluate(() => document.querySelector('h1')?.textContent);
    } catch {
      captureFailed = true;
    } finally {
      captureFinished();
    }
  });
  await started;
  allowCapture();
  await closing;
  await finished;

  expect(captureFailed, 'navigation must not race asynchronous diagnostic capture').toBe(false);
  expect(heading).toBe('Sesión conservada');
  await expect(page).toHaveURL('about:blank');
});

test('retains real interaction timing when the observer reports after its document is ready to close', async ({ page }) => {
  let inp: number | undefined;
  let inpAtClose: number | undefined;
  await page.exposeFunction('recordLabINP', (value: number) => { inp = value; });
  await page.setContent('<button onclick="const start=performance.now();while(performance.now()-start<120){};this.textContent=\'Registrado\'">Registrar</button>');
  // Model a delayed idle delivery, not the event duration or its metric. The
  // trusted click, busy handler, EventTiming and web-vitals calculation stay real.
  await page.addScriptTag({ content: `(() => {
    window.requestIdleCallback = callback => setTimeout(() => callback({ didTimeout:false, timeRemaining:()=>50 }), 500);
    const module = {exports:{}}; const __dirname = '';
    ${observer}
    module.exports.onINP(metric => window.recordLabINP(metric.value), {reportAllChanges:true});
  })();` });
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Registrado', exact: true })).toBeVisible();
  await finalizeLabVisit(page, () => inp, () => { inpAtClose = inp; });
  expect(inpAtClose, 'report the actual event before destroying its document').toBeGreaterThanOrEqual(120);
  expect(inp).toBe(inpAtClose);
  await expect(page).toHaveURL('about:blank');
});

test('rejects an unreported metric without closing the document or substituting zero', async ({ page }) => {
  await page.setContent('<h1>Sesión conservada</h1>');
  let closing = false;
  await expect(finalizeLabVisit(page, () => undefined, () => { closing = true; })).rejects.toThrow();
  expect(closing).toBe(false);
  await expect(page.getByRole('heading', { name: 'Sesión conservada' })).toBeVisible();
});

test('retains a slower last interaction instead of accepting an earlier finite INP', async ({ page }) => {
  let inp: number | undefined;
  let inpAtClose: number | undefined;
  await page.exposeFunction('recordLabINP', (value: number) => { inp = value; });
  await page.setContent('<button onclick="const start=performance.now();while(performance.now()-start<120){}">Primero</button><button onclick="const start=performance.now();while(performance.now()-start<240){}">Último</button>');
  await page.addScriptTag({ content: `(() => {
    window.requestIdleCallback = callback => setTimeout(() => callback({ didTimeout:false, timeRemaining:()=>50 }), 500);
    const module = {exports:{}}; const __dirname = '';
    ${observer}
    module.exports.onINP(metric => window.recordLabINP(metric.value), {reportAllChanges:true});
  })();` });
  await page.getByRole('button', { name: 'Primero', exact: true }).click();
  await expect.poll(() => inp).toBeGreaterThanOrEqual(120);
  await page.getByRole('button', { name: 'Último', exact: true }).click();
  await finalizeLabVisit(page, () => inp, () => { inpAtClose = inp; });
  expect(inpAtClose, 'pending worst interaction must not be lost').toBeGreaterThanOrEqual(240);
});
