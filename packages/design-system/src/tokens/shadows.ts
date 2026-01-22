/**
 * Shadow/Elevation Tokens
 *
 * Box shadows for depth and elevation.
 * Includes light and dark mode variants matching the "luma" shadows in globals.css.
 */

/**
 * Box shadow scale for light mode (CSS values)
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

/**
 * Luma-style shadows (matching globals.css)
 */
export const shadowsLuma = {
  DEFAULT:
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.05)',
} as const;

/**
 * Box shadow scale for dark mode (CSS values)
 */
export const shadowsDark = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.15)',
} as const;

/**
 * Luma-style shadows for dark mode
 */
export const shadowsLumaDark = {
  DEFAULT:
    '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
} as const;

/**
 * Shadow configuration for React Native
 * Using iOS shadow properties
 */
export const shadowsNative = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 12,
  },
} as const;

/**
 * Shadow configuration for React Native - Dark mode
 * Increased opacity for better visibility on dark backgrounds
 */
export const shadowsNativeDark = {
  none: shadowsNative.none,
  sm: {
    ...shadowsNative.sm,
    shadowOpacity: 0.2,
  },
  DEFAULT: {
    ...shadowsNative.DEFAULT,
    shadowOpacity: 0.3,
  },
  md: {
    ...shadowsNative.md,
    shadowOpacity: 0.3,
  },
  lg: {
    ...shadowsNative.lg,
    shadowOpacity: 0.3,
  },
  xl: {
    ...shadowsNative.xl,
    shadowOpacity: 0.4,
  },
  '2xl': {
    ...shadowsNative['2xl'],
    shadowOpacity: 0.5,
  },
} as const;

/**
 * Semantic shadow tokens for common components
 */
export const shadowsSemantic = {
  // Cards
  card: shadows.md,
  cardHover: shadows.lg,
  cardPressed: shadows.sm,

  // Buttons
  buttonRaised: shadows.DEFAULT,
  buttonRaisedHover: shadows.md,
  buttonPressed: shadows.sm,

  // Inputs
  inputFocus: `0 0 0 3px rgba(20, 184, 166, 0.1), ${shadows.DEFAULT}`, // primary-500 ring

  // Modals/Dialogs
  modal: shadows['2xl'],
  dialog: shadows.xl,
  drawer: shadows.xl,

  // Dropdowns/Popovers
  dropdown: shadows.lg,
  popover: shadows.lg,
  tooltip: shadows.md,

  // Navigation
  navbar: shadows.DEFAULT,
  sidebar: shadows.lg,
  bottomNav: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',

  // Floating elements
  fab: shadows.lg,
  floatingButton: shadows.md,
} as const;

/**
 * Semantic shadow tokens for React Native
 */
export const shadowsSemanticNative = {
  card: shadowsNative.md,
  cardHover: shadowsNative.lg,
  cardPressed: shadowsNative.sm,

  buttonRaised: shadowsNative.DEFAULT,
  buttonRaisedHover: shadowsNative.md,
  buttonPressed: shadowsNative.sm,

  modal: shadowsNative['2xl'],
  dialog: shadowsNative.xl,
  drawer: shadowsNative.xl,

  dropdown: shadowsNative.lg,
  popover: shadowsNative.lg,
  tooltip: shadowsNative.md,

  navbar: shadowsNative.DEFAULT,
  sidebar: shadowsNative.lg,
  bottomNav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  fab: shadowsNative.lg,
  floatingButton: shadowsNative.md,
} as const;

export type ShadowKey = keyof typeof shadows;
export type ShadowValue = (typeof shadows)[ShadowKey];
export type ShadowSemanticKey = keyof typeof shadowsSemantic;
export type ShadowNativeKey = keyof typeof shadowsNative;
export type ShadowNativeValue = (typeof shadowsNative)[ShadowNativeKey];
