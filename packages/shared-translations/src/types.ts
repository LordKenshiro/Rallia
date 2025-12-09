import type enUS from './locales/en-US.json';

/**
 * Supported locale codes
 */
export type Locale = 'en-US' | 'fr-CA';

/**
 * Type for translation messages based on the English locale structure
 */
export type TranslationMessages = typeof enUS;

/**
 * Nested key path type for type-safe translation access
 * Creates union of all possible dot-notation paths through the translation object
 */
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

/**
 * All possible translation keys as dot-notation paths
 */
export type TranslationKey = NestedKeyOf<TranslationMessages>;

/**
 * Locale configuration type
 */
export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

/**
 * Translations record type
 */
export type TranslationsRecord = Record<Locale, TranslationMessages>;

