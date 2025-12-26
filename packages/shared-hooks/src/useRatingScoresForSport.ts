/**
 * useRatingScoresForSport Hook
 *
 * Fetches rating scores for a specific sport using the appropriate rating system.
 * Automatically maps sport names to their primary rating systems:
 * - Tennis -> NTRP
 * - Pickleball -> DUPR
 *
 * Also fetches the current player's rating for that sport to use as default.
 */

import { useQuery } from '@tanstack/react-query';
import { RatingScoreService, supabase } from '@rallia/shared-services';
import type { RatingSystemCodeEnum } from '@rallia/shared-types';

// =============================================================================
// TYPES
// =============================================================================

export interface RatingScoreOption {
  id: string;
  value: number;
  label: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
  description: string | null;
}

interface UseRatingScoresForSportResult {
  ratingScores: RatingScoreOption[];
  isLoading: boolean;
  error: Error | null;
  hasRatingSystem: boolean;
  /** The current player's rating score ID for this sport (if they have one) */
  playerRatingScoreId: string | null;
}

// =============================================================================
// SPORT TO RATING SYSTEM MAPPING
// =============================================================================

/**
 * Maps sport names to their primary rating system codes
 */
const SPORT_RATING_SYSTEM_MAP: Record<string, RatingSystemCodeEnum> = {
  tennis: 'ntrp',
  pickleball: 'dupr',
};

/**
 * Get the rating system code for a sport
 */
function getRatingSystemForSport(sportName: string): RatingSystemCodeEnum | null {
  const normalizedName = sportName.toLowerCase().trim();
  return SPORT_RATING_SYSTEM_MAP[normalizedName] || null;
}

// =============================================================================
// HOOK
// =============================================================================

interface RatingScoresWithPlayer {
  ratingScores: RatingScoreOption[];
  playerRatingScoreId: string | null;
}

/**
 * Hook to fetch rating scores for a sport's primary rating system
 * Also fetches the player's rating to use as the default selection.
 *
 * @param sportName - The name of the sport (e.g., "tennis", "pickleball")
 * @param sportId - Optional sport ID for fetching player's rating
 * @param userId - Optional user ID for fetching player's rating. Pass user?.id from your auth context.
 * @returns Rating scores, loading state, error, and player's current rating
 *
 * @example
 * ```tsx
 * const { user } = useAuth();
 * const { ratingScores, isLoading, hasRatingSystem, playerRatingScoreId } = useRatingScoresForSport('tennis', sportId, user?.id);
 *
 * // playerRatingScoreId can be used as default for minRatingScoreId
 * useEffect(() => {
 *   if (playerRatingScoreId && !minRatingScoreId) {
 *     setValue('minRatingScoreId', playerRatingScoreId);
 *   }
 * }, [playerRatingScoreId]);
 * ```
 */
export function useRatingScoresForSport(
  sportName: string | undefined,
  sportId?: string,
  userId?: string
): UseRatingScoresForSportResult {
  const ratingSystemCode = sportName ? getRatingSystemForSport(sportName) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ratingScoresWithPlayer', sportName, sportId, ratingSystemCode, userId],
    queryFn: async (): Promise<RatingScoresWithPlayer> => {
      if (!sportName || !ratingSystemCode) {
        return { ratingScores: [], playerRatingScoreId: null };
      }

      // Fetch rating scores for the sport
      const response = await RatingScoreService.getRatingScoresBySport(sportName, ratingSystemCode);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch rating scores');
      }

      const ratingScores = (response.data || []).map(score => ({
        id: score.id,
        value: score.score_value,
        label: score.display_label,
        skillLevel: score.skill_level,
        description: score.description || null,
      }));

      // Fetch the player's rating for this sport (if userId provided)
      let playerRatingScoreId: string | null = null;

      if (sportId && userId) {
        try {
          // Get player's rating for this sport's rating system
          const { data: playerRatings } = await supabase
            .from('player_rating_score')
            .select(
              `
              rating_score_id,
              rating_score!player_rating_scores_rating_score_id_fkey (
                id,
                rating_system (
                  sport_id,
                  code
                )
              )
            `
            )
            .eq('player_id', userId);

          // Find the rating for this sport and rating system
          if (playerRatings) {
            const matchingRating = playerRatings.find(pr => {
              // rating_score is returned as an array by Supabase
              const ratingScores = Array.isArray(pr.rating_score)
                ? pr.rating_score
                : pr.rating_score
                  ? [pr.rating_score]
                  : [];

              // Check each rating_score's rating_system
              return ratingScores.some(ratingScore => {
                // rating_system is also returned as an array by Supabase
                const ratingSystems = Array.isArray(ratingScore?.rating_system)
                  ? ratingScore.rating_system
                  : ratingScore?.rating_system
                    ? [ratingScore.rating_system]
                    : [];

                return ratingSystems.some(
                  ratingSystem =>
                    ratingSystem?.sport_id === sportId && ratingSystem?.code === ratingSystemCode
                );
              });
            });

            if (matchingRating) {
              playerRatingScoreId = matchingRating.rating_score_id;
            }
          }
        } catch (err) {
          // Silently fail - player rating is optional
          console.warn('Failed to fetch player rating:', err);
        }
      }

      return { ratingScores, playerRatingScoreId };
    },
    enabled: !!sportName && !!ratingSystemCode,
    staleTime: 1000 * 60 * 30, // 30 minutes - rating scores rarely change
  });

  return {
    ratingScores: data?.ratingScores || [],
    isLoading,
    error: error as Error | null,
    hasRatingSystem: !!ratingSystemCode,
    playerRatingScoreId: data?.playerRatingScoreId || null,
  };
}

export default useRatingScoresForSport;
