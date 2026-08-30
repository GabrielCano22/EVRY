import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readers = [
  'app/(app)/cycle/page.tsx', 'app/(app)/dashboard/page.tsx', 'components/progress/ProgressPage.tsx',
  'app/(app)/workout/page.tsx', 'app/(app)/workout/[id]/page.tsx', 'app/(app)/workout/routines/[id]/page.tsx',
  'components/CalendarioActividad.tsx', 'components/ExerciseChart.tsx', 'components/ExercisePicker.tsx', 'components/ReadinessCheckin.tsx',
];

describe('remote read boundary', () => {
  it('does not hide failed reads as empty data or redirects', () => {
    for (const file of readers) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).not.toMatch(/api<[^>]+>\([^\n]*\)(?:\.then)?\.catch/);
      expect(source).not.toMatch(/\.catch\([^)]*=>\s*(?:\[\]|null|router\.replace)/);
      expect(source).toContain('request');
    }
  });
});
