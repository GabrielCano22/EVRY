import { expect, it } from 'vitest';
import sharp from 'sharp';

it('loads the patched native SVG decoder required by GHSA-wq5f-xc86-pv6w', () => {
  // The upstream fix requires librsvg >= 2.63.2. Inspect the library actually
  // loaded, not just the npm label; do not run a memory-corruption payload.
  const version = sharp.versions.rsvg;
  if (typeof version !== 'string') throw new Error('The loaded native SVG decoder must expose its version');
  expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  const [major, minor, patch] = version.split('.').map(Number);
  expect(major > 2 || (major === 2 && (minor > 63 || (minor === 63 && patch >= 2))), version).toBe(true);
});

it('keeps legitimate image decoding and thumbnail conversion working', async () => {
  const image = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><rect width="24" height="16" fill="red"/></svg>');
  const result = await sharp(image).resize(12, 8).png().toBuffer();
  expect(await sharp(result).metadata()).toMatchObject({ format: 'png', width: 12, height: 8 });
  const pixels = await sharp(result).removeAlpha().raw().toBuffer();
  expect([...pixels.subarray(0, 3)]).toEqual([255, 0, 0]);
});
