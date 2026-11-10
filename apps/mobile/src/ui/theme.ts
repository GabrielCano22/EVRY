import { colors as sharedColors, radii, spacing } from '@evry/design-tokens';

export const theme = {
  // Mobile-only palette: keep shared tokens and web styling unchanged.
  colors: { ...sharedColors, background: '#0A0B0D', surface: '#181A1E', surfaceHigh: '#25282E' },
  radii,
  spacing,
} as const;
