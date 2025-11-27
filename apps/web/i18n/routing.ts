import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en-US', 'fr-CA'],
  defaultLocale: 'en-US',
});
