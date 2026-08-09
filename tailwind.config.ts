import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // EVRY brand palette
        background: '#0a141d',
        surface: '#0a141d',
        'surface-dim': '#0a141d',
        'surface-bright': '#303a44',
        'surface-container-lowest': '#060f18',
        'surface-container-low': '#131d26',
        'surface-container': '#17212a',
        'surface-container-high': '#212b34',
        'surface-container-highest': '#2c363f',
        'surface-variant': '#2c363f',

        // Foreground
        'on-surface': '#ffffff',
        'on-surface-variant': '#A1ABB7',
        'on-background': '#ffffff',
        'inverse-surface': '#ffffff',
        'inverse-on-surface': '#28313b',
        outline: '#A1ABB7',
        'outline-variant': '#414755',

        // Primary — iOS Blue
        primary: '#007AFF',
        'primary-fixed': '#4DA2FF',
        'primary-fixed-dim': '#0A84FF',
        'on-primary': '#ffffff',
        'primary-container': '#0A84FF',
        'on-primary-container': '#ffffff',
        'surface-tint': '#007AFF',
        'inverse-primary': '#0051A8',
        'on-primary-fixed': '#ffffff',
        'on-primary-fixed-variant': '#0051A8',

        // Secondary — Electric Purple
        secondary: '#BF5AF2',
        'on-secondary': '#ffffff',
        'secondary-container': '#7D2FA8',
        'on-secondary-container': '#F4D9FF',
        'secondary-fixed': '#E0B6FF',
        'secondary-fixed-dim': '#BF5AF2',
        'on-secondary-fixed': '#310048',
        'on-secondary-fixed-variant': '#7D2FA8',

        // Tertiary — Soft Coral (cycle)
        tertiary: '#FF8A8A',
        'on-tertiary': '#5A0F14',
        'tertiary-container': '#FF8A8A',
        'on-tertiary-container': '#5A0F14',
        'tertiary-fixed': '#FFD3D3',
        'tertiary-fixed-dim': '#FF8A8A',
        'on-tertiary-fixed': '#410007',
        'on-tertiary-fixed-variant': '#7F282C',

        // Neutral
        neutral: '#A1ABB7',

        error: '#FF453A',
        'on-error': '#ffffff',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        ok: '#30D158',
        warn: '#FF9F0A',
      },
      fontFamily: {
        abril: ['var(--font-abril-fatface)', 'Abril Fatface', 'serif'],
        // Legacy aliases keep existing component classes consistent with the
        // single project-wide typeface.
        lexend: ['var(--font-abril-fatface)', 'Abril Fatface', 'serif'],
        grotesk: ['var(--font-abril-fatface)', 'Abril Fatface', 'serif'],
        sans: ['var(--font-abril-fatface)', 'Abril Fatface', 'serif'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '76px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.18em', fontWeight: '700' }],
        'numeric-data': ['20px', { lineHeight: '24px', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        xs: '4px',
        sm: '8px',
        gutter: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        '2xl': '64px',
        'container-padding': '16px',
      },
    },
  },
  plugins: [],
};
export default config;
