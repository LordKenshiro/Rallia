/**
 * @rallia/design-system
 *
 * Unified design system for Rallia - providing consistent design tokens
 * across web (Tailwind CSS) and mobile (NativeWind) platforms.
 *
 * @example
 * ```typescript
 * // Import tokens
 * import { primary, secondary, spacing } from '@rallia/design-system';
 *
 * // Import themes
 * import { lightTheme, darkTheme } from '@rallia/design-system/themes';
 *
 * // Import config
 * import { tailwindPreset } from '@rallia/design-system/config/tailwind';
 * import { nativewindConfig } from '@rallia/design-system/config/nativewind';
 *
 * // Import utilities
 * import { hexToRgba, cssVar } from '@rallia/design-system/utils';
 * ```
 */

// ============================================================================
// TOKENS
// ============================================================================

// Colors
export {
  primary,
  secondary,
  accent,
  neutral,
  base,
  status,
  darkMode,
  colors,
  flatColors,
} from './tokens/colors';

// Typography
export {
  fontFamily,
  fontFamilyNative,
  fontSize,
  fontSizePixels,
  fontWeight,
  fontWeightNumeric,
  lineHeight,
  lineHeightMultiplier,
  letterSpacing,
  letterSpacingPixels,
  textStyles,
  textStylesNative,
  typography,
} from './tokens/typography';

// Spacing
export { spacing, spacingPixels, spacingSemantic, spacingSemanticPixels } from './tokens/spacing';

// Radius
export { radius, radiusPixels, radiusSemantic, radiusSemanticPixels } from './tokens/radius';

// Shadows
export {
  shadows,
  shadowsLuma,
  shadowsDark,
  shadowsLumaDark,
  shadowsNative,
  shadowsNativeDark,
  shadowsSemantic,
  shadowsSemanticNative,
} from './tokens/shadows';

// Z-Index
export { zIndex, zIndexSemantic } from './tokens/z-index';

// Animations
export {
  duration,
  durationSeconds,
  delay,
  stagger,
  easing,
  animations,
  overlayTiming,
  splashTiming,
  keyframes,
  transitions,
} from './tokens/animations';

// Breakpoints
export {
  breakpoints,
  breakpointsPx,
  breakpointsMax,
  mediaQueries,
  containerMaxWidths,
  screenCategories,
  isBreakpoint,
  getCurrentBreakpoint,
} from './tokens/breakpoints';

// ============================================================================
// THEMES
// ============================================================================

export {
  lightTheme,
  lightThemeCSSValues,
  darkTheme,
  darkThemeCSSValues,
  themes,
  themeCSSValues,
  getTheme,
  getThemeCSSValues,
  getThemeToken,
  systemPrefersDark,
  resolveThemeMode,
} from './themes';

// ============================================================================
// CONFIGURATION
// ============================================================================

export {
  tailwindColors,
  tailwindTypography,
  tailwindSpacing,
  tailwindBorderRadius,
  tailwindBoxShadow,
  tailwindScreens,
  tailwindAnimation,
  tailwindTransition,
  tailwindPreset,
  generateCSSVariables,
} from './config/tailwind.preset';

export {
  nativewindColors,
  nativewindConfig,
  generateNativewindGlobalCSS,
  nativeColors,
} from './config/nativewind';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  // CSS variable utilities
  objectToCSSVariables,
  generateColorScaleVariables,
  generateLightThemeCSS,
  generateDarkThemeCSS,
  generateThemeCSS,
  generateSpacingVariables,
  generateRadiusVariables,
  generateColorPaletteVariables,
  generateDarkModeColorVariables,
  generateDesignSystemCSS,
  cssVar,
  colorVar,
  spacingVar,
  radiusVar,
  // Color utilities
  hexToRgb,
  rgbToHex,
  hexToRgba,
  lighten,
  darken,
  getLuminance,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  getTextColorForBackground,
  getAccessibleTextColor,
  mixColors,
  generateColorScale,
  toGrayscale,
  isDark,
  isLight,
} from './utils';

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Token types
  ColorScale,
  ColorShade,
  PrimaryColor,
  SecondaryColor,
  AccentColor,
  NeutralColor,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  TextStyle,
  SpacingKey,
  SpacingValue,
  SpacingSemanticKey,
  RadiusKey,
  RadiusValue,
  RadiusSemanticKey,
  ShadowKey,
  ShadowValue,
  ShadowSemanticKey,
  ShadowNativeKey,
  ShadowNativeValue,
  ZIndexKey,
  ZIndexValue,
  ZIndexSemanticKey,
  DurationKey,
  DurationValue,
  EasingKey,
  EasingValue,
  AnimationKey,
  BreakpointKey,
  BreakpointValue,
  // Theme types
  ThemeMode,
  ThemeTokenKey,
  ThemeConfig,
  LightTheme,
  LightThemeCSSValues,
  DarkTheme,
  DarkThemeCSSValues,
  // Config types
  TailwindPreset,
  NativewindConfig,
  NativeColors,
  // Utility types
  TokenCategory,
  Platform,
  Shade,
  SemanticColor,
  PaletteColor,
  StatusColor,
  TypographyPreset,
  Elevation,
  AnimationTiming,
  Breakpoint,
  DesignSystemConfig,
  NativeShadowStyle,
  TypographyStyle,
} from './types';

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use individual exports instead
 * Legacy COLORS export for backwards compatibility with shared-constants
 */
export const COLORS = {
  // Primary colors
  primary: '#14b8a6',
  primaryLight: '#ccfbf1',
  primaryDark: '#0f766e',

  // Accent colors (using secondary as accent for legacy compat)
  accent: '#ed6a6d',
  accentLight: '#f4a6a7',
  accentLighter: '#fbe1e2',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  dark: '#171717',
  darkGray: '#525252',
  gray: '#737373',
  lightGray: '#e5e5e5',
  veryLightGray: '#f5f5f5',

  // Background colors
  background: '#ffffff',
  backgroundLight: '#f0fdfa',
  backgroundGray: '#f5f5f5',

  // Overlay colors
  overlayDark: '#262626',
  overlayBackdrop: 'rgba(0, 0, 0, 0.5)',

  // Button colors
  buttonPrimary: '#ed6a6d',
  buttonDisabled: '#d4d4d4',

  // Status colors
  success: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
} as const;

/**
 * @deprecated Use duration and delay from animations instead
 * Legacy ANIMATION_DELAYS export for backwards compatibility
 */
export const ANIMATION_DELAYS = {
  OVERLAY_STAGGER: 300,
  OVERLAY_TRANSITION: 800,
  OVERLAY_RESET: 300,
  SPLASH_DURATION: 3000,
  SPLASH_FADE_OUT: 600,
  SPLASH_FADE_IN: 1000,
  SHORT_DELAY: 300,
  MEDIUM_DELAY: 500,
  LONG_DELAY: 800,
} as const;

/**
 * @deprecated Use duration from animations instead
 * Legacy ANIMATION_DURATIONS export for backwards compatibility
 */
export const ANIMATION_DURATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
} as const;
