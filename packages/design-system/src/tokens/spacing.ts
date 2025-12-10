/**
 * Spacing Tokens
 *
 * Consistent spacing scale based on 4px base unit.
 * Used for margins, paddings, gaps, and positioning.
 */

/**
 * Spacing scale in rem units (for web/Tailwind)
 * Based on 4px (0.25rem) increments
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

/**
 * Spacing scale in pixels (for React Native)
 */
export const spacingPixels = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

/**
 * Semantic spacing tokens for common use cases
 */
export const spacingSemantic = {
  // Component internal spacing
  componentXs: spacing[1], // 4px
  componentSm: spacing[2], // 8px
  componentMd: spacing[3], // 12px
  componentLg: spacing[4], // 16px
  componentXl: spacing[6], // 24px

  // Section/Layout spacing
  sectionSm: spacing[8], // 32px
  sectionMd: spacing[12], // 48px
  sectionLg: spacing[16], // 64px
  sectionXl: spacing[24], // 96px

  // Page margins
  pageMarginMobile: spacing[4], // 16px
  pageMarginTablet: spacing[6], // 24px
  pageMarginDesktop: spacing[8], // 32px

  // Card padding
  cardPaddingSm: spacing[3], // 12px
  cardPaddingMd: spacing[4], // 16px
  cardPaddingLg: spacing[6], // 24px

  // Input padding
  inputPaddingX: spacing[4], // 16px
  inputPaddingY: spacing[3], // 12px

  // Button padding
  buttonPaddingXSm: spacing[3], // 12px
  buttonPaddingXMd: spacing[4], // 16px
  buttonPaddingXLg: spacing[6], // 24px
  buttonPaddingY: spacing[2.5], // 10px

  // Gap between elements
  gapXs: spacing[1], // 4px
  gapSm: spacing[2], // 8px
  gapMd: spacing[4], // 16px
  gapLg: spacing[6], // 24px
  gapXl: spacing[8], // 32px
} as const;

/**
 * Semantic spacing in pixels (for React Native)
 */
export const spacingSemanticPixels = {
  componentXs: spacingPixels[1],
  componentSm: spacingPixels[2],
  componentMd: spacingPixels[3],
  componentLg: spacingPixels[4],
  componentXl: spacingPixels[6],

  sectionSm: spacingPixels[8],
  sectionMd: spacingPixels[12],
  sectionLg: spacingPixels[16],
  sectionXl: spacingPixels[24],

  pageMarginMobile: spacingPixels[4],
  pageMarginTablet: spacingPixels[6],
  pageMarginDesktop: spacingPixels[8],

  cardPaddingSm: spacingPixels[3],
  cardPaddingMd: spacingPixels[4],
  cardPaddingLg: spacingPixels[6],

  inputPaddingX: spacingPixels[4],
  inputPaddingY: spacingPixels[3],

  buttonPaddingXSm: spacingPixels[3],
  buttonPaddingXMd: spacingPixels[4],
  buttonPaddingXLg: spacingPixels[6],
  buttonPaddingY: spacingPixels[2.5],

  gapXs: spacingPixels[1],
  gapSm: spacingPixels[2],
  gapMd: spacingPixels[4],
  gapLg: spacingPixels[6],
  gapXl: spacingPixels[8],
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];
export type SpacingSemanticKey = keyof typeof spacingSemantic;


