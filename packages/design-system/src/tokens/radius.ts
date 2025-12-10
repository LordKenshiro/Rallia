/**
 * Border Radius Tokens
 *
 * Consistent border radius values for rounded corners.
 * Base radius is 0.625rem (10px) as defined in globals.css.
 */

/**
 * Border radius scale in rem units (for web/Tailwind)
 */
export const radius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Border radius in pixels (for React Native)
 */
export const radiusPixels = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * Semantic border radius tokens for common components
 */
export const radiusSemantic = {
  // Buttons
  buttonSm: radius.md, // 6px
  buttonMd: radius.lg, // 8px
  buttonLg: radius.xl, // 12px
  buttonPill: radius.full, // Pill shape

  // Cards
  card: radius.xl, // 12px
  cardLg: radius['2xl'], // 16px

  // Inputs
  input: radius.lg, // 8px

  // Badges/Tags
  badge: radius.full, // Pill shape
  tag: radius.md, // 6px

  // Avatars
  avatarSm: radius.lg, // 8px
  avatarMd: radius.xl, // 12px
  avatarLg: radius['2xl'], // 16px
  avatarCircle: radius.full, // Circle

  // Modals/Dialogs
  modal: radius['2xl'], // 16px
  dialog: radius.xl, // 12px

  // Tooltips/Popovers
  tooltip: radius.md, // 6px
  popover: radius.lg, // 8px
} as const;

/**
 * Semantic border radius in pixels (for React Native)
 */
export const radiusSemanticPixels = {
  buttonSm: radiusPixels.md,
  buttonMd: radiusPixels.lg,
  buttonLg: radiusPixels.xl,
  buttonPill: radiusPixels.full,

  card: radiusPixels.xl,
  cardLg: radiusPixels['2xl'],

  input: radiusPixels.lg,

  badge: radiusPixels.full,
  tag: radiusPixels.md,

  avatarSm: radiusPixels.lg,
  avatarMd: radiusPixels.xl,
  avatarLg: radiusPixels['2xl'],
  avatarCircle: radiusPixels.full,

  modal: radiusPixels['2xl'],
  dialog: radiusPixels.xl,

  tooltip: radiusPixels.md,
  popover: radiusPixels.lg,
} as const;

export type RadiusKey = keyof typeof radius;
export type RadiusValue = (typeof radius)[RadiusKey];
export type RadiusSemanticKey = keyof typeof radiusSemantic;


