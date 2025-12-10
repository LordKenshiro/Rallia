/**
 * Design System Tokens - Barrel Export
 */

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
} from './colors';
export type {
  ColorScale,
  ColorShade,
  PrimaryColor,
  SecondaryColor,
  AccentColor,
  NeutralColor,
} from './colors';

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
} from './typography';
export type { FontSize, FontWeight, LineHeight, LetterSpacing, TextStyle } from './typography';

// Spacing
export { spacing, spacingPixels, spacingSemantic, spacingSemanticPixels } from './spacing';
export type { SpacingKey, SpacingValue, SpacingSemanticKey } from './spacing';

// Radius
export { radius, radiusPixels, radiusSemantic, radiusSemanticPixels } from './radius';
export type { RadiusKey, RadiusValue, RadiusSemanticKey } from './radius';

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
} from './shadows';
export type {
  ShadowKey,
  ShadowValue,
  ShadowSemanticKey,
  ShadowNativeKey,
  ShadowNativeValue,
} from './shadows';

// Z-Index
export { zIndex, zIndexSemantic } from './z-index';
export type { ZIndexKey, ZIndexValue, ZIndexSemanticKey } from './z-index';

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
} from './animations';
export type {
  DurationKey,
  DurationValue,
  EasingKey,
  EasingValue,
  AnimationKey,
} from './animations';

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
} from './breakpoints';
export type { BreakpointKey, BreakpointValue } from './breakpoints';
