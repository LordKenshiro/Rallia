/**
 * Match Type Definitions
 *
 * @deprecated This file contains UI-specific types that will be migrated to database.ts
 * New code should use types from database.ts instead
 * See TYPE_MIGRATION_GUIDE.md for migration instructions
 */

/**
 * UI-specific match display type
 * Used for displaying match cards in the mobile app
 * 
 * Note: This is NOT the database Match type (see database.ts)
 * This is a simplified view model for the UI
 */
export interface Match {
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
 * @deprecated Use MatchType from database.ts instead
 * Database MatchType represents match style: 'casual' | 'competitive' | 'both'
 * 
 * For singles/doubles, use separate field in database schema
 * Migration: This type is no longer used - see database.ts for new structure
 */
export type LegacyMatchType = 'singles' | 'doubles';

/**
 * Access type for matches
 * This type is not in database.ts and remains valid for UI use
 */
export type AccessType = 'open' | 'closed' | 'invite-only';

/**
 * User Type Definitions
 */
export interface User {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  phoneNumber?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  selectedSports?: string[];
  tennisRating?: string;
  pickleballRating?: string;
  playingHand?: 'left' | 'right' | 'both';
  maxTravelDistance?: number;
  matchDuration?: string;
  tennisMatchType?: string;
  pickleballMatchType?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Onboarding Types
 */
export type SportType = 'tennis' | 'pickleball';

export interface OnboardingData {
  personalInfo?: {
    fullName: string;
    username: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
  };
  sportSelection?: SportType[];
  tennisRating?: string;
  pickleballRating?: string;
  preferences?: {
    playingHand: 'left' | 'right' | 'both';
    maxTravelDistance: number;
    matchDuration: string;
    tennisMatchType?: string;
    pickleballMatchType?: string;
  };
}
