/**
 * Normalize a time string to canonical "HH:MM:00" for comparison.
 * Handles "9:00", "09:00:00", "09:00:00.123456" from DB or client.
 */
export function normalizeTimeForComparison(time: string): string {
  if (!time || typeof time !== 'string') return time;
  const trimmed = time.trim();
  const parts = trimmed.split(/[.:]/);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10) || 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return trimmed;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}
