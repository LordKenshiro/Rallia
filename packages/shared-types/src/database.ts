/**
 * Database Types - Derived from Supabase Generated Types
 *
 * This file provides convenient type aliases and composite types
 * built from the auto-generated supabase.ts file.
 *
 * DO NOT manually define database row types here - they should be
 * derived from the Database type in supabase.ts
 *
 * NOTE: All tables use SINGULAR naming convention (profile, player, sport, etc.)
 */

import type { Database } from './supabase';

// ============================================
// HELPER TYPES
// ============================================

/** Helper to extract Row type from a table */
type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Helper to extract Insert type from a table */
type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Helper to extract Update type from a table */
type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/** Helper to extract Enum type */
type DbEnum<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// ============================================
// ENUM TYPES (Aligned with consolidated schema)
// ============================================

// Admin & User Roles
export type AdminRoleEnum = DbEnum<'admin_role_enum'>;
export type AppRoleEnum = DbEnum<'app_role_enum'>;
export type RoleEnum = DbEnum<'role_enum'>;

// Player
export type GenderEnum = DbEnum<'gender_enum'>;
export type PlayingHandEnum = DbEnum<'playing_hand_enum'>;

// Match
export type MatchDurationEnum = DbEnum<'match_duration_enum'>;
export type MatchTypeEnum = DbEnum<'match_type_enum'>;

// Organization & Facility
export type OrganizationTypeEnum = DbEnum<'organization_type_enum'>;
export type OrganizationNatureEnum = DbEnum<'organization_nature_enum'>;
export type FacilityTypeEnum = DbEnum<'facility_type_enum'>;
export type FacilityContactTypeEnum = DbEnum<'facility_contact_type_enum'>;

// Court
export type SurfaceTypeEnum = DbEnum<'surface_type_enum'>;
export type AvailabilityEnum = DbEnum<'availability_enum'>;

// Time & Schedule
export type DayEnum = DbEnum<'day_enum'>;
export type PeriodEnum = DbEnum<'period_enum'>;

// Rating
export type RatingCertificationMethodEnum = DbEnum<'rating_certification_method_enum'>;
export type RatingRequestStatusEnum = DbEnum<'rating_request_status_enum'>;

// Files & Proofs
export type FileTypeEnum = DbEnum<'file_type_enum'>;
export type ProofTypeEnum = DbEnum<'proof_type_enum'>;
export type ProofStatusEnum = DbEnum<'proof_status_enum'>;

// Notification & Delivery
export type NotificationTypeEnum = DbEnum<'notification_type_enum'>;
export type DeliveryChannelEnum = DbEnum<'delivery_channel_enum'>;
export type DeliveryStatusEnum = DbEnum<'delivery_status_enum'>;

// Invitations
export type InviteSourceEnum = DbEnum<'invite_source_enum'>;
export type InviteStatusEnum = DbEnum<'invite_status_enum'>;

// Location
export type CountryEnum = DbEnum<'country_enum'>;

// Play Style & Attributes
export type PlayStyleEnum = DbEnum<'play_style_enum'>;
export type PlayAttributeEnum = DbEnum<'play_attribute_enum'>;

// Skill Level
export type SkillLevel = DbEnum<'skill_level'>;

// Match (non-suffixed variants)
export type MatchType = DbEnum<'match_type'>;
export type MatchDuration = DbEnum<'match_duration'>;

// Time & Schedule (non-suffixed variants)
export type DayOfWeek = DbEnum<'day_of_week'>;
export type TimePeriod = DbEnum<'time_period'>;

// Gender (non-suffixed variant)
export type GenderType = DbEnum<'gender_type'>;

// Court (non-suffixed variants)
export type CourtSurface = DbEnum<'court_surface'>;
export type CourtType = DbEnum<'court_type'>;

// ============================================
// TABLE ROW TYPES (All Singular)
// ============================================

// User & Profile
export type Profile = TableRow<'profile'>;
export type Player = TableRow<'player'>;
export type Admin = TableRow<'admin'>;

// Sport
export type Sport = TableRow<'sport'>;
export type PlayStyle = TableRow<'play_style'>;
export type PlayAttribute = TableRow<'play_attribute'>;

// Player Sport Profile (replaces player_sport)
export type PlayerSportProfile = TableRow<'player_sport_profile'>;
export type PlayerPlayAttribute = TableRow<'player_play_attribute'>;

// Rating System (replaces rating)
export type RatingSystem = TableRow<'rating_system'>;
export type RatingScore = TableRow<'rating_score'>;
export type PlayerRatingScore = TableRow<'player_rating_score'>;
export type RatingProof = TableRow<'rating_proof'>;
export type RatingReferenceRequest = TableRow<'rating_reference_request'>;
export type PeerRatingRequest = TableRow<'peer_rating_request'>;

// Availability
export type PlayerAvailability = TableRow<'player_availability'>;

// Organization & Facility
export type Organization = TableRow<'organization'>;
export type OrganizationMember = TableRow<'organization_member'>;
export type Facility = TableRow<'facility'>;
export type FacilityContact = TableRow<'facility_contact'>;
export type FacilityImage = TableRow<'facility_image'>;
export type FacilitySport = TableRow<'facility_sport'>;
export type FacilityFile = TableRow<'facility_file'>;

// Court
export type Court = TableRow<'court'>;
export type CourtSport = TableRow<'court_sport'>;

// Notification
export type Notification = TableRow<'notification'>;
export type DeliveryAttempt = TableRow<'delivery_attempt'>;

// Files
export type File = TableRow<'file'>;

// Invitation
export type Invitation = TableRow<'invitation'>;

// Verification
export type VerificationCode = TableRow<'verification_code'>;

// Waitlist
export type WaitlistSignup = TableRow<'waitlist_signup'>;

// ============================================
// INSERT TYPES
// ============================================

export type ProfileInsert = TableInsert<'profile'>;
export type PlayerInsert = TableInsert<'player'>;
export type AdminInsert = TableInsert<'admin'>;
export type SportInsert = TableInsert<'sport'>;
export type PlayStyleInsert = TableInsert<'play_style'>;
export type PlayAttributeInsert = TableInsert<'play_attribute'>;
export type PlayerSportProfileInsert = TableInsert<'player_sport_profile'>;
export type PlayerPlayAttributeInsert = TableInsert<'player_play_attribute'>;
export type RatingSystemInsert = TableInsert<'rating_system'>;
export type RatingScoreInsert = TableInsert<'rating_score'>;
export type PlayerRatingScoreInsert = TableInsert<'player_rating_score'>;
export type RatingProofInsert = TableInsert<'rating_proof'>;
export type RatingReferenceRequestInsert = TableInsert<'rating_reference_request'>;
export type PeerRatingRequestInsert = TableInsert<'peer_rating_request'>;
export type PlayerAvailabilityInsert = TableInsert<'player_availability'>;
export type OrganizationInsert = TableInsert<'organization'>;
export type OrganizationMemberInsert = TableInsert<'organization_member'>;
export type FacilityInsert = TableInsert<'facility'>;
export type FacilityContactInsert = TableInsert<'facility_contact'>;
export type FacilityImageInsert = TableInsert<'facility_image'>;
export type FacilitySportInsert = TableInsert<'facility_sport'>;
export type FacilityFileInsert = TableInsert<'facility_file'>;
export type CourtInsert = TableInsert<'court'>;
export type CourtSportInsert = TableInsert<'court_sport'>;
export type NotificationInsert = TableInsert<'notification'>;
export type DeliveryAttemptInsert = TableInsert<'delivery_attempt'>;
export type FileInsert = TableInsert<'file'>;
export type InvitationInsert = TableInsert<'invitation'>;
export type VerificationCodeInsert = TableInsert<'verification_code'>;
export type WaitlistSignupInsert = TableInsert<'waitlist_signup'>;

// ============================================
// UPDATE TYPES
// ============================================

export type ProfileUpdate = TableUpdate<'profile'>;
export type PlayerUpdate = TableUpdate<'player'>;
export type AdminUpdate = TableUpdate<'admin'>;
export type SportUpdate = TableUpdate<'sport'>;
export type PlayStyleUpdate = TableUpdate<'play_style'>;
export type PlayAttributeUpdate = TableUpdate<'play_attribute'>;
export type PlayerSportProfileUpdate = TableUpdate<'player_sport_profile'>;
export type PlayerPlayAttributeUpdate = TableUpdate<'player_play_attribute'>;
export type RatingSystemUpdate = TableUpdate<'rating_system'>;
export type RatingScoreUpdate = TableUpdate<'rating_score'>;
export type PlayerRatingScoreUpdate = TableUpdate<'player_rating_score'>;
export type RatingProofUpdate = TableUpdate<'rating_proof'>;
export type RatingReferenceRequestUpdate = TableUpdate<'rating_reference_request'>;
export type PeerRatingRequestUpdate = TableUpdate<'peer_rating_request'>;
export type PlayerAvailabilityUpdate = TableUpdate<'player_availability'>;
export type OrganizationUpdate = TableUpdate<'organization'>;
export type OrganizationMemberUpdate = TableUpdate<'organization_member'>;
export type FacilityUpdate = TableUpdate<'facility'>;
export type FacilityContactUpdate = TableUpdate<'facility_contact'>;
export type FacilityImageUpdate = TableUpdate<'facility_image'>;
export type FacilitySportUpdate = TableUpdate<'facility_sport'>;
export type FacilityFileUpdate = TableUpdate<'facility_file'>;
export type CourtUpdate = TableUpdate<'court'>;
export type CourtSportUpdate = TableUpdate<'court_sport'>;
export type NotificationUpdate = TableUpdate<'notification'>;
export type DeliveryAttemptUpdate = TableUpdate<'delivery_attempt'>;
export type FileUpdate = TableUpdate<'file'>;
export type InvitationUpdate = TableUpdate<'invitation'>;
export type VerificationCodeUpdate = TableUpdate<'verification_code'>;
export type WaitlistSignupUpdate = TableUpdate<'waitlist_signup'>;

// ============================================
// COMPOSITE TYPES (with FK relationships)
// ============================================

/** Player with their profile information */
export interface PlayerWithProfile extends Player {
  profile: Profile;
}

/** Player sport profile with sport details */
export interface PlayerSportProfileWithDetails extends PlayerSportProfile {
  sport: Sport;
  play_style?: PlayStyle;
}

/** Player rating score with full rating hierarchy */
export interface PlayerRatingWithDetails extends PlayerRatingScore {
  rating_score: RatingScore & {
    rating_system: RatingSystem & {
      sport: Sport;
    };
  };
}

/** Rating proof with file attachment */
export interface RatingProofWithFile extends RatingProof {
  file?: File;
}

/** Rating proof with reviewer profile */
export interface RatingProofWithReviewer extends RatingProof {
  file?: File;
  reviewed_by_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

/** Notification with related entities */
export interface NotificationWithRelations extends Notification {
  target_player?: PlayerWithProfile;
}

/** Facility with organization and images */
export interface FacilityWithDetails extends Facility {
  organization?: Organization;
  images?: FacilityImage[];
  sports?: FacilitySport[];
}

/** Court with facility info */
export interface CourtWithFacility extends Court {
  facility: Facility;
  sports?: CourtSport[];
}

/** Organization member with profile */
export interface OrganizationMemberWithProfile extends OrganizationMember {
  profile: Profile;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface OnboardingPersonalInfo {
  full_name: string;
  display_name?: string;
  birth_date: string;
  gender: GenderEnum;
  phone?: string;
  avatar_url?: string;
  profile_picture_url?: string;
}

export interface OnboardingPlayerPreferences {
  username?: string;
  playing_hand: PlayingHandEnum;
  max_travel_distance: number;
  sports: Array<{
    sport_id: string;
    sport_name: 'tennis' | 'pickleball';
    preferred_match_duration: MatchDuration;
    preferred_match_type: MatchType;
    is_primary?: boolean;
  }>;
}

export interface OnboardingRating {
  sport_id: string;
  sport_name: 'tennis' | 'pickleball';
  rating_system_code?: string;
  rating_type?: string;
  score_value: number;
  display_label: string;
}

export interface OnboardingAvailability {
  day?: DayEnum;
  period?: PeriodEnum;
  sport_id?: string;
  day_of_week?: DayOfWeek;
  time_period?: TimePeriod;
  is_active: boolean;
}

export interface OnboardingData {
  personal_info: OnboardingPersonalInfo;
  selected_sports: string[];
  preferences: OnboardingPlayerPreferences;
  ratings: OnboardingRating[];
  availability: OnboardingAvailability[];
}

// ============================================
// NOTIFICATION SERVICE TYPES
// ============================================

/**
 * Options for fetching paginated notifications
 */
export interface NotificationQueryOptions {
  /** Number of notifications to fetch per page */
  pageSize?: number;
  /** Cursor for pagination (created_at of last item) */
  cursor?: string;
  /** Filter by read status */
  unreadOnly?: boolean;
  /** Filter by notification type */
  type?: NotificationTypeEnum;
}

/**
 * Paginated notifications response
 */
export interface NotificationsPage {
  /** List of notifications */
  notifications: Notification[];
  /** Cursor for next page (created_at of last item) */
  nextCursor: string | null;
  /** Whether there are more notifications */
  hasMore: boolean;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/** Request payload for creating a new rating proof */
export interface CreateRatingProofRequest {
  player_rating_score_id: string;
  proof_type: ProofTypeEnum;
  file_id?: string;
  external_url?: string;
  title: string;
  description?: string;
}

/** Request payload for updating a rating proof */
export interface UpdateRatingProofRequest {
  title?: string;
  description?: string;
  external_url?: string;
}

/** Request payload for admin review of a proof */
export interface ReviewRatingProofRequest {
  status: ProofStatusEnum;
  review_notes?: string;
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

// ============================================
// RE-EXPORT DATABASE TYPE FOR SUPABASE CLIENT
// ============================================

export type { Database } from './supabase';

// ============================================
// BACKWARDS COMPATIBILITY ALIASES
// (Use these during migration, then remove)
// ============================================

/** @deprecated Use PlayerSportProfile instead */
export type PlayerSport = PlayerSportProfile;
/** @deprecated Use PlayerSportProfileInsert instead */
export type PlayerSportInsert = PlayerSportProfileInsert;
/** @deprecated Use PlayerSportProfileUpdate instead */
export type PlayerSportUpdate = PlayerSportProfileUpdate;

/** @deprecated Use RatingSystem instead */
export type Rating = RatingSystem;
/** @deprecated Use RatingSystemInsert instead */
export type RatingInsert = RatingSystemInsert;
/** @deprecated Use RatingSystemUpdate instead */
export type RatingUpdate = RatingSystemUpdate;
