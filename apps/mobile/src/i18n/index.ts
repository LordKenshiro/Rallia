import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import {
  translations,
  defaultLocale,
  getMatchingLocale,
  type Locale,
} from '@rallia/shared-translations';

/**
 * Get the device's preferred locale, matched to our supported locales
 */
export function getDeviceLocale(): Locale {
  const deviceLocales = Localization.getLocales();
  if (deviceLocales.length > 0) {
    const primaryLocale = deviceLocales[0];
    // Try full locale first (e.g., 'en-US'), then language code (e.g., 'en')
    const languageTag = primaryLocale.languageTag || primaryLocale.languageCode || '';
    return getMatchingLocale(languageTag);
  }
  return defaultLocale;
}

/**
 * Initialize i18next with our translations and configuration
 */
export async function initI18n(savedLocale?: Locale): Promise<void> {
  const locale = savedLocale || getDeviceLocale();

  await i18next.use(initReactI18next).init({
    resources: {
      'en-US': { translation: translations['en-US'] },
      'fr-CA': { translation: translations['fr-CA'] },
    },
    lng: locale,
    fallbackLng: defaultLocale,
    // Use single braces {} to match next-intl format for consistency
    interpolation: {
      escapeValue: false, // React already handles XSS
      prefix: '{',
      suffix: '}',
    },
    // Disable react-i18next suspense for better control
    react: {
      useSuspense: false,
    },
    // Compatibility settings
    compatibilityJSON: 'v4',
    returnNull: false,
    returnEmptyString: false,
  });
}

/**
 * Change the current language
 */
export async function changeLanguage(locale: Locale): Promise<void> {
  await i18next.changeLanguage(locale);
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): Locale {
  return (i18next.language as Locale) || defaultLocale;
}

export { i18next };
