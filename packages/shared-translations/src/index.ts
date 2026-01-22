import enUS from './locales/en-US.json';
import frCA from './locales/fr-CA.json';
import type {
  Locale,
  LocaleConfig,
  TranslationMessages,
  TranslationKey,
  TranslationsRecord,
} from './types';

/**
 * All available translations
 */
export const translations: TranslationsRecord = {
  'en-US': enUS as TranslationMessages,
  'fr-CA': frCA as TranslationMessages,
};

/**
 * Supported locale codes
 */
export const locales: readonly Locale[] = ['en-US', 'fr-CA'] as const;

/**
 * Default locale
 */
export const defaultLocale: Locale = 'en-US';

/**
 * Locale configurations with display names
 */
export const localeConfigs: Record<Locale, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  'fr-CA': {
    code: 'fr-CA',
    name: 'French (Canada)',
    nativeName: 'Français',
    direction: 'ltr',
  },
};

/**
 * Check if a string is a valid locale code
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get the best matching locale from a language tag
 * @param languageTag - BCP 47 language tag (e.g., 'en', 'en-US', 'fr-CA', 'fr')
 * @returns The best matching locale or default locale
 */
export function getMatchingLocale(languageTag: string): Locale {
  // Direct match
  if (isValidLocale(languageTag)) {
    return languageTag;
  }

  // Try to match by language code (e.g., 'en' -> 'en-US', 'fr' -> 'fr-CA')
  const languageCode = languageTag.split('-')[0].toLowerCase();

  for (const locale of locales) {
    if (locale.toLowerCase().startsWith(languageCode)) {
      return locale;
    }
  }

  return defaultLocale;
}

/**
 * Get translation messages for a locale
 */
export function getTranslations(locale: Locale): TranslationMessages {
  return translations[locale];
}

// Re-export types
export type { Locale, LocaleConfig, TranslationMessages, TranslationKey, TranslationsRecord };

// Re-export server-side utilities
export { createTranslator, translate, normalizeLocale } from './server';
