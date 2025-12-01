/**
 * Database types for Rallia application
 * Generated from Supabase schema
 */

// ============================================
// ENUM TYPES
// ============================================

export type GenderType = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type UserRole = 'player' | 'admin' | 'super_admin';
export type AccountStatus = 'active' | 'suspended' | 'deleted' | 'pending_verification';
export type PlayingHand = 'left' | 'right' | 'both';

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type MatchType = 'casual' | 'competitive' | 'both';
export type MatchDuration = '1h' | '1.5h' | '2h';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'cash' | 'bank_transfer';

export type OrganizationType = 'club' | 'facility' | 'league' | 'academy' | 'association';
export type MemberRole = 'owner' | 'admin' | 'manager' | 'staff' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type CourtSurface = 'hard' | 'clay' | 'grass' | 'carpet' | 'synthetic';
export type CourtType = 'indoor' | 'outdoor' | 'covered';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export type RatingType = 'ntrp' | 'utr' | 'dupr' | 'self_assessment';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export type NetworkType = 'public' | 'private' | 'friends' | 'club';
export type NetworkMemberStatus = 'active' | 'pending' | 'blocked' | 'removed';

export type ConversationType = 'direct' | 'group' | 'match' | 'announcement';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type NotificationType = 'match_request' | 'match_confirmation' | 'match_cancellation' | 'message' | 'friend_request' | 'system';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type ReportReason = 'inappropriate_behavior' | 'harassment' | 'spam' | 'cheating' | 'other';

// ============================================
// DATABASE ROW TYPES
// ============================================

export interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  profile_picture_url: string | null;
  birth_date: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string;
  bio: string | null;
  account_status: AccountStatus;
  email_verified: boolean;
  phone_verified: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface Player {
  id: string;
  gender: GenderType | null;
  playing_hand: PlayingHand | null;
  max_travel_distance: number | null;
  privacy_show_age: boolean;
  privacy_show_location: boolean;
  privacy_show_stats: boolean;
  notification_match_requests: boolean;
  notification_messages: boolean;
  notification_reminders: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  role: UserRole;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Sport {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerSport {
  id: string;
  player_id: string;
  sport_id: string;
  preferred_match_duration: MatchDuration | null;
  preferred_match_type: MatchType | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  sport_id: string;
  rating_type: RatingType;
  display_name: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RatingScore {
  id: string;
  rating_id: string;
  score_value: number;
  display_label: string;
  skill_level: SkillLevel | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerRatingScore {
  id: string;
  player_id: string;
  rating_score_id: string;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerAvailability {
  id: string;
  player_id: string;
  sport_id: string | null;
  day_of_week: DayOfWeek;
  time_period: TimePeriod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  organization_type: OrganizationType;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  organization_id: string | null;
  name: string;
  address: string;
  postal_code: string | null;
  city: string;
  province: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  amenities: string[];
  parking_available: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  sport_id: string;
  booking_id: string | null;
  match_date: string;
  start_time: string;
  end_time: string;
  match_type: MatchType;
  status: MatchStatus;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  team_number: number;
  is_host: boolean;
  invitation_status: MemberStatus;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  player_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  related_match_id: string | null;
  related_player_id: string | null;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
}

// ============================================
// INSERT TYPES (for creating new records)
// ============================================

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'last_active_at'> & {
  id?: string;
};

export type PlayerInsert = Omit<Player, 'created_at' | 'updated_at'>;

export type PlayerSportInsert = Omit<PlayerSport, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type PlayerRatingScoreInsert = Omit<PlayerRatingScore, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type PlayerAvailabilityInsert = Omit<PlayerAvailability, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type MatchInsert = Omit<Match, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type MatchParticipantInsert = Omit<MatchParticipant, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

// ============================================
// UPDATE TYPES (for updating existing records)
// ============================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export type PlayerUpdate = Partial<Omit<Player, 'id' | 'created_at' | 'updated_at'>>;

export type PlayerSportUpdate = Partial<Omit<PlayerSport, 'id' | 'player_id' | 'sport_id' | 'created_at' | 'updated_at'>>;

export type PlayerAvailabilityUpdate = Partial<Omit<PlayerAvailability, 'id' | 'created_at' | 'updated_at'>>;

// ============================================
// ONBOARDING-SPECIFIC TYPES
// ============================================

export interface OnboardingPersonalInfo {
  full_name: string;
  display_name?: string;
  birth_date: string;
  gender: GenderType;
  phone?: string;
  profile_picture_url?: string;
}

export interface OnboardingPlayerPreferences {
  playing_hand: PlayingHand;
  max_travel_distance: number;
  sports: Array<{
    sport_id: string;
    sport_name: 'tennis' | 'pickleball';
    preferred_match_duration: MatchDuration;
    preferred_match_type: MatchType;
    is_primary: boolean;
  }>;
}

export interface OnboardingRating {
  sport_id: string;
  sport_name: 'tennis' | 'pickleball';
  rating_type: RatingType;
  score_value: number;
  display_label: string;
}

export interface OnboardingAvailability {
  sport_id?: string;
  day_of_week: DayOfWeek;
  time_period: TimePeriod;
  is_active: boolean;
}

export interface OnboardingData {
  personal_info: OnboardingPersonalInfo;
  selected_sports: string[]; // sport IDs
  preferences: OnboardingPlayerPreferences;
  ratings: OnboardingRating[];
  availability: OnboardingAvailability[];
}

// ============================================
// QUERY RESPONSE TYPES (with joins)
// ============================================

export interface PlayerWithProfile extends Player {
  profile: Profile;
}

export interface PlayerSportWithDetails extends PlayerSport {
  sport: Sport;
}

export interface PlayerRatingWithDetails extends PlayerRatingScore {
  rating_score: RatingScore & {
    rating: Rating & {
      sport: Sport;
    };
  };
}

export interface MatchWithParticipants extends Match {
  sport: Sport;
  participants: Array<MatchParticipant & {
    player: PlayerWithProfile;
  }>;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error: DatabaseError | null;
}
