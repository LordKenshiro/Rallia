import { useTranslation as useI18nextTranslation } from 'react-i18next';
import type { TranslationKey, Locale } from '@rallia/shared-translations';

interface TranslationOptions {
  [key: string]: string | number | boolean;
}

interface UseTranslationReturn {
  /**
   * Translate a key to the current locale
   * @param key - Translation key (dot notation path)
   * @param options - Optional interpolation values
   * @returns Translated string
   */
  t: (key: TranslationKey, options?: TranslationOptions) => string;
  /**
   * Current locale code
   */
  locale: Locale;
  /**
   * Whether translations are ready
   */
  ready: boolean;
}

/**
 * Hook for accessing translations in components
 *
 * @example
 * ```tsx
 * const { t, locale } = useTranslation();
 *
 * return (
 *   <Text>{t('common.loading')}</Text>
 *   <Text>{t('auth.codeSent', { email: 'user@example.com' })}</Text>
 * );
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const { t: i18nextT, i18n, ready } = useI18nextTranslation();

  // Create a typed wrapper around t function
  const t = (key: TranslationKey, options?: TranslationOptions): string => {
    return i18nextT(key, options) as string;
  };

  return {
    t,
    locale: (i18n.language as Locale) || 'en-US',
    ready,
  };
}

export type { TranslationKey, TranslationOptions };
