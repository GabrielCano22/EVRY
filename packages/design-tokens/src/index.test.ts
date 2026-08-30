import { describe, expect, it } from 'vitest';
import { colors, spacing } from './index';

describe('design tokens', () => {
  it('shares stable semantic colors and spacing across platforms', () => {
    expect(colors.primary).toBe('#007AFF');
    expect(spacing.md).toBe(16);
  });
});
