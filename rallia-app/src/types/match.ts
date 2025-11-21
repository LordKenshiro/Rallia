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
