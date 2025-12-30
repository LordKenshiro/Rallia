/**
 * Date Formatters
 *
 * Utilities for formatting dates and times
 */

/**
 * Format date to readable string (e.g., "January 15, 2025")
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date to short string (e.g., "Jan 15, 2025")
 */
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time (e.g., "2:30 PM")
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date and time (e.g., "Jan 15, 2025 at 2:30 PM")
 */
export const formatDateTime = (date: Date | string): string => {
  return `${formatDateShort(date)} at ${formatTime(date)}`;
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isPast = diffMs < 0;
  const suffix = isPast ? 'ago' : 'from now';

  if (diffSecs < 60) {
    return `just now`;
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ${suffix}`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ${suffix}`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ${suffix}`;
  } else {
    return formatDateShort(d);
  }
};

/**
 * Format date range (e.g., "Jan 15 - Jan 20, 2025")
 */
export const formatDateRange = (startDate: Date | string, endDate: Date | string): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const monthDay = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDay = end.getDate();
    const year = start.getFullYear();
    return `${monthDay} - ${endDay}, ${year}`;
  } else if (sameYear) {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = start.getFullYear();
    return `${startStr} - ${endStr}, ${year}`;
  } else {
    return `${formatDateShort(start)} - ${formatDateShort(end)}`;
  }
};

// =============================================================================
// TIMEZONE-AWARE FORMATTING
// =============================================================================

/**
 * Result of timezone-aware time formatting
 */
export interface TimezoneFormattedTime {
  /** Formatted time string (e.g., "2:00 PM") */
  formattedTime: string;
  /** Timezone city name (e.g., "New York", "Los Angeles") */
  tzCity: string;
  /** Full formatted string with timezone city (e.g., "2:00 PM (New York)") */
  fullDisplay: string;
}

/**
 * Create a Date object representing a specific date/time in a specific timezone.
 *
 * The returned Date object's internal UTC value is adjusted so that when formatted
 * in the target timezone, it shows the intended local time.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns Date object representing that moment in time
 */
export function createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Create an ISO string with the time we want, then parse it in the target timezone
  // We use a trick: format a reference date in the target timezone to find the offset
  const targetDate = new Date(Date.UTC(year, month - 1, day, hours, minutes || 0, 0, 0));

  // Get the timezone offset for this date in the target timezone
  // We format the date in the target timezone and compare to get the offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Get parts of what the UTC date looks like in the target timezone
  const parts = formatter.formatToParts(targetDate);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const tzYear = getPart('year');
  const tzMonth = getPart('month');
  const tzDay = getPart('day');
  const tzHour = getPart('hour');
  const tzMinute = getPart('minute');

  // Calculate the difference between what we want and what we got
  const gotDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0, 0));
  const offsetMs = targetDate.getTime() - gotDate.getTime();

  // Apply the offset to get the correct UTC time
  return new Date(targetDate.getTime() + offsetMs);
}

/**
 * Extract city name from IANA timezone identifier
 *
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns City name (e.g., "New York")
 */
export function getTimezoneCity(timezone: string): string {
  if (!timezone || timezone === 'UTC') {
    return 'UTC';
  }

  // Extract city name from IANA timezone format: "Continent/City" or "Continent/Region/City"
  const parts = timezone.split('/');
  const cityPart = parts[parts.length - 1];

  // Replace underscores with spaces and format nicely
  return cityPart.replace(/_/g, ' ');
}

/**
 * Format a time in a specific timezone with timezone city name
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Object with formatted time, timezone city, and full display string
 *
 * @example
 * ```ts
 * const result = formatTimeInTimezone('2025-01-15', '14:00', 'America/New_York', 'en-US');
 * // result.formattedTime = "2:00 PM"
 * // result.tzCity = "New York"
 * // result.fullDisplay = "2:00 PM (New York)"
 * ```
 */
export function formatTimeInTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string,
  locale: string = 'en-US'
): TimezoneFormattedTime {
  const tz = timezone || 'UTC';

  // Parse the date and time components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Create a date in the target timezone
  const date = createDateInTimezone(dateStr, timeStr, tz);

  // Format time without timezone
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const formattedTime = timeFormatter.format(date);

  // Get timezone city name
  const tzCity = getTimezoneCity(tz);

  return {
    formattedTime,
    tzCity,
    fullDisplay: `${formattedTime} (${tzCity})`,
  };
}

/**
 * Format a time range in a specific timezone
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param startTimeStr - Start time string in HH:MM format
 * @param endTimeStr - End time string in HH:MM format
 * @param timezone - IANA timezone identifier
 * @param locale - Locale for formatting
 * @returns Formatted time range with timezone city (e.g., "2:00 PM - 4:00 PM (New York)")
 */
export function formatTimeRangeInTimezone(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  timezone: string,
  locale: string = 'en-US'
): string {
  const startResult = formatTimeInTimezone(dateStr, startTimeStr, timezone, locale);
  const endResult = formatTimeInTimezone(dateStr, endTimeStr, timezone, locale);

  // Show timezone city once at the end
  return `${startResult.formattedTime} - ${endResult.formattedTime} (${startResult.tzCity})`;
}

/**
 * Calculate the difference in milliseconds between a match time and now,
 * correctly accounting for timezones.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param timezone - IANA timezone identifier
 * @returns Difference in milliseconds (positive = future, negative = past)
 */
export function getTimeDifferenceFromNow(
  dateStr: string,
  timeStr: string,
  timezone: string
): number {
  const matchDate = createDateInTimezone(dateStr, timeStr, timezone || 'UTC');
  const now = new Date();
  return matchDate.getTime() - now.getTime();
}

/**
 * Calculate the difference in milliseconds between a match end time and now,
 * correctly accounting for matches that span midnight (e.g., 11 PM - 1 AM).
 *
 * If end_time is earlier than start_time, the end time is assumed to be on the next day.
 *
 * @param matchDateStr - Date string in YYYY-MM-DD format (match start date)
 * @param startTimeStr - Start time string in HH:MM format
 * @param endTimeStr - End time string in HH:MM format
 * @param timezone - IANA timezone identifier
 * @returns Difference in milliseconds (positive = future, negative = past)
 */
export function getMatchEndTimeDifferenceFromNow(
  matchDateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  timezone: string
): number {
  const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
  const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

  const startTimeMinutes = startHours * 60 + startMinutes;
  const endTimeMinutes = endHours * 60 + endMinutes;

  // If end time is earlier than start time, it means the match spans midnight
  // So the end time is on the next day
  let endDateStr = matchDateStr;
  if (endTimeMinutes < startTimeMinutes) {
    // Add one day to the match date for the end time
    const matchDate = new Date(matchDateStr + 'T00:00:00');
    matchDate.setDate(matchDate.getDate() + 1);
    const year = matchDate.getFullYear();
    const month = String(matchDate.getMonth() + 1).padStart(2, '0');
    const day = String(matchDate.getDate()).padStart(2, '0');
    endDateStr = `${year}-${month}-${day}`;
  }

  const matchEndDate = createDateInTimezone(endDateStr, endTimeStr, timezone || 'UTC');
  const now = new Date();
  return matchEndDate.getTime() - now.getTime();
}

/**
 * Format a date in a specific timezone
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone identifier
 * @param locale - Locale for formatting
 * @param options - Intl.DateTimeFormat options for date formatting
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  dateStr: string,
  timezone: string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const tz = timezone || 'UTC';
  // Use noon to avoid date boundary issues
  const date = createDateInTimezone(dateStr, '12:00', tz);

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    ...options,
  });

  return formatter.format(date);
}

/**
 * Format a date in a specific timezone with city name in parentheses
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone identifier
 * @param locale - Locale for formatting
 * @param options - Intl.DateTimeFormat options for date formatting
 * @returns Formatted date string with city (e.g., "Friday, January 15, 2025 (New York)")
 */
export function formatDateInTimezoneWithCity(
  dateStr: string,
  timezone: string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const formattedDate = formatDateInTimezone(dateStr, timezone, locale, options);
  const tzCity = getTimezoneCity(timezone || 'UTC');
  return `${formattedDate} (${tzCity})`;
}
