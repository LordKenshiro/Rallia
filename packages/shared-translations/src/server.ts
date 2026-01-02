/**
 * Server-side translation utilities
 *
 * Provides translation functions for use in server-side code,
 * Edge Functions, and notification services.
 */

// Import directly from source files to avoid circular dependency with index.ts
import enUS from './locales/en-US.json';
import frCA from './locales/fr-CA.json';
import type { Locale, TranslationMessages, TranslationsRecord } from './types';

/**
 * All available translations (local copy to avoid circular import)
 */
const translations: TranslationsRecord = {
  'en-US': enUS as TranslationMessages,
  'fr-CA': frCA as TranslationMessages,
};

/**
 * Supported locale codes
 */
const locales: readonly Locale[] = ['en-US', 'fr-CA'] as const;

/**
 * Default locale
 */
const defaultLocale: Locale = 'en-US';

/**
 * Check if a string is a valid locale code
 */
function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate variables in a template string
 * Replaces {variable} placeholders with values from the params object
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Create a translation function for a specific locale
 *
 * @param locale - The locale to use for translations
 * @returns A translation function that takes a key and optional params
 *
 * @example
 * ```ts
 * const t = createTranslator('fr-CA');
 * const message = t('notifications.messages.match_invitation.title');
 * const body = t('notifications.messages.match_invitation.body', { playerName: 'John', sportName: 'Tennis' });
 * ```
 */
export function createTranslator(
  locale: string
): (key: string, params?: Record<string, string | number>) => string {
  // Validate and fallback to default locale
  const validLocale: Locale = isValidLocale(locale) ? locale : defaultLocale;
  const messages: TranslationMessages = translations[validLocale];

  return (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(messages, key);

    if (value === undefined) {
      // Fallback to default locale if translation not found
      if (validLocale !== defaultLocale) {
        const fallbackValue = getNestedValue(translations[defaultLocale], key);
        if (fallbackValue !== undefined) {
          return interpolate(fallbackValue, params);
        }
      }
      // Return the key if no translation found
      console.warn(`Missing translation for key: ${key} in locale: ${validLocale}`);
      return key;
    }

    return interpolate(value, params);
  };
}

/**
 * Get a single translation for a specific locale
 *
 * @param locale - The locale to use
 * @param key - The translation key (dot notation)
 * @param params - Optional interpolation parameters
 * @returns The translated string
 *
 * @example
 * ```ts
 * const title = translate('fr-CA', 'notifications.messages.match_cancelled.title');
 * ```
 */
export function translate(
  locale: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const t = createTranslator(locale);
  return t(key, params);
}

/**
 * Validate and normalize a locale string
 *
 * @param locale - The locale string to validate
 * @returns A valid Locale or the default locale
 */
export function normalizeLocale(locale: string | null | undefined): Locale {
  if (!locale) return defaultLocale;
  return isValidLocale(locale) ? locale : defaultLocale;
}

export { defaultLocale, isValidLocale, locales };
export type { Locale };
