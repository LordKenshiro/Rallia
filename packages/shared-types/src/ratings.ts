/**
 * Rating Proofs Types
 * Types for rating proof system including files, proofs, and related entities
 */

// Enum types matching database
export type ProofType = 'external_link' | 'file';
export type FileType = 'image' | 'video' | 'document' | 'audio' | 'other';
export type ProofStatus = 'pending' | 'approved' | 'rejected';
export type RatingCertificationMethod = 'external_rating' | 'proof' | 'referrals';

/**
 * File entity - represents uploaded files in Supabase Storage
 */
export interface File {
  id: string;
  uploaded_by: string;
  storage_key: string;
  url: string;
  thumbnail_url: string | null;
  original_name: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
  metadata: Record<string, any>;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Rating Proof entity - proof of rating (video, image, document, or external link)
 */
export interface RatingProof {
  id: string;
  player_rating_score_id: string;
  proof_type: ProofType;
  file_id: string | null;
  file?: File;  // Joined from files table
  external_url: string | null;
  title: string;
  description: string | null;
  status: ProofStatus;
  reviewed_by: string | null;
  reviewed_by_profile?: {
    display_name: string;
    profile_picture_url: string | null;
  };
  reviewed_at: string | null;
  review_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Player Rating Score entity - links players to rating scores
 */
export interface PlayerRatingScore {
  id: string;
  player_id: string;
  rating_score_id: string;
  is_certified: boolean;
  certified_via: RatingCertificationMethod | null;
  certified_at: string | null;
  external_rating_score_id: string | null;
  referrals_count: number;
  evaluations_count: number;
  last_evaluated_at: string | null;
  expires_at: string | null;
  source: string | null;
  notes: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for creating a new rating proof
 */
export interface CreateRatingProofRequest {
  player_rating_score_id: string;
  proof_type: ProofType;
  file_id?: string;
  external_url?: string;
  title: string;
  description?: string;
}

/**
 * Request payload for updating a rating proof
 */
export interface UpdateRatingProofRequest {
  title?: string;
  description?: string;
  external_url?: string;
}

/**
 * Request payload for admin review of a proof
 */
export interface ReviewRatingProofRequest {
  status: ProofStatus;
  review_notes?: string;
}

/**
 * Props for RatingProofs screen
 */
export interface RatingProofsScreenParams {
  playerRatingScoreId: string;
  sportName: string;
  ratingValue: number;
  isOwnProfile: boolean;
}
