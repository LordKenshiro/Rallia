# i18n Usage Manual

This guide explains how to use the centralized internationalization (i18n) system across the Rallia platform.

## Table of Contents

- [Overview](#overview)
- [Mobile Setup (React Native)](#mobile-setup-react-native)
- [Web Setup (Next.js)](#web-setup-nextjs)
- [Using Translations in Components](#using-translations-in-components)
- [Managing Locale/Language](#managing-localelanguage)
- [Adding New Translations](#adding-new-translations)
- [Translation Key Format](#translation-key-format)
- [Best Practices](#best-practices)

## Overview

The i18n system uses:

- **Shared translations package** (`@rallia/shared-translations`) - Centralized translation files
- **Mobile**: i18next + react-i18next for React Native
- **Web**: next-intl for Next.js
- **Supported locales**: `en-US` (English) and `fr-CA` (French Canada)

## Mobile Setup (React Native)

### 1. Initialize i18n in Your App

Wrap your app root with `LocaleProvider`:

```tsx
import { LocaleProvider } from './src/context';

export default function App() {
  return <LocaleProvider>{/* Your app components */}</LocaleProvider>;
}
```

The `LocaleProvider` automatically:

- Detects the device's preferred locale
- Loads saved locale preferences from AsyncStorage
- Initializes i18next with the appropriate translations
- Provides locale management functionality

### 2. Use Translations in Components

Import and use the `useTranslation` hook:

```tsx
import { useTranslation } from '../hooks';

function MyComponent() {
  const { t, locale, ready } = useTranslation();

  if (!ready) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      <Text>{t('common.welcome')}</Text>
      <Text>{t('auth.codeSent', { email: 'user@example.com' })}</Text>
    </View>
  );
}
```

### 3. Access Locale Information

Use the `useLocale` hook to access and manage locale:

```tsx
import { useLocale } from '../context';
import type { Locale } from '@rallia/shared-translations';

function LanguageSelector() {
  const {
    locale, // Current locale (e.g., 'en-US')
    isManuallySet, // Whether user manually set a language
    isReady, // Whether i18n is initialized
    setLocale, // Function to change locale
    resetToDeviceLocale, // Reset to device default
    availableLocales, // Array of supported locales
    localeConfigs, // Locale metadata (name, nativeName, etc.)
  } = useLocale();

  const handleLanguageChange = async (newLocale: Locale) => {
    await setLocale(newLocale);
  };

  return (
    <View>
      {availableLocales.map(loc => (
        <TouchableOpacity key={loc} onPress={() => handleLanguageChange(loc)}>
          <Text>{localeConfigs[loc].nativeName}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### 4. Translation with Interpolation

Use single braces `{}` for variable interpolation (matches next-intl format):

```tsx
// Translation key: "auth.codeSent": "A verification code has been sent to {email}"
const { t } = useTranslation();
<Text>{t('auth.codeSent', { email: userEmail })}</Text>;
```

## Web Setup (Next.js)

### 1. Configure next-intl

In your Next.js app, configure `next-intl` to use shared translations:

```typescript
// apps/web/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { translations, defaultLocale, type Locale } from '@rallia/shared-translations';

export default getRequestConfig(async ({ locale }) => {
  // Ensure locale is valid
  const validLocale = (locale as Locale) || defaultLocale;

  return {
    messages: translations[validLocale],
  };
});
```

### 2. Use Translations in Components

```tsx
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('common');

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### 3. Use with Namespaces

```tsx
import { useTranslations } from 'next-intl';

function AuthComponent() {
  const t = useTranslations('auth');

  return (
    <div>
      <p>{t('codeSent', { email: userEmail })}</p>
    </div>
  );
}
```

## Using Translations in Components

### Basic Translation

```tsx
// Mobile
const { t } = useTranslation();
<Text>{t('common.loading')}</Text>;

// Web
const t = useTranslations('common');
<p>{t('loading')}</p>;
```

### Translation with Variables

```tsx
// Mobile
const { t } = useTranslation();
<Text>{t('auth.codeSent', { email: 'user@example.com' })}</Text>;

// Web
const t = useTranslations('auth');
<p>{t('codeSent', { email: 'user@example.com' })}</p>;
```

### Nested Keys

```tsx
// Translation structure:
// {
//   "settings": {
//     "account": {
//       "title": "Account Settings"
//     }
//   }
// }

// Mobile
<Text>{t('settings.account.title')}</Text>;

// Web
const t = useTranslations('settings.account');
<p>{t('title')}</p>;
```

## Managing Locale/Language

### Mobile: Change Language Programmatically

```tsx
import { useLocale } from '../context';
import type { Locale } from '@rallia/shared-translations';

function LanguageSwitcher() {
  const { setLocale, resetToDeviceLocale, locale, isManuallySet } = useLocale();

  const handleChangeLanguage = async (newLocale: Locale) => {
    try {
      await setLocale(newLocale);
      // Language changed successfully
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetToDeviceLocale();
      // Reset to device default
    } catch (error) {
      console.error('Failed to reset language:', error);
    }
  };

  return (
    <View>
      <Button
        title="English"
        onPress={() => handleChangeLanguage('en-US')}
        disabled={locale === 'en-US'}
      />
      <Button
        title="Français"
        onPress={() => handleChangeLanguage('fr-CA')}
        disabled={locale === 'fr-CA'}
      />
      {isManuallySet && <Button title="Reset to System" onPress={handleReset} />}
    </View>
  );
}
```

### Mobile: Check if i18n is Ready

```tsx
const { isReady } = useLocale();

if (!isReady) {
  return <LoadingScreen />;
}

// Safe to use translations
```

### Web: Change Language

In Next.js, locale changes are typically handled through routing:

```tsx
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const changeLanguage = (newLocale: string) => {
    // Replace locale in pathname
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <select value={locale} onChange={e => changeLanguage(e.target.value)}>
      <option value="en-US">English</option>
      <option value="fr-CA">Français</option>
    </select>
  );
}
```

## Adding New Translations

### 1. Add Keys to Translation Files

Edit both locale files in `packages/shared-translations/src/locales/`:

**en-US.json:**

```json
{
  "common": {
    "welcome": "Welcome",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "auth": {
    "signIn": "Sign In",
    "codeSent": "A verification code has been sent to {email}"
  }
}
```

**fr-CA.json:**

```json
{
  "common": {
    "welcome": "Bienvenue",
    "loading": "Chargement...",
    "error": "Une erreur s'est produite"
  },
  "auth": {
    "signIn": "Se connecter",
    "codeSent": "Un code de vérification a été envoyé à {email}"
  }
}
```

### 2. TypeScript Types

Types are automatically inferred from the English locale file (`en-US.json`). After adding keys, TypeScript will provide autocomplete and type checking.

### 3. Use the New Translation

```tsx
// Mobile
const { t } = useTranslation();
<Text>{t('common.welcome')}</Text>;

// Web
const t = useTranslations('common');
<p>{t('welcome')}</p>;
```

## Translation Key Format

### Structure

Translation keys use dot notation for nested objects:

```
"namespace.section.key"
```

Examples:

- `common.loading` → `common.loading`
- `auth.codeSent` → `auth.codeSent`
- `settings.account.title` → `settings.account.title`

### Interpolation Variables

Use single braces `{}` for variable interpolation:

```json
{
  "auth": {
    "codeSent": "A verification code has been sent to {email}",
    "welcomeUser": "Welcome, {name}!"
  }
}
```

```tsx
// Mobile
t('auth.codeSent', { email: 'user@example.com' });
t('auth.welcomeUser', { name: 'John' });

// Web
t('codeSent', { email: 'user@example.com' });
t('welcomeUser', { name: 'John' });
```

## Best Practices

### 1. Organize Translations by Feature

Group related translations together:

```json
{
  "auth": {
    "signIn": "...",
    "signOut": "...",
    "forgotPassword": "..."
  },
  "profile": {
    "edit": "...",
    "save": "...",
    "cancel": "..."
  }
}
```

### 2. Use Descriptive Keys

✅ Good:

```json
{
  "auth": {
    "codeSent": "A verification code has been sent to {email}"
  }
}
```

❌ Bad:

```json
{
  "msg1": "Code sent"
}
```

### 3. Keep Translations Consistent

- Use the same terminology across the app
- Maintain consistent capitalization and punctuation
- Follow the same structure for similar features

### 4. Handle Missing Translations

The system will fall back to the default locale (`en-US`) if a translation is missing. Always ensure both locale files have the same keys.

### 5. Check i18n Readiness (Mobile)

Always check `isReady` before rendering translated content:

```tsx
const { isReady } = useLocale();

if (!isReady) {
  return <LoadingScreen />;
}
```

### 6. Use TypeScript Types

The `TranslationKey` type provides autocomplete and type safety:

```tsx
import type { TranslationKey } from '@rallia/shared-translations';

// TypeScript will autocomplete available keys
const key: TranslationKey = 'common.loading'; // ✅
const invalid: TranslationKey = 'invalid.key'; // ❌ Type error
```

### 7. Test Both Locales

Always test your UI with both `en-US` and `fr-CA` to ensure:

- All translations are present
- Text fits in UI components
- RTL languages are handled correctly (if added in future)

## Troubleshooting

### Translations Not Updating

**Mobile**: Ensure `LocaleProvider` wraps your app root and `isReady` is true before using translations.

**Web**: Ensure your Next.js routing is configured correctly and the locale is in the URL path.

### Missing Translation Keys

- Check that keys exist in both `en-US.json` and `fr-CA.json`
- Verify the key path matches exactly (case-sensitive)
- Check for typos in the key name

### TypeScript Errors

- Run `npm run build` in the `shared-translations` package to regenerate types
- Ensure both locale files have matching key structures

### Locale Not Persisting (Mobile)

- Check that AsyncStorage is properly configured
- Verify the `LOCALE_STORAGE_KEY` is correct
- Check for AsyncStorage permission issues on Android

## API Reference

### Mobile Hooks

#### `useTranslation()`

Returns translation function and locale info.

```tsx
const { t, locale, ready } = useTranslation();
```

#### `useLocale()`

Returns locale management functions and state.

```tsx
const {
  locale,
  isManuallySet,
  isReady,
  setLocale,
  resetToDeviceLocale,
  availableLocales,
  localeConfigs,
} = useLocale();
```

### Shared Package Exports

```typescript
import {
  translations, // All translation objects
  locales, // Array of supported locales
  defaultLocale, // Default locale ('en-US')
  localeConfigs, // Locale metadata
  isValidLocale, // Type guard function
  getMatchingLocale, // Match language tag to locale
  getTranslations, // Get translations for a locale
  type Locale, // Locale type
  type TranslationKey, // Translation key type
} from '@rallia/shared-translations';
```
