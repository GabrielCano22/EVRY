import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { applyControlledConditions } from './helpers/controlled-conditions';

test('controlled profile limits real response latency and transferred bytes despite routing', async ({ page, context }, testInfo) => {
  const payload = Buffer.alloc(262_144, 97);
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': payload.length,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    response.end(payload);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/probe`;
  await context.route('**/*', route => route.continue());
  const transfer = () => page.evaluate(async (probeUrl) => {
    const start = performance.now();
    const response = await fetch(probeUrl);
    const headersMs = performance.now() - start;
    const bytes = (await response.arrayBuffer()).byteLength;
    return { headersMs, elapsedMs: performance.now() - start, bytes };
  }, url);
  try {
    const baseline = await transfer();
    const applied = await applyControlledConditions(page);
    const controlled = await transfer();
    await testInfo.attach('conditions-probe.json', {
      contentType: 'application/json',
      body: JSON.stringify({ baseline, controlled, applied: applied.profile, browser: context.browser()?.version() }),
    });
    expect(baseline.bytes).toBe(262_144);
    expect(controlled.bytes).toBe(262_144);
    expect(controlled.headersMs).toBeGreaterThanOrEqual(120);
    expect(controlled.elapsedMs).toBeGreaterThanOrEqual(1_200);
    expect(controlled.elapsedMs).toBeGreaterThan(baseline.elapsedMs * 2);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
