/**
 * Design System TypeScript Types
 *
 * Central type definitions for the design system.
 */

// Re-export all token types
export type {
  ColorScale,
  ColorShade,
  PrimaryColor,
  SecondaryColor,
  AccentColor,
  NeutralColor,
} from './tokens/colors';

export type {
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  TextStyle,
} from './tokens/typography';

export type { SpacingKey, SpacingValue, SpacingSemanticKey } from './tokens/spacing';

export type { RadiusKey, RadiusValue, RadiusSemanticKey } from './tokens/radius';

export type {
  ShadowKey,
  ShadowValue,
  ShadowSemanticKey,
  ShadowNativeKey,
  ShadowNativeValue,
} from './tokens/shadows';

export type { ZIndexKey, ZIndexValue, ZIndexSemanticKey } from './tokens/z-index';

export type {
  DurationKey,
  DurationValue,
  EasingKey,
  EasingValue,
  AnimationKey,
} from './tokens/animations';

export type { BreakpointKey, BreakpointValue } from './tokens/breakpoints';

// Re-export theme types
export type {
  ThemeMode,
  ThemeTokenKey,
  ThemeConfig,
  LightTheme,
  LightThemeCSSValues,
  DarkTheme,
  DarkThemeCSSValues,
} from './themes';

// Re-export config types
export type { TailwindPreset } from './config/tailwind.preset';
export type { NativewindConfig, NativeColors } from './config/nativewind';

/**
 * Design token categories
 */
export type TokenCategory =
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'radius'
  | 'shadows'
  | 'zIndex'
  | 'animations'
  | 'breakpoints';

/**
 * Platform type for conditional exports
 */
export type Platform = 'web' | 'native' | 'all';

/**
 * Color scale shade values
 */
export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

/**
 * Semantic color names used in themes
 */
export type SemanticColor =
  | 'background'
  | 'foreground'
  | 'card'
  | 'cardForeground'
  | 'popover'
  | 'popoverForeground'
  | 'primary'
  | 'primaryForeground'
  | 'secondary'
  | 'secondaryForeground'
  | 'muted'
  | 'mutedForeground'
  | 'accent'
  | 'accentForeground'
  | 'destructive'
  | 'destructiveForeground'
  | 'border'
  | 'input'
  | 'ring';

/**
 * Color palette names
 */
export type PaletteColor = 'primary' | 'secondary' | 'accent' | 'neutral';

/**
 * Status color names
 */
export type StatusColor = 'success' | 'error' | 'warning' | 'info';

/**
 * Typography style preset names
 */
export type TypographyPreset =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'button'
  | 'buttonSmall'
  | 'code';

/**
 * Shadow elevation levels
 */
export type Elevation = 'none' | 'sm' | 'DEFAULT' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Animation timing presets
 */
export type AnimationTiming =
  | 'instant'
  | 'fastest'
  | 'faster'
  | 'fast'
  | 'normal'
  | 'slow'
  | 'slower'
  | 'slowest'
  | 'verySlow'
  | 'extraSlow';

/**
 * Responsive breakpoint names
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Theme mode (defined here to avoid circular imports)
 */
export type ThemeModeType = 'light' | 'dark' | 'system';

/**
 * Design system configuration options
 */
export interface DesignSystemConfig {
  /** Default theme mode */
  defaultTheme?: ThemeModeType;
  /** Whether to respect system preferences */
  respectSystemPreference?: boolean;
  /** Custom color overrides */
  colors?: Partial<Record<PaletteColor, Partial<Record<Shade, string>>>>;
  /** Custom typography overrides */
  typography?: {
    fontFamily?: {
      heading?: string[];
      body?: string[];
      mono?: string[];
    };
  };
}

/**
 * React Native shadow style type
 */
export interface NativeShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

/**
 * Typography style object type
 */
export interface TypographyStyle {
  fontFamily: readonly string[] | string;
  fontSize: string | number;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing: string | number;
}
