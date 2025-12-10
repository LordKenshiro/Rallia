/**
 * Theme System - Barrel Export
 *
 * Provides light and dark theme configurations and utilities
 * for theme management across platforms.
 */

export { lightTheme, lightThemeCSSValues } from './light';
export type { LightTheme, LightThemeCSSValues } from './light';

export { darkTheme, darkThemeCSSValues } from './dark';
export type { DarkTheme, DarkThemeCSSValues } from './dark';

import { lightTheme, lightThemeCSSValues } from './light';
import { darkTheme, darkThemeCSSValues } from './dark';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Combined themes object
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * Combined CSS values object
 */
export const themeCSSValues = {
  light: lightThemeCSSValues,
  dark: darkThemeCSSValues,
} as const;

/**
 * Get theme by mode
 */
export function getTheme(mode: 'light' | 'dark') {
  return themes[mode];
}

/**
 * Get CSS values by mode
 */
export function getThemeCSSValues(mode: 'light' | 'dark') {
  return themeCSSValues[mode];
}

/**
 * Theme token keys (for TypeScript autocomplete)
 */
export type ThemeTokenKey = keyof typeof lightTheme;

/**
 * Get a specific token value from a theme
 */
export function getThemeToken(mode: 'light' | 'dark', token: ThemeTokenKey) {
  return themes[mode][token];
}

/**
 * Check if system prefers dark mode
 * Works in browser environment only
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/**
 * Resolve theme mode (handles 'system' mode)
 */
export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return mode;
}

/**
 * Theme configuration type for providers
 */
export interface ThemeConfig {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  theme: typeof lightTheme | typeof darkTheme;
  setMode: (mode: ThemeMode) => void;
}
