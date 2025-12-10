/**
 * NativeWind Configuration - Design System
 *
 * Configuration generator for NativeWind (Tailwind CSS for React Native).
 * Use this to generate a tailwind.config.js for your mobile app.
 */

import { tailwindPreset, tailwindColors, tailwindTypography } from './tailwind.preset';
import { primary, secondary, accent, neutral, base, status, darkMode } from '../tokens/colors';
import { fontFamilyNative, fontSizePixels, fontWeightNumeric } from '../tokens/typography';
import { spacingPixels } from '../tokens/spacing';
import { radiusPixels } from '../tokens/radius';

/**
 * NativeWind-compatible color configuration
 * Uses CSS variables for theme switching support
 */
export const nativewindColors = {
  // Use CSS variables for dynamic theming
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  card: 'var(--card)',
  'card-foreground': 'var(--card-foreground)',
  popover: 'var(--popover)',
  'popover-foreground': 'var(--popover-foreground)',
  primary: {
    DEFAULT: 'var(--primary)',
    foreground: 'var(--primary-foreground)',
    50: 'var(--primary-50)',
    100: 'var(--primary-100)',
    200: 'var(--primary-200)',
    300: 'var(--primary-300)',
    400: 'var(--primary-400)',
    500: 'var(--primary-500)',
    600: 'var(--primary-600)',
    700: 'var(--primary-700)',
    800: 'var(--primary-800)',
    900: 'var(--primary-900)',
    950: 'var(--primary-950)',
  },
  secondary: {
    DEFAULT: 'var(--secondary)',
    foreground: 'var(--secondary-foreground)',
    50: 'var(--secondary-50)',
    100: 'var(--secondary-100)',
    200: 'var(--secondary-200)',
    300: 'var(--secondary-300)',
    400: 'var(--secondary-400)',
    500: 'var(--secondary-500)',
    600: 'var(--secondary-600)',
    700: 'var(--secondary-700)',
    800: 'var(--secondary-800)',
    900: 'var(--secondary-900)',
    950: 'var(--secondary-950)',
  },
  accent: {
    DEFAULT: 'var(--accent)',
    foreground: 'var(--accent-foreground)',
    50: 'var(--accent-50)',
    100: 'var(--accent-100)',
    200: 'var(--accent-200)',
    300: 'var(--accent-300)',
    400: 'var(--accent-400)',
    500: 'var(--accent-500)',
    600: 'var(--accent-600)',
    700: 'var(--accent-700)',
    800: 'var(--accent-800)',
    900: 'var(--accent-900)',
    950: 'var(--accent-950)',
  },
  muted: {
    DEFAULT: 'var(--muted)',
    foreground: 'var(--muted-foreground)',
  },
  destructive: {
    DEFAULT: 'var(--destructive)',
    foreground: 'var(--destructive-foreground)',
  },
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',

  // Direct color values (for cases where CSS vars don't work)
  // Exclude primary, secondary, accent as they're already defined above with CSS vars
  transparent: tailwindColors.transparent,
  current: tailwindColors.current,
  black: tailwindColors.black,
  white: tailwindColors.white,
  neutral: tailwindColors.neutral,
  success: tailwindColors.success,
  error: tailwindColors.error,
  warning: tailwindColors.warning,
  info: tailwindColors.info,
} as const;

/**
 * NativeWind-specific configuration
 * Optimized for React Native
 */
export const nativewindConfig = {
  // Content paths for NativeWind to scan
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/shared-components/src/**/*.{js,jsx,ts,tsx}',
  ],

  // Presets
  presets: [require('nativewind/preset')],

  // Theme configuration
  theme: {
    extend: {
      colors: nativewindColors,
      fontFamily: {
        heading: fontFamilyNative.heading,
        'heading-medium': fontFamilyNative.headingMedium,
        'heading-semibold': fontFamilyNative.headingSemiBold,
        'heading-bold': fontFamilyNative.headingBold,
        'heading-extrabold': fontFamilyNative.headingExtraBold,
        body: fontFamilyNative.body,
        'body-medium': fontFamilyNative.bodyMedium,
        'body-semibold': fontFamilyNative.bodySemiBold,
        'body-bold': fontFamilyNative.bodyBold,
        mono: fontFamilyNative.mono,
        sans: fontFamilyNative.body,
      },
      fontSize: tailwindTypography.fontSize,
      fontWeight: tailwindTypography.fontWeight,
      lineHeight: tailwindTypography.lineHeight,
      letterSpacing: tailwindTypography.letterSpacing,
      borderRadius: {
        none: '0px',
        sm: `${radiusPixels.sm}px`,
        DEFAULT: `${radiusPixels.DEFAULT}px`,
        md: `${radiusPixels.md}px`,
        lg: `${radiusPixels.lg}px`,
        xl: `${radiusPixels.xl}px`,
        '2xl': `${radiusPixels['2xl']}px`,
        '3xl': `${radiusPixels['3xl']}px`,
        full: `${radiusPixels.full}px`,
      },
    },
  },

  // Dark mode configuration
  darkMode: 'class',
} as const;

/**
 * Generate CSS variables for NativeWind global styles
 * Include this in your global.css or App component
 */
export function generateNativewindGlobalCSS(): string {
  return `
/* NativeWind Global Styles - Generated from @rallia/design-system */

:root {
  /* Semantic colors - Light mode */
  --background: ${base.white};
  --foreground: ${neutral[950]};
  --card: ${base.white};
  --card-foreground: ${neutral[950]};
  --popover: ${base.white};
  --popover-foreground: ${neutral[950]};
  --primary: ${neutral[900]};
  --primary-foreground: ${neutral[50]};
  --secondary: ${neutral[100]};
  --secondary-foreground: ${neutral[900]};
  --muted: ${neutral[100]};
  --muted-foreground: ${neutral[500]};
  --accent: ${neutral[100]};
  --accent-foreground: ${neutral[900]};
  --destructive: ${status.error.DEFAULT};
  --destructive-foreground: ${base.white};
  --border: ${neutral[200]};
  --input: ${neutral[200]};
  --ring: ${neutral[400]};

  /* Primary scale */
  --primary-50: ${primary[50]};
  --primary-100: ${primary[100]};
  --primary-200: ${primary[200]};
  --primary-300: ${primary[300]};
  --primary-400: ${primary[400]};
  --primary-500: ${primary[500]};
  --primary-600: ${primary[600]};
  --primary-700: ${primary[700]};
  --primary-800: ${primary[800]};
  --primary-900: ${primary[900]};
  --primary-950: ${primary[950]};

  /* Secondary scale */
  --secondary-50: ${secondary[50]};
  --secondary-100: ${secondary[100]};
  --secondary-200: ${secondary[200]};
  --secondary-300: ${secondary[300]};
  --secondary-400: ${secondary[400]};
  --secondary-500: ${secondary[500]};
  --secondary-600: ${secondary[600]};
  --secondary-700: ${secondary[700]};
  --secondary-800: ${secondary[800]};
  --secondary-900: ${secondary[900]};
  --secondary-950: ${secondary[950]};

  /* Accent scale */
  --accent-50: ${accent[50]};
  --accent-100: ${accent[100]};
  --accent-200: ${accent[200]};
  --accent-300: ${accent[300]};
  --accent-400: ${accent[400]};
  --accent-500: ${accent[500]};
  --accent-600: ${accent[600]};
  --accent-700: ${accent[700]};
  --accent-800: ${accent[800]};
  --accent-900: ${accent[900]};
  --accent-950: ${accent[950]};
}

.dark {
  /* Semantic colors - Dark mode */
  --background: ${neutral[950]};
  --foreground: ${neutral[50]};
  --card: ${neutral[900]};
  --card-foreground: ${neutral[50]};
  --popover: ${neutral[900]};
  --popover-foreground: ${neutral[50]};
  --primary: ${neutral[200]};
  --primary-foreground: ${neutral[900]};
  --secondary: ${neutral[800]};
  --secondary-foreground: ${neutral[50]};
  --muted: ${neutral[800]};
  --muted-foreground: ${neutral[400]};
  --accent: ${neutral[800]};
  --accent-foreground: ${neutral[50]};
  --destructive: ${status.error.light};
  --destructive-foreground: ${base.white};
  --border: rgba(255, 255, 255, 0.1);
  --input: rgba(255, 255, 255, 0.15);
  --ring: ${neutral[500]};

  /* Primary scale - Dark mode */
  --primary-50: ${darkMode.primary[50]};
  --primary-100: ${darkMode.primary[100]};
  --primary-200: ${darkMode.primary[200]};
  --primary-300: ${darkMode.primary[300]};
  --primary-400: ${darkMode.primary[400]};
  --primary-500: ${darkMode.primary[500]};
  --primary-600: ${darkMode.primary[600]};
  --primary-700: ${darkMode.primary[700]};
  --primary-800: ${darkMode.primary[800]};
  --primary-900: ${darkMode.primary[900]};

  /* Secondary scale - Dark mode */
  --secondary-50: ${darkMode.secondary[50]};
  --secondary-100: ${darkMode.secondary[100]};
  --secondary-200: ${darkMode.secondary[200]};
  --secondary-300: ${darkMode.secondary[300]};
  --secondary-400: ${darkMode.secondary[400]};
  --secondary-500: ${darkMode.secondary[500]};
  --secondary-600: ${darkMode.secondary[600]};
  --secondary-700: ${darkMode.secondary[700]};
  --secondary-800: ${darkMode.secondary[800]};
  --secondary-900: ${darkMode.secondary[900]};

  /* Accent scale - Dark mode */
  --accent-50: ${darkMode.accent[50]};
  --accent-100: ${darkMode.accent[100]};
  --accent-200: ${darkMode.accent[200]};
  --accent-300: ${darkMode.accent[300]};
  --accent-400: ${darkMode.accent[400]};
  --accent-500: ${darkMode.accent[500]};
  --accent-600: ${darkMode.accent[600]};
  --accent-700: ${darkMode.accent[700]};
  --accent-800: ${darkMode.accent[800]};
  --accent-900: ${darkMode.accent[900]};
}
`.trim();
}

/**
 * Direct color values for React Native StyleSheet
 * Use when CSS variables are not supported
 */
export const nativeColors = {
  light: {
    background: base.white,
    foreground: neutral[950],
    card: base.white,
    cardForeground: neutral[950],
    primary: neutral[900],
    primaryForeground: neutral[50],
    secondary: neutral[100],
    secondaryForeground: neutral[900],
    muted: neutral[100],
    mutedForeground: neutral[500],
    accent: neutral[100],
    accentForeground: neutral[900],
    destructive: status.error.DEFAULT,
    destructiveForeground: base.white,
    border: neutral[200],
    input: neutral[200],
    ring: neutral[400],
    palette: { primary, secondary, accent },
  },
  dark: {
    background: neutral[950],
    foreground: neutral[50],
    card: neutral[900],
    cardForeground: neutral[50],
    primary: neutral[200],
    primaryForeground: neutral[900],
    secondary: neutral[800],
    secondaryForeground: neutral[50],
    muted: neutral[800],
    mutedForeground: neutral[400],
    accent: neutral[800],
    accentForeground: neutral[50],
    destructive: status.error.light,
    destructiveForeground: base.white,
    border: 'rgba(255, 255, 255, 0.1)',
    input: 'rgba(255, 255, 255, 0.15)',
    ring: neutral[500],
    palette: {
      primary: darkMode.primary,
      secondary: darkMode.secondary,
      accent: darkMode.accent,
    },
  },
} as const;

export type NativewindConfig = typeof nativewindConfig;
export type NativeColors = typeof nativeColors;

