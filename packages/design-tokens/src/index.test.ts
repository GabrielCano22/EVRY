import { describe, expect, it } from 'vitest';
import { colors, spacing } from './index';

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [];
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(left: string, right: string) {
  const luminances = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
  return ((luminances[0] ?? 0) + 0.05) / ((luminances[1] ?? 0) + 0.05);
}

describe('design tokens', () => {
  it('shares stable semantic colors and spacing across platforms', () => {
    expect(colors.primary).toBe('#168DFF');
    expect(colors.onPrimary).toBe('#06111C');
    expect(spacing.md).toBe(16);
  });

  it('keeps primary text and controls above the WCAG AA contrast threshold', () => {
    expect(contrastRatio(colors.primary, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
