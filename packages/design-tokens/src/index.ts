export const colors = {
  background: '#0a141d',
  surface: '#17212a',
  surfaceHigh: '#212b34',
  text: '#ffffff',
  textMuted: '#A1ABB7',
  primary: '#168DFF',
  onPrimary: '#06111C',
  secondary: '#BF5AF2',
  cycle: '#FF8A8A',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  gutter: 12,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

export const typography = {
  family: 'ManropeVariable',
  fallback: 'system-ui, sans-serif',
} as const;

export const radii = { sm: 2, md: 6, lg: 8, xl: 12, full: 9999 } as const;
