/**
 * UI Types - View Models and Navigation Types
 *
 * This file contains types that are specific to the UI layer and cannot
 * be derived from database types. These include:
 * - View models (transformed/aggregated data for display)
 * - Navigation params
 * - UI-only enums and constants
 */

import type { Notification } from './database';

// ============================================
// VIEW MODELS
// ============================================

/**
 * Notification with UI-specific computed properties
 */
export interface NotificationWithMeta extends Notification {
  /** Whether the notification is unread */
  isUnread: boolean;
  /** Relative time string (e.g., "2 min ago") */
  relativeTime?: string;
}

/**
 * Match card display model
 * Used for displaying match cards in the mobile app list views.
 * This is a UI view model, not a database type.
 */
export interface MatchCardDisplay {
  id: string;
  title: string;
  ageRestriction: string;
  date: string;
  time: string;
  location: string;
  court: string;
  tags: string[];
  participantCount: number;
  participantImages?: string[];
}

/**
 * Player card display model for search results and lists
 */
export interface PlayerCardDisplay {
  id: string;
  displayName: string;
  avatarUrl?: string;
  location?: string;
  primarySport?: string;
  ratingDisplay?: string;
  skillLevel?: string;
}

/**
 * Facility card display model for facility lists
 */
export interface FacilityCardDisplay {
  id: string;
  name: string;
  imageUrl?: string;
  address: string;
  city: string;
  distance?: string;
  courtCount?: number;
  amenities?: string[];
}

// ============================================
// NAVIGATION PARAMS
// ============================================

/**
 * Props for RatingProofs screen
 */
export interface RatingProofsScreenParams {
  playerRatingScoreId: string;
  sportName: string;
  ratingValue: number;
  isOwnProfile: boolean;
}

/**
 * Props for Match detail screen
 */
export interface MatchDetailScreenParams {
  matchId: string;
}

/**
 * Props for Player profile screen
 */
export interface PlayerProfileScreenParams {
  playerId: string;
  isOwnProfile?: boolean;
}

/**
 * Props for Facility detail screen
 */
export interface FacilityDetailScreenParams {
  facilityId: string;
}

/**
 * Props for Sport profile screen
 */
export interface SportProfileScreenParams {
  sportId: string;
  sportName: 'tennis' | 'pickleball';
}

// ============================================
// UI-ONLY ENUMS
// ============================================

/**
 * Access type for matches (UI concept, not stored in DB)
 */
export type AccessType = 'open' | 'closed' | 'invite-only';

/**
 * UI display modes for lists
 */
export type ViewMode = 'list' | 'grid' | 'map';

/**
 * Filter chip selection state
 */
export type FilterSelectionState = 'selected' | 'unselected' | 'disabled';

/**
 * Loading states for async operations
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// FORM TYPES
// ============================================

/**
 * Generic form field state
 */
export interface FormFieldState<T> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Match creation form data
 */
export interface MatchFormData {
  sportId: string;
  matchDate: string;
  startTime: string;
  endTime: string;
  matchType: string;
  locationName?: string;
  locationAddress?: string;
  notes?: string;
}

/**
 * Player preferences form data
 */
export interface PreferencesFormData {
  matchDuration?: string;
  matchType?: string;
  court?: string;
  playStyle?: string;
  playAttributes?: string[];
}

import type { PlayStyleEnum, PlayAttributeEnum } from './database';

/**
 * Player sport preferences information (UI view model)
 */
export interface PreferencesInfo {
  /** Preferred match duration (e.g., '1h', '1.5h', '2h') */
  matchDuration?: string;

  /** Preferred match type (e.g., 'Casual', 'Competitive', 'Both') */
  matchType?: string;

  /** Preferred court location/name */
  court?: string;

  /** Player's preferred play style (enum value) */
  playStyle?: PlayStyleEnum;

  /** Player's key attributes/strengths (enum values) */
  playAttributes?: PlayAttributeEnum[];
}

// ============================================
// DEPRECATED TYPES
// Keep for backwards compatibility during migration
// ============================================

/**
 * @deprecated Use MatchStatus from database.ts instead
 * Database type: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
 *
 * Migration:
 * - 'upcoming' → 'scheduled'
 * - 'in-progress' → 'in_progress'
 * - 'completed' → 'completed' (no change)
 * - 'cancelled' → 'cancelled' (no change)
 */
export type LegacyMatchStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

/**
 * @deprecated Use separate field in database schema for singles/doubles
 * This type is no longer used - see database.ts for new structure
 */
export type LegacyMatchType = 'singles' | 'doubles';
