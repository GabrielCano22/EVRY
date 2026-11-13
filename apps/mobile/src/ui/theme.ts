import { colors as sharedColors, radii as sharedRadii, spacing } from '@evry/design-tokens';

/**
 * Mobile-specific visual language. It keeps the shared brand tokens for
 * semantics (primary, success, cycle…) but uses a denser, near-black surface
 * scale and larger radii than the web dashboard.
 */
export const theme = {
  colors: {
    ...sharedColors,
    background: '#0A0B0D',
    backgroundElevated: '#101216',
    surface: '#16181D',
    surfaceHigh: '#21242B',
    surfaceHighest: '#2B2F37',
    border: '#2E323B',
    text: '#F4F6F9',
    textMuted: '#98A2B3',
    textDim: '#6C7686',
    primary: '#168DFF',
    primaryPressed: '#0F7AE0',
    primarySoft: 'rgba(22, 141, 255, 0.14)',
    onPrimary: '#06111C',
    success: '#30D158',
    successSoft: 'rgba(48, 209, 88, 0.14)',
    warning: '#FF9F0A',
    warningSoft: 'rgba(255, 159, 10, 0.14)',
    error: '#FF453A',
    errorSoft: 'rgba(255, 69, 58, 0.14)',
    cycle: '#FF8A8A',
    cycleSoft: 'rgba(255, 138, 138, 0.14)',
    overlay: 'rgba(0, 0, 0, 0.64)',
  },
  radii: {
    ...sharedRadii,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  spacing,
  type: {
    display: 34,
    title: 28,
    heading: 20,
    subheading: 16,
    body: 15,
    caption: 12,
    micro: 10,
  },
} as const;
