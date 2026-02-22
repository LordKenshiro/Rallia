/**
 * Availability Schedule Validation
 *
 * Comprehensive validation logic to ensure slot duration and daily time ranges are coherent.
 */

export interface TimeSlot {
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

export interface ValidationError {
  day?: string;
  slotIndex?: number;
  field?: 'start_time' | 'end_time' | 'duration' | 'overlap';
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Convert time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format minutes as a human-readable duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Validate a single time slot against the slot duration
 */
export function validateTimeSlot(
  slot: TimeSlot,
  slotDurationMinutes: number,
  dayName?: string,
  slotIndex?: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const startMinutes = timeToMinutes(slot.start_time);
  const endMinutes = timeToMinutes(slot.end_time);

  // Rule 1: End time must be after start time
  if (endMinutes <= startMinutes) {
    errors.push({
      day: dayName,
      slotIndex,
      field: 'end_time',
      message: 'End time must be after start time',
      type: 'error',
    });
    return errors; // Can't do further validation without valid range
  }

  const rangeDuration = endMinutes - startMinutes;

  // Rule 2: Range must be at least as long as slot duration
  if (rangeDuration < slotDurationMinutes) {
    errors.push({
      day: dayName,
      slotIndex,
      field: 'duration',
      message: `Time range (${formatDuration(rangeDuration)}) is shorter than slot duration (${formatDuration(slotDurationMinutes)})`,
      type: 'error',
    });
    return errors;
  }

  // Rule 3: Range should be an exact multiple of slot duration
  const remainder = rangeDuration % slotDurationMinutes;
  if (remainder !== 0) {
    const suggestedEnd = minutesToTime(
      startMinutes + rangeDuration - remainder + slotDurationMinutes
    );
    const suggestedEndShorter = minutesToTime(startMinutes + rangeDuration - remainder);
    errors.push({
      day: dayName,
      slotIndex,
      field: 'duration',
      message: `Time range (${formatDuration(rangeDuration)}) is not a multiple of slot duration (${formatDuration(slotDurationMinutes)}). Consider ending at ${suggestedEndShorter} or ${suggestedEnd}`,
      type: 'warning',
    });
  }

  return errors;
}

/**
 * Validate that time slots within a day don't overlap
 */
export function validateNoOverlap(slots: TimeSlot[], dayName?: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (slots.length < 2) return errors;

  // Sort slots by start time
  const sortedSlots = slots
    .map((slot, originalIndex) => ({ slot, originalIndex }))
    .sort((a, b) => timeToMinutes(a.slot.start_time) - timeToMinutes(b.slot.start_time));

  for (let i = 0; i < sortedSlots.length - 1; i++) {
    const current = sortedSlots[i];
    const next = sortedSlots[i + 1];

    const currentEnd = timeToMinutes(current.slot.end_time);
    const nextStart = timeToMinutes(next.slot.start_time);

    if (currentEnd > nextStart) {
      errors.push({
        day: dayName,
        slotIndex: next.originalIndex,
        field: 'overlap',
        message: `Time slot overlaps with another slot (${current.slot.start_time} - ${current.slot.end_time})`,
        type: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate time alignment (currently a no-op)
 *
 * Previously this warned about start times for 90/120 min slots,
 * but that was unnecessarily pedantic. Slot durations are relative
 * to the operating hours start time, not to midnight.
 *
 * For example, opening at 9:00 with 2-hour slots gives:
 * 9:00-11:00, 11:00-13:00, 13:00-15:00, etc. - which is perfectly valid.
 */
export function validateTimeAlignment(
  _slot: TimeSlot,
  _slotDurationMinutes: number,
  _dayName?: string,
  _slotIndex?: number
): ValidationError[] {
  // No alignment validation needed - slot times are relative to operating hours
  return [];
}

/**
 * Calculate how many complete slots fit within a time range
 */
export function calculateSlotCount(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): { complete: number; partial: number } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const rangeDuration = endMinutes - startMinutes;

  if (rangeDuration <= 0) {
    return { complete: 0, partial: 0 };
  }

  const complete = Math.floor(rangeDuration / slotDurationMinutes);
  const partialMinutes = rangeDuration % slotDurationMinutes;

  return { complete, partial: partialMinutes };
}

/**
 * Suggest a valid end time based on start time and slot duration
 */
export function suggestValidEndTimes(
  startTime: string,
  slotDurationMinutes: number,
  maxHour: number = 23
): string[] {
  const startMinutes = timeToMinutes(startTime);
  const maxMinutes = maxHour * 60;
  const suggestions: string[] = [];

  for (let slots = 1; slots <= 16; slots++) {
    const endMinutes = startMinutes + slots * slotDurationMinutes;
    if (endMinutes <= maxMinutes) {
      suggestions.push(minutesToTime(endMinutes));
    }
  }

  return suggestions;
}

/**
 * Validate an entire weekly schedule
 */
export function validateSchedule(
  schedule: Record<string, { enabled: boolean; slots: TimeSlot[] }>,
  slotDurationMinutes: number
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const [day, daySchedule] of Object.entries(schedule)) {
    if (!daySchedule.enabled) continue;

    for (let i = 0; i < daySchedule.slots.length; i++) {
      const slot = daySchedule.slots[i];

      // Validate individual slot
      const slotErrors = validateTimeSlot(slot, slotDurationMinutes, day, i);
      for (const err of slotErrors) {
        if (err.type === 'error') {
          allErrors.push(err);
        } else {
          allWarnings.push(err);
        }
      }
    }

    // Validate no overlap within the day
    const overlapErrors = validateNoOverlap(daySchedule.slots, day);
    allErrors.push(...overlapErrors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Auto-adjust end time to be a valid multiple of slot duration
 */
export function adjustEndTimeToValidMultiple(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const rangeDuration = endMinutes - startMinutes;

  if (rangeDuration <= 0) {
    // If invalid, return end time that gives 1 slot
    return minutesToTime(startMinutes + slotDurationMinutes);
  }

  // Round down to nearest complete slot
  const completeSlots = Math.floor(rangeDuration / slotDurationMinutes);
  if (completeSlots === 0) {
    // At least 1 slot
    return minutesToTime(startMinutes + slotDurationMinutes);
  }

  return minutesToTime(startMinutes + completeSlots * slotDurationMinutes);
}

/**
 * Get validation status color for UI
 */
export function getValidationStatusColor(
  errors: ValidationError[],
  warnings: ValidationError[]
): 'success' | 'warning' | 'error' {
  if (errors.length > 0) return 'error';
  if (warnings.length > 0) return 'warning';
  return 'success';
}
