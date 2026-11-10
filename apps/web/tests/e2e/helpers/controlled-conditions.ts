import type { Page } from '@playwright/test';

export async function applyControlledConditions(page: Page) {
  const profile = {
    name: 'evry-lab-cpu4-network150-1.6mbps',
    cpuSlowdown: 4,
    latencyMs: 150,
    downloadBytesPerSecond: 200_000,
    uploadBytesPerSecond: 93_750,
    cache: 'disabled',
    calibration: 'relative to host CPU; not a calibrated physical device or official preset',
  } as const;
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
  const network = {
    latency: profile.latencyMs,
    downloadThroughput: profile.downloadBytesPerSecond,
    uploadThroughput: profile.uploadBytesPerSecond,
    connectionType: 'cellular4g',
  } as const;
  const { ruleIds } = await session.send('Network.emulateNetworkConditionsByRule', {
    matchedNetworkConditions: [{ urlPattern: '', ...network }],
  });
  if (!Array.isArray(ruleIds) || ruleIds.length !== 1 || typeof ruleIds[0] !== 'string' || !ruleIds[0]) {
    throw new Error('Controlled network rule was not acknowledged');
  }
  await session.send('Network.overrideNetworkState', { offline: false, ...network });
  return { profile, session, ruleId: ruleIds[0] };
}
