/**
 * Derive Match Status
 *
 * Utility to compute match status from match attributes instead of using
 * the denormalized status column. This ensures status is always consistent
 * with actual match state.
 *
 * Priority order:
 * 1. cancelled_at IS NOT NULL → 'cancelled'
 * 2. result IS NOT NULL OR end_time passed → 'completed'
 * 3. start_time passed but end_time hasn't → 'in_progress'
 * 4. Default → 'scheduled'
 */

import {
  getTimeDifferenceFromNow,
  getMatchEndTimeDifferenceFromNow,
} from '../formatters/dateFormatter';

/**
 * Derived match status values
 */
export type DerivedMatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Minimal match data required to derive status
 */
export interface MatchStatusInput {
  /** Timestamp when the match was cancelled (null = not cancelled) */
  cancelled_at?: string | null;
  /** Match date in YYYY-MM-DD format */
  match_date: string;
  /** Start time in HH:MM format */
  start_time: string;
  /** End time in HH:MM format */
  end_time: string;
  /** IANA timezone identifier (e.g., "America/New_York") */
  timezone: string;
  /** Match result (any truthy value means completed) */
  result?: unknown | null;
}

/**
 * Derive match status from match attributes
 *
 * This function computes the match status based on:
 * - cancelled_at: If set, match is cancelled
 * - result: If present, match is completed
 * - Time comparison: If end_time passed, match is completed;
 *   if start_time passed but end_time hasn't, match is in_progress
 *
 * @param match - Match data with required fields for status derivation
 * @returns Derived status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
 *
 * @example
 * ```ts
 * const status = deriveMatchStatus({
 *   cancelled_at: null,
 *   match_date: '2025-01-15',
 *   start_time: '14:00',
 *   end_time: '16:00',
 *   timezone: 'America/New_York',
 *   result: null,
 * });
 * // Returns 'scheduled', 'in_progress', or 'completed' based on current time
 * ```
 */
export function deriveMatchStatus(match: MatchStatusInput): DerivedMatchStatus {
  // 1. Cancelled takes priority - if cancelled_at is set, match is cancelled
  if (match.cancelled_at) {
    return 'cancelled';
  }

  // 2. Check if match is completed
  // A match is completed if it has a result OR if end_time has passed
  const hasResult = !!match.result;

  // Calculate time differences
  const endTimeDiff = getMatchEndTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.end_time,
    match.timezone
  );
  const endTimePassed = endTimeDiff < 0;

  if (hasResult || endTimePassed) {
    return 'completed';
  }

  // 3. Check if match is in progress
  // A match is in progress if start_time has passed but end_time hasn't
  const startTimeDiff = getTimeDifferenceFromNow(
    match.match_date,
    match.start_time,
    match.timezone
  );
  const startTimePassed = startTimeDiff < 0;

  if (startTimePassed) {
    return 'in_progress';
  }

  // 4. Default: scheduled (match hasn't started yet)
  return 'scheduled';
}

/**
 * Check if a match is cancelled
 *
 * @param match - Match data (only needs cancelled_at field)
 * @returns true if match is cancelled
 */
export function isMatchCancelled(match: Pick<MatchStatusInput, 'cancelled_at'>): boolean {
  return !!match.cancelled_at;
}

/**
 * Check if a match has ended (completed or cancelled)
 *
 * @param match - Match data
 * @returns true if match has ended (completed or cancelled)
 */
export function hasMatchEnded(match: MatchStatusInput): boolean {
  const status = deriveMatchStatus(match);
  return status === 'completed' || status === 'cancelled';
}

/**
 * Check if a match is joinable (scheduled and not cancelled)
 *
 * @param match - Match data
 * @returns true if match can be joined
 */
export function isMatchJoinable(match: MatchStatusInput): boolean {
  const status = deriveMatchStatus(match);
  return status === 'scheduled';
}

/**
 * Check if a match is in progress
 *
 * @param match - Match data
 * @returns true if match is currently in progress
 */
export function isMatchInProgress(match: MatchStatusInput): boolean {
  return deriveMatchStatus(match) === 'in_progress';
}
