/**
 * Breakpoint Tokens
 *
 * Responsive breakpoints for consistent media queries
 * across web and mobile platforms.
 */

/**
 * Breakpoint values in pixels
 */
export const breakpoints = {
  xs: 0, // Mobile portrait
  sm: 640, // Mobile landscape
  md: 768, // Tablet portrait
  lg: 1024, // Tablet landscape / Small desktop
  xl: 1280, // Desktop
  '2xl': 1536, // Large desktop
} as const;

/**
 * Breakpoint values as strings with 'px' unit
 */
export const breakpointsPx = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Max-width breakpoints (for max-width media queries)
 */
export const breakpointsMax = {
  xs: 639,
  sm: 767,
  md: 1023,
  lg: 1279,
  xl: 1535,
} as const;

/**
 * Media query strings (min-width)
 */
export const mediaQueries = {
  xs: `(min-width: ${breakpointsPx.xs})`,
  sm: `(min-width: ${breakpointsPx.sm})`,
  md: `(min-width: ${breakpointsPx.md})`,
  lg: `(min-width: ${breakpointsPx.lg})`,
  xl: `(min-width: ${breakpointsPx.xl})`,
  '2xl': `(min-width: ${breakpointsPx['2xl']})`,

  // Special queries
  mobile: `(max-width: ${breakpointsMax.sm}px)`,
  tablet: `(min-width: ${breakpointsPx.md}) and (max-width: ${breakpointsMax.lg}px)`,
  desktop: `(min-width: ${breakpointsPx.lg})`,
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  highContrast: '(prefers-contrast: high)',
  print: 'print',
} as const;

/**
 * Container max-widths at each breakpoint
 */
export const containerMaxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Screen size categories for React Native
 */
export const screenCategories = {
  phone: {
    minWidth: 0,
    maxWidth: 767,
  },
  tablet: {
    minWidth: 768,
    maxWidth: 1023,
  },
  desktop: {
    minWidth: 1024,
    maxWidth: Infinity,
  },
} as const;

/**
 * Helper to check if a width falls within a breakpoint range
 */
export function isBreakpoint(width: number, breakpoint: keyof typeof breakpoints): boolean {
  const bp = breakpoints[breakpoint];
  const nextBp =
    breakpoint === '2xl'
      ? Infinity
      : breakpoints[
          Object.keys(breakpoints)[
            Object.keys(breakpoints).indexOf(breakpoint) + 1
          ] as keyof typeof breakpoints
        ];
  return width >= bp && width < nextBp;
}

/**
 * Helper to get current breakpoint name from width
 */
export function getCurrentBreakpoint(width: number): keyof typeof breakpoints {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

export type BreakpointKey = keyof typeof breakpoints;
export type BreakpointValue = (typeof breakpoints)[BreakpointKey];
