# @rallia/shared-translations

Centralized internationalization (i18n) translations for the Rallia platform, shared between web and mobile applications.

> 📖 **For detailed usage instructions, see [USAGE.md](./USAGE.md)**

## Supported Locales

- `en-US` - English (United States)
- `fr-CA` - French (Canada)

## Usage

### Web (Next.js with next-intl)

```typescript
import { translations, type Locale } from '@rallia/shared-translations';

// Get translations for a locale
const messages = translations['en-US'];
```

### Mobile (React Native with i18next)

```typescript
import { translations, locales, defaultLocale } from '@rallia/shared-translations';

i18next.init({
  resources: {
    'en-US': { translation: translations['en-US'] },
    'fr-CA': { translation: translations['fr-CA'] },
  },
  lng: defaultLocale,
  // Use single braces to match next-intl format
  interpolation: {
    prefix: '{',
    suffix: '}',
  },
});
```

## Structure

```
src/
├── locales/
│   ├── en-US.json    # English translations
│   └── fr-CA.json    # French translations
├── types.ts          # TypeScript type definitions
└── index.ts          # Main exports
```

## Adding New Translations

1. Add keys to both `en-US.json` and `fr-CA.json`
2. Types will be automatically inferred from the English locale file
