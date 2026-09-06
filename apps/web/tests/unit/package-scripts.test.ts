import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('quotes Vitest exclude globs so POSIX shells do not expand E2E files into unit tests', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> };

  expect(packageJson.scripts['test:unit']).toContain('--exclude "tests/a11y/**"');
  expect(packageJson.scripts['test:unit']).toContain('--exclude "tests/e2e/**"');
});
