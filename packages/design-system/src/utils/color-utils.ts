/**
 * Color Utilities
 *
 * Helper functions for color manipulation and conversion.
 */

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB values to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Convert hex color to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Lighten a hex color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);

  return rgbToHex(r, g, b);
}

/**
 * Darken a hex color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = Math.round(rgb.r * (1 - factor));
  const g = Math.round(rgb.g * (1 - factor));
  const b = Math.round(rgb.b * (1 - factor));

  return rgbToHex(r, g, b);
}

/**
 * Calculate relative luminance of a color
 * Used for contrast ratio calculations
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG recommends 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color meets WCAG AA contrast requirements
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if a color meets WCAG AAA contrast requirements
 */
export function meetsContrastAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Determine if text should be light or dark on a given background
 */
export function getTextColorForBackground(backgroundColor: string): 'light' | 'dark' {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.179 ? 'dark' : 'light';
}

/**
 * Get the appropriate text color (black or white) for a background
 */
export function getAccessibleTextColor(backgroundColor: string): string {
  return getTextColorForBackground(backgroundColor) === 'dark' ? '#000000' : '#ffffff';
}

/**
 * Mix two colors together
 */
export function mixColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r * weight + rgb2.r * (1 - weight));
  const g = Math.round(rgb1.g * weight + rgb2.g * (1 - weight));
  const b = Math.round(rgb1.b * weight + rgb2.b * (1 - weight));

  return rgbToHex(r, g, b);
}

/**
 * Generate a color scale from a base color
 * Returns an object with shades from 50 to 950
 */
export function generateColorScale(baseColor: string): Record<number, string> {
  return {
    50: lighten(baseColor, 95),
    100: lighten(baseColor, 90),
    200: lighten(baseColor, 80),
    300: lighten(baseColor, 60),
    400: lighten(baseColor, 40),
    500: baseColor,
    600: darken(baseColor, 10),
    700: darken(baseColor, 25),
    800: darken(baseColor, 40),
    900: darken(baseColor, 55),
    950: darken(baseColor, 70),
  };
}

/**
 * Convert a color to its grayscale equivalent
 */
export function toGrayscale(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Use luminance-based grayscale for better visual accuracy
  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return rgbToHex(gray, gray, gray);
}

/**
 * Check if a color is considered "dark"
 */
export function isDark(hex: string): boolean {
  return getLuminance(hex) < 0.5;
}

/**
 * Check if a color is considered "light"
 */
export function isLight(hex: string): boolean {
  return getLuminance(hex) >= 0.5;
}

