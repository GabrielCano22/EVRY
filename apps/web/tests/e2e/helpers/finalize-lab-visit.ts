import { expect, type Page } from '@playwright/test';

export async function finalizeLabVisit(page: Page, readINP: () => number | undefined, beforeClose: () => void | Promise<void>) {
  // The observer may deliver on an idle task after the UI action finishes.
  // Closing its document first loses that task and produces missing, not zero, INP.
  const deadline = Date.now() + 5000;
  // A finite metric from an earlier input is not enough: give the last input's
  // paint/EventTiming delivery and queued idle observer work a chance to finish.
  // This is strictly after all measured actions, never before the first input.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Interaction observer did not settle before finalization')), 5000);
    requestAnimationFrame(() => requestAnimationFrame(() => requestIdleCallback(() => {
      clearTimeout(timer);
      resolve();
    })));
  }));
  await expect.poll(() => Number.isFinite(readINP()), {
    timeout: Math.max(1, deadline - Date.now()),
    message: 'actual INP must be reported before closing the measured document',
  }).toBe(true);
  // Async diagnostic reads still belong to this document. Do not navigate
  // until their result has been copied out of its execution context.
  await beforeClose();
  await page.goto('about:blank');
}
