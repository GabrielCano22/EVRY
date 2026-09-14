import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const consumers = [
  'app/(app)/cycle/page.tsx',
  'app/(app)/dashboard/page.tsx',
  'components/CalendarioActividad.tsx',
  'components/ExerciseChart.tsx',
  'components/ReadinessCheckin.tsx',
  'components/progress/ProgressPage.tsx',
] as const;

describe('generated domain transport boundary', () => {
  it.each(consumers)('%s does not bypass its generated domain API', (relativePath) => {
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');

    expect(source).not.toMatch(/from ['"]@\/lib\/api['"]/);
    expect(source).not.toContain('requestOrThrow');
  });

  it('does not redeclare cycle or progress response DTOs in the legacy types module', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/types.ts'), 'utf8');

    expect(source).not.toMatch(/export interface (RegistroCiclo|InfoFase|ResumenProgreso)/);
  });
});
