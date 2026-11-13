import { theme } from './theme';

// WCAG relative luminance for opaque sRGB #RRGGBB colors.
function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected opaque sRGB color: ${hex}`);
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('mobile theme contrast', () => {
  it('calculates WCAG contrast using linearized sRGB', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.478, 3);
  });

  it.each(['background', 'backgroundElevated', 'surface', 'surfaceHigh', 'surfaceHighest'] as const)(
    'keeps dim text at AA normal-text contrast on %s',
    (surface) => {
      expect(contrast(theme.colors.textDim, theme.colors[surface])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps dim text darker than muted text', () => {
    expect(luminance(theme.colors.textDim)).toBeLessThan(luminance(theme.colors.textMuted));
  });
});
