/**
 * Web stub for useTheme
 *
 * This hook is only available on React Native.
 * For web apps, use `next-themes` instead.
 *
 * Note: This file exists for web bundler compatibility. The actual implementation
 * is in useTheme.native.ts which Metro picks up for React Native builds.
 */

import React from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ResolvedTheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  isLoading: boolean;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPreference?: ThemePreference;
}

/**
 * Web stub - throws at runtime. Use `next-themes` for web apps.
 */
export function useTheme(): ThemeContextType {
  throw new Error(
    'useTheme from @rallia/shared-hooks is only available on React Native. ' +
      'For web apps, use the `useTheme` hook from `next-themes` instead.'
  );
}

/**
 * Web stub - throws at runtime. Use NextThemesProvider for web apps.
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  throw new Error(
    'ThemeProvider from @rallia/shared-hooks is only available on React Native. ' +
      'For web apps, use `ThemeProvider` from `next-themes` instead.'
  );
}
