import type { Locale } from '@rallia/shared-translations';

/**
 * Format a date string to a locale-aware date string
 * @param dateString - ISO date string or null
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted date string or empty string if dateString is null
 */
export function formatDate(dateString: string | null, locale: Locale): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a date string to a locale-aware date string (short format)
 * @param dateString - ISO date string or null
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted date string or empty string if dateString is null
 */
export function formatDateShort(dateString: string | null, locale: Locale): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a date string to show only month and year
 * @param dateString - ISO date string or null
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted date string or empty string if dateString is null
 */
export function formatDateMonthYear(dateString: string | null, locale: Locale): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Format a time string to a locale-aware time string
 * @param timeString - Time string (HH:mm format) or null
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted time string or empty string if timeString is null
 */
export function formatTime(timeString: string | null, locale: Locale): string {
  if (!timeString) return '';
  // Parse time string (HH:mm format)
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a date and time to a locale-aware date-time string
 * @param dateString - ISO date string or null
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted date-time string or empty string if dateString is null
 */
export function formatDateTime(dateString: string | null, locale: Locale): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time (e.g., "5m ago", "2h ago")
 * Note: This is a simple implementation. For more complex relative time formatting,
 * consider using a library like date-fns with locale support.
 * @param dateString - ISO date string
 * @param locale - Locale code (e.g., 'en-US', 'fr-CA')
 * @returns Formatted relative time string
 */
export function formatRelativeTime(dateString: string, locale: Locale): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Use Intl.RelativeTimeFormat for locale-aware relative time
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSec < 60) {
    return rtf.format(-diffSec, 'second');
  } else if (diffMin < 60) {
    return rtf.format(-diffMin, 'minute');
  } else if (diffHour < 24) {
    return rtf.format(-diffHour, 'hour');
  } else if (diffDay < 7) {
    return rtf.format(-diffDay, 'day');
  } else {
    // For older dates, return formatted date
    return formatDateShort(dateString, locale);
  }
}
