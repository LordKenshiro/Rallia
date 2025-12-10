/**
 * CSS Variable Generation Utilities
 *
 * Helper functions for generating CSS custom properties
 * from design tokens.
 */

import { lightThemeCSSValues } from '../themes/light';
import { darkThemeCSSValues } from '../themes/dark';
import { primary, secondary, accent, neutral, darkMode } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';

/**
 * Convert an object of values to CSS variable declarations
 */
export function objectToCSSVariables(
  obj: Record<string, string | number>,
  prefix = ''
): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
      return `  ${varName}: ${value};`;
    })
    .join('\n');
}

/**
 * Generate color scale CSS variables
 */
export function generateColorScaleVariables(
  name: string,
  scale: Record<string | number, string>
): string {
  return Object.entries(scale)
    .map(([shade, value]) => `  --${name}-${shade}: ${value};`)
    .join('\n');
}

/**
 * Generate complete :root CSS variables for light theme
 */
export function generateLightThemeCSS(): string {
  const lines: string[] = [':root {'];

  // Theme semantic variables
  Object.entries(lightThemeCSSValues).forEach(([key, value]) => {
    lines.push(`  ${key}: ${value};`);
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate complete .dark CSS variables for dark theme
 */
export function generateDarkThemeCSS(): string {
  const lines: string[] = ['.dark {'];

  // Theme semantic variables
  Object.entries(darkThemeCSSValues).forEach(([key, value]) => {
    lines.push(`  ${key}: ${value};`);
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate complete CSS with both themes
 */
export function generateThemeCSS(): string {
  return `${generateLightThemeCSS()}\n\n${generateDarkThemeCSS()}`;
}

/**
 * Generate spacing CSS variables
 */
export function generateSpacingVariables(): string {
  const lines: string[] = [];
  Object.entries(spacing).forEach(([key, value]) => {
    lines.push(`  --spacing-${key}: ${value};`);
  });
  return lines.join('\n');
}

/**
 * Generate radius CSS variables
 */
export function generateRadiusVariables(): string {
  const lines: string[] = [];
  Object.entries(radius).forEach(([key, value]) => {
    const varName = key === 'DEFAULT' ? '--radius' : `--radius-${key}`;
    lines.push(`  ${varName}: ${value};`);
  });
  return lines.join('\n');
}

/**
 * Generate all color palette CSS variables
 */
export function generateColorPaletteVariables(): string {
  const lines: string[] = [];

  // Primary
  lines.push('  /* Primary colors */');
  lines.push(generateColorScaleVariables('primary', primary));

  // Secondary
  lines.push('\n  /* Secondary colors */');
  lines.push(generateColorScaleVariables('secondary', secondary));

  // Accent
  lines.push('\n  /* Accent colors */');
  lines.push(generateColorScaleVariables('accent', accent));

  // Neutral
  lines.push('\n  /* Neutral colors */');
  lines.push(generateColorScaleVariables('neutral', neutral));

  return lines.join('\n');
}

/**
 * Generate dark mode color palette CSS variables
 */
export function generateDarkModeColorVariables(): string {
  const lines: string[] = [];

  // Primary (dark mode)
  lines.push('  /* Primary colors - Dark mode */');
  lines.push(generateColorScaleVariables('primary', darkMode.primary));

  // Secondary (dark mode)
  lines.push('\n  /* Secondary colors - Dark mode */');
  lines.push(generateColorScaleVariables('secondary', darkMode.secondary));

  // Accent (dark mode)
  lines.push('\n  /* Accent colors - Dark mode */');
  lines.push(generateColorScaleVariables('accent', darkMode.accent));

  return lines.join('\n');
}

/**
 * Generate complete design system CSS
 * Includes all tokens and both themes
 */
export function generateDesignSystemCSS(): string {
  return `/**
 * Rallia Design System - CSS Variables
 * Generated from @rallia/design-system
 */

:root {
${generateColorPaletteVariables()}

${generateSpacingVariables()}

${generateRadiusVariables()}
}

/* Light theme semantic tokens */
${generateLightThemeCSS()}

/* Dark theme semantic tokens */
.dark {
${generateDarkModeColorVariables()}

${Object.entries(darkThemeCSSValues)
  .filter(([key]) => !key.includes('primary-') && !key.includes('secondary-') && !key.includes('accent-'))
  .map(([key, value]) => `  ${key}: ${value};`)
  .join('\n')}
}
`;
}

/**
 * CSS variable reference helper
 * Returns a var() reference for a given token
 */
export function cssVar(name: string, fallback?: string): string {
  return fallback ? `var(--${name}, ${fallback})` : `var(--${name})`;
}

/**
 * Color CSS variable reference
 */
export function colorVar(
  color: 'primary' | 'secondary' | 'accent' | 'neutral',
  shade: number | string
): string {
  return cssVar(`${color}-${shade}`);
}

/**
 * Spacing CSS variable reference
 */
export function spacingVar(size: keyof typeof spacing): string {
  return cssVar(`spacing-${size}`);
}

/**
 * Radius CSS variable reference
 */
export function radiusVar(size: keyof typeof radius): string {
  return size === 'DEFAULT' ? cssVar('radius') : cssVar(`radius-${size}`);
}


