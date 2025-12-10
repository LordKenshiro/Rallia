import { getRequestConfig } from 'next-intl/server';
import {
  getTranslations,
  isValidLocale,
  defaultLocale,
  type Locale,
} from '@rallia/shared-translations';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  // Determine the final locale - use requested if valid, otherwise default
  const locale: Locale =
    requestedLocale && isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;

  // Use shared translations package
  const messages = getTranslations(locale);

  return {
    locale,
    messages,
  };
});
