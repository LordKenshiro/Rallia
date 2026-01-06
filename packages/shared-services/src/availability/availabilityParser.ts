/**
 * Availability Parser
 *
 * Flexible parser for court availability data from various external APIs.
 * Handles multiple response formats and normalizes them to a common structure.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Normalized availability slot
 */
export interface AvailabilitySlot {
  /** Start time of the slot */
  datetime: Date;
  /** Number of available courts at this time */
  courtCount: number;
}

/**
 * Parsed availability result
 */
export interface ParsedAvailability {
  /** Normalized availability slots, sorted by datetime */
  slots: AvailabilitySlot[];
  /** Whether parsing was successful */
  success: boolean;
  /** Error message if parsing failed */
  error?: string;
}

// =============================================================================
// FORMAT DETECTION & PARSING
// =============================================================================

/**
 * Attempt to parse availability data from various API response formats.
 * Tries multiple parsing strategies and returns the first successful result.
 *
 * Supported formats:
 * 1. Array of slots: [{ time: "2024-01-04T09:00:00", courts: 3 }, ...]
 * 2. Array with datetime/count variations: [{ datetime: "...", available: 2 }, ...]
 * 3. Nested by date: { "2024-01-04": { "09:00": 3, "13:00": 2 } }
 * 4. Simple datetime array: ["2024-01-04T09:00:00", "2024-01-04T10:00:00"]
 * 5. Slots with start/end: [{ start: "...", end: "...", courts_available: 1 }]
 */
export function parseAvailability(data: unknown): ParsedAvailability {
  if (!data) {
    return { slots: [], success: false, error: 'No data provided' };
  }

  // Try each parsing strategy in order of specificity
  const strategies = [
    tryParseSlotArray,
    tryParseNestedByDate,
    tryParseDatetimeArray,
    tryParseStartEndFormat,
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy(data);
      if (result.success && result.slots.length > 0) {
        // Sort by datetime and return
        result.slots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
        return result;
      }
    } catch {
      // Strategy failed, try next
      continue;
    }
  }

  return { slots: [], success: false, error: 'Could not parse availability format' };
}

/**
 * Get the next N available slots from now
 */
export function getNextAvailableSlots(
  slots: AvailabilitySlot[],
  count: number = 3
): AvailabilitySlot[] {
  const now = new Date();
  return slots.filter(slot => slot.datetime > now).slice(0, count);
}

/**
 * Check if a slot is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format a slot time for display (e.g., "9:00 AM")
 */
export function formatSlotTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// PARSING STRATEGIES
// =============================================================================

/**
 * Strategy 1: Array of slot objects with time/datetime and courts/count
 * Examples:
 * - [{ time: "2024-01-04T09:00:00", courts: 3 }]
 * - [{ datetime: "2024-01-04T09:00:00Z", available: 2 }]
 * - [{ slot_time: "09:00", court_count: 1, date: "2024-01-04" }]
 */
function tryParseSlotArray(data: unknown): ParsedAvailability {
  if (!Array.isArray(data)) {
    return { slots: [], success: false };
  }

  const slots: AvailabilitySlot[] = [];

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    const obj = item as Record<string, unknown>;

    // Try to extract datetime
    const datetime = extractDatetime(obj);
    if (!datetime) continue;

    // Try to extract court count
    const courtCount = extractCourtCount(obj);
    if (courtCount === null || courtCount <= 0) continue;

    slots.push({ datetime, courtCount });
  }

  return {
    slots,
    success: slots.length > 0,
  };
}

/**
 * Strategy 2: Nested object by date then time
 * Example: { "2024-01-04": { "09:00": 3, "13:00": 2 }, "2024-01-05": { "10:00": 1 } }
 */
function tryParseNestedByDate(data: unknown): ParsedAvailability {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { slots: [], success: false };
  }

  const slots: AvailabilitySlot[] = [];
  const obj = data as Record<string, unknown>;

  for (const [dateKey, timeSlots] of Object.entries(obj)) {
    // Check if dateKey looks like a date (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

    if (typeof timeSlots !== 'object' || timeSlots === null) continue;

    const timeObj = timeSlots as Record<string, unknown>;

    for (const [timeKey, count] of Object.entries(timeObj)) {
      // Check if timeKey looks like a time (HH:MM or H:MM)
      if (!/^\d{1,2}:\d{2}$/.test(timeKey)) continue;

      const courtCount = typeof count === 'number' ? count : parseInt(String(count), 10);
      if (isNaN(courtCount) || courtCount <= 0) continue;

      const datetime = new Date(`${dateKey}T${timeKey.padStart(5, '0')}:00`);
      if (isNaN(datetime.getTime())) continue;

      slots.push({ datetime, courtCount });
    }
  }

  return {
    slots,
    success: slots.length > 0,
  };
}

/**
 * Strategy 3: Simple array of datetime strings (each represents 1 available slot)
 * Example: ["2024-01-04T09:00:00", "2024-01-04T09:00:00", "2024-01-04T10:00:00"]
 * (duplicate times = multiple courts available)
 */
function tryParseDatetimeArray(data: unknown): ParsedAvailability {
  if (!Array.isArray(data)) {
    return { slots: [], success: false };
  }

  // Check if all items are strings that look like datetimes
  const validDatetimes = data.filter(
    item => typeof item === 'string' && !isNaN(new Date(item).getTime())
  );

  if (validDatetimes.length === 0 || validDatetimes.length < data.length * 0.8) {
    return { slots: [], success: false };
  }

  // Group by datetime and count
  const counts = new Map<string, number>();
  for (const dt of validDatetimes) {
    const key = new Date(dt).toISOString();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const slots: AvailabilitySlot[] = [];
  for (const [isoString, courtCount] of counts) {
    slots.push({
      datetime: new Date(isoString),
      courtCount,
    });
  }

  return {
    slots,
    success: slots.length > 0,
  };
}

/**
 * Strategy 4: Start/end time format
 * Example: [{ start: "2024-01-04T09:00:00", end: "2024-01-04T10:00:00", courts_available: 2 }]
 */
function tryParseStartEndFormat(data: unknown): ParsedAvailability {
  if (!Array.isArray(data)) {
    return { slots: [], success: false };
  }

  const slots: AvailabilitySlot[] = [];

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    const obj = item as Record<string, unknown>;

    // Look for start time
    const startValue = obj['start'] || obj['start_time'] || obj['startTime'] || obj['begins_at'];
    if (!startValue) continue;

    const datetime = parseDateTime(startValue);
    if (!datetime) continue;

    // Try to extract court count
    const courtCount = extractCourtCount(obj);
    if (courtCount === null || courtCount <= 0) continue;

    slots.push({ datetime, courtCount });
  }

  return {
    slots,
    success: slots.length > 0,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract datetime from an object, trying various common field names
 */
function extractDatetime(obj: Record<string, unknown>): Date | null {
  const dateFields = [
    'time',
    'datetime',
    'date_time',
    'dateTime',
    'timestamp',
    'slot_time',
    'slotTime',
    'start',
    'start_time',
    'startTime',
    'begins_at',
  ];

  // Also check for separate date and time fields
  const dateValue = obj['date'] || obj['slot_date'] || obj['slotDate'];
  const timeValue = obj['time'] || obj['slot_time'] || obj['slotTime'];

  if (dateValue && timeValue) {
    const combined = `${dateValue}T${timeValue}`;
    const parsed = parseDateTime(combined);
    if (parsed) return parsed;
  }

  for (const field of dateFields) {
    if (obj[field]) {
      const parsed = parseDateTime(obj[field]);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extract court count from an object, trying various common field names
 */
function extractCourtCount(obj: Record<string, unknown>): number | null {
  const countFields = [
    'courts',
    'court_count',
    'courtCount',
    'available',
    'available_courts',
    'availableCourts',
    'count',
    'quantity',
    'spots',
    'slots',
    'courts_available',
    'courtsAvailable',
  ];

  for (const field of countFields) {
    const value = obj[field];
    if (value !== undefined && value !== null) {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(num)) return num;
    }
  }

  // Default to 1 if no count field found but slot exists
  return 1;
}

/**
 * Parse a value as a Date
 */
function parseDateTime(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    // Assume Unix timestamp (seconds or milliseconds)
    const timestamp = value > 1e12 ? value : value * 1000;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}
