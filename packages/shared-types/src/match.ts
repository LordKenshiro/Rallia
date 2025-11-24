/**
 * Match Type Definitions
 *
 * Core types for match-related data across the app
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

export type MatchStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

export type MatchType = 'singles' | 'doubles';

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
