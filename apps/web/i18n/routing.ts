import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@rallia/shared-translations';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
});
