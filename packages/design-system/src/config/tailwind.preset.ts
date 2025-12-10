/**
 * Tailwind v4 Preset - Design System
 *
 * This preset provides design tokens for Tailwind CSS v4.
 * Import into your tailwind.config or use with @config directive.
 *
 * Note: Tailwind v4 uses CSS-based configuration primarily.
 * This file exports values that can be used to generate CSS variables
 * or extend the config programmatically.
 */

import { primary, secondary, accent, neutral, base, status } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { shadows, shadowsLuma } from '../tokens/shadows';
import { breakpoints } from '../tokens/breakpoints';
import { easing, durationSeconds, keyframes } from '../tokens/animations';

/**
 * Color palette for Tailwind theme extension
 */
export const tailwindColors = {
  // Base colors
  transparent: base.transparent,
  current: 'currentColor',
  black: base.black,
  white: base.white,

  // Primary palette
  primary: {
    50: primary[50],
    100: primary[100],
    200: primary[200],
    300: primary[300],
    400: primary[400],
    500: primary[500],
    600: primary[600],
    700: primary[700],
    800: primary[800],
    900: primary[900],
    950: primary[950],
    DEFAULT: primary[500],
  },

  // Secondary palette
  secondary: {
    50: secondary[50],
    100: secondary[100],
    200: secondary[200],
    300: secondary[300],
    400: secondary[400],
    500: secondary[500],
    600: secondary[600],
    700: secondary[700],
    800: secondary[800],
    900: secondary[900],
    950: secondary[950],
    DEFAULT: secondary[500],
  },

  // Accent palette
  accent: {
    50: accent[50],
    100: accent[100],
    200: accent[200],
    300: accent[300],
    400: accent[400],
    500: accent[500],
    600: accent[600],
    700: accent[700],
    800: accent[800],
    900: accent[900],
    950: accent[950],
    DEFAULT: accent[500],
  },

  // Neutral/Gray palette
  neutral: {
    50: neutral[50],
    100: neutral[100],
    200: neutral[200],
    300: neutral[300],
    400: neutral[400],
    500: neutral[500],
    600: neutral[600],
    700: neutral[700],
    800: neutral[800],
    900: neutral[900],
    950: neutral[950],
  },

  // Semantic status colors
  success: {
    light: status.success.light,
    DEFAULT: status.success.DEFAULT,
    dark: status.success.dark,
  },
  error: {
    light: status.error.light,
    DEFAULT: status.error.DEFAULT,
    dark: status.error.dark,
  },
  warning: {
    light: status.warning.light,
    DEFAULT: status.warning.DEFAULT,
    dark: status.warning.dark,
  },
  info: {
    light: status.info.light,
    DEFAULT: status.info.DEFAULT,
    dark: status.info.dark,
  },
} as const;

/**
 * Typography configuration for Tailwind
 */
export const tailwindTypography = {
  fontFamily: {
    heading: fontFamily.heading,
    body: fontFamily.body,
    mono: fontFamily.mono,
    sans: fontFamily.body,
  },
  fontSize: {
    xs: [fontSize.xs, { lineHeight: lineHeight.normal }],
    sm: [fontSize.sm, { lineHeight: lineHeight.normal }],
    base: [fontSize.base, { lineHeight: lineHeight.relaxed }],
    lg: [fontSize.lg, { lineHeight: lineHeight.relaxed }],
    xl: [fontSize.xl, { lineHeight: lineHeight.snug }],
    '2xl': [fontSize['2xl'], { lineHeight: lineHeight.snug }],
    '3xl': [fontSize['3xl'], { lineHeight: lineHeight.snug }],
    '4xl': [fontSize['4xl'], { lineHeight: lineHeight.tight }],
    '5xl': [fontSize['5xl'], { lineHeight: lineHeight.tight }],
    '6xl': [fontSize['6xl'], { lineHeight: lineHeight.tight }],
    '7xl': [fontSize['7xl'], { lineHeight: lineHeight.tight }],
    '8xl': [fontSize['8xl'], { lineHeight: lineHeight.tight }],
    '9xl': [fontSize['9xl'], { lineHeight: lineHeight.tight }],
  },
  fontWeight,
  lineHeight,
  letterSpacing,
} as const;

/**
 * Spacing scale for Tailwind
 */
export const tailwindSpacing = spacing;

/**
 * Border radius for Tailwind
 */
export const tailwindBorderRadius = radius;

/**
 * Box shadows for Tailwind
 */
export const tailwindBoxShadow = {
  ...shadows,
  luma: shadowsLuma.DEFAULT,
  'luma-lg': shadowsLuma.lg,
} as const;

/**
 * Breakpoints for Tailwind
 */
export const tailwindScreens = {
  xs: `${breakpoints.xs}px`,
  sm: `${breakpoints.sm}px`,
  md: `${breakpoints.md}px`,
  lg: `${breakpoints.lg}px`,
  xl: `${breakpoints.xl}px`,
  '2xl': `${breakpoints['2xl']}px`,
} as const;

/**
 * Animation configuration for Tailwind
 */
export const tailwindAnimation = {
  keyframes: {
    'fade-in-up': {
      from: { opacity: '0', transform: 'translateY(30px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    'fade-in': {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    'fade-out': {
      from: { opacity: '1' },
      to: { opacity: '0' },
    },
    pulse: {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
    },
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    'bounce-subtle': {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-5px)' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    'accordion-down': {
      from: { height: '0' },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: '0' },
    },
  },
  animation: {
    'fade-in-up': `fade-in-up ${durationSeconds.verySlow} ${easing.easeOut} forwards`,
    'fade-in': `fade-in ${durationSeconds.verySlow} ${easing.easeOut} forwards`,
    'fade-out': `fade-out ${durationSeconds.slow} ${easing.easeIn} forwards`,
    pulse: `pulse 2s ${easing.easeInOut} infinite`,
    shimmer: `shimmer 1.5s infinite`,
    'bounce-subtle': `bounce-subtle 2s ${easing.easeInOut} infinite`,
    spin: `spin 1s ${easing.linear} infinite`,
    'accordion-down': `accordion-down ${durationSeconds.normal} ${easing.easeOut}`,
    'accordion-up': `accordion-up ${durationSeconds.normal} ${easing.easeOut}`,
  },
} as const;

/**
 * Transition configuration for Tailwind
 */
export const tailwindTransition = {
  transitionTimingFunction: {
    DEFAULT: easing.smooth,
    linear: easing.linear,
    in: easing.easeIn,
    out: easing.easeOut,
    'in-out': easing.easeInOut,
    'in-quad': easing.easeInQuad,
    'out-quad': easing.easeOutQuad,
    'in-out-quad': easing.easeInOutQuad,
    'in-cubic': easing.easeInCubic,
    'out-cubic': easing.easeOutCubic,
    'in-out-cubic': easing.easeInOutCubic,
    spring: easing.spring,
    bounce: easing.bounce,
  },
  transitionDuration: {
    fastest: durationSeconds.fastest,
    faster: durationSeconds.faster,
    fast: durationSeconds.fast,
    DEFAULT: durationSeconds.normal,
    slow: durationSeconds.slow,
    slower: durationSeconds.slower,
    slowest: durationSeconds.slowest,
  },
} as const;

/**
 * Complete Tailwind preset configuration
 * Use this as a starting point for your tailwind.config.js
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: tailwindTypography.fontFamily,
      fontSize: tailwindTypography.fontSize,
      fontWeight: tailwindTypography.fontWeight,
      lineHeight: tailwindTypography.lineHeight,
      letterSpacing: tailwindTypography.letterSpacing,
      spacing: tailwindSpacing,
      borderRadius: tailwindBorderRadius,
      boxShadow: tailwindBoxShadow,
      screens: tailwindScreens,
      keyframes: tailwindAnimation.keyframes,
      animation: tailwindAnimation.animation,
      transitionTimingFunction: tailwindTransition.transitionTimingFunction,
      transitionDuration: tailwindTransition.transitionDuration,
    },
  },
} as const;

/**
 * Generate CSS custom properties string for :root
 * Can be injected into your CSS or generated at build time
 */
export function generateCSSVariables(): string {
  const variables: string[] = [];

  // Primary colors
  Object.entries(primary).forEach(([shade, value]) => {
    variables.push(`  --primary-${shade}: ${value};`);
  });

  // Secondary colors
  Object.entries(secondary).forEach(([shade, value]) => {
    variables.push(`  --secondary-${shade}: ${value};`);
  });

  // Accent colors
  Object.entries(accent).forEach(([shade, value]) => {
    variables.push(`  --accent-${shade}: ${value};`);
  });

  return `:root {\n${variables.join('\n')}\n}`;
}

export type TailwindPreset = typeof tailwindPreset;

