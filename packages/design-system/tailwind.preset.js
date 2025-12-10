/**
 * Design System Tailwind Preset (JavaScript)
 *
 * This file provides a CommonJS-compatible export for use in tailwind.config.js
 * which runs in Node.js at build time (not through a TypeScript transpiler).
 *
 * Colors and tokens are kept in sync with ./src/tokens/colors.ts
 */

const primary = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
  950: '#042f2e',
  DEFAULT: '#14b8a6',
};

const secondary = {
  50: '#fdf0f0',
  100: '#fbe1e2',
  200: '#f8c3c5',
  300: '#f4a6a7',
  400: '#f1888a',
  500: '#ed6a6d',
  600: '#be5557',
  700: '#8e4041',
  800: '#5f2a2c',
  900: '#2f1516',
  950: '#180b0b',
  DEFAULT: '#ed6a6d',
};

const accent = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
  DEFAULT: '#f59e0b',
};

const neutral = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
};

const status = {
  success: {
    light: '#10b981',
    DEFAULT: '#059669',
    dark: '#047857',
  },
  error: {
    light: '#f87171',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  warning: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },
  info: {
    light: '#38bdf8',
    DEFAULT: '#0ea5e9',
    dark: '#0284c7',
  },
};

const tailwindColors = {
  transparent: 'transparent',
  current: 'currentColor',
  black: '#000000',
  white: '#ffffff',
  primary,
  secondary,
  accent,
  neutral,
  success: status.success,
  error: status.error,
  warning: status.warning,
  info: status.info,
};

const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

const fontFamily = {
  heading: ['Poppins', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
  mono: ['Fira Code', 'Consolas', 'monospace'],
  sans: ['Inter', 'sans-serif'],
};

const tailwindPreset = {
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily,
      spacing,
      borderRadius,
    },
  },
};

module.exports = {
  tailwindPreset,
  tailwindColors,
  primary,
  secondary,
  accent,
  neutral,
  status,
  spacing,
  borderRadius,
  fontFamily,
};
