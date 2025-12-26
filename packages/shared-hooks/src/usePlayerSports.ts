import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@rallia/shared-services';
import type { Sport } from './useSports';

/**
 * Player sport data with nested sport information
 */
export interface PlayerSport {
  player_id: string;
  sport_id: string;
  is_primary: boolean;
  preferred_match_duration?: string;
  preferred_match_type?: string;
  sport?: Sport | Sport[];
}

/**
 * Custom hook for fetching player's sports with sport details
 * Eliminates duplicate player sports fetching code across components
 *
 * @param playerId - The player ID to fetch sports for. Pass user?.id from your auth context.
 * @returns Object containing player sports array, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { user } = useAuth();
 * const { playerSports, loading, error, refetch } = usePlayerSports(user?.id);
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error.message} />;
 *
 * return playerSports.map(ps => {
 *   const sport = Array.isArray(ps.sport) ? ps.sport[0] : ps.sport;
 *   return <Text key={ps.sport_id}>{sport?.display_name}</Text>;
 * });
 * ```
 */
export const usePlayerSports = (playerId: string | undefined) => {
  const [playerSports, setPlayerSports] = useState<PlayerSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayerSports = useCallback(async () => {
    // No playerId means not authenticated - return empty
    if (!playerId) {
      setPlayerSports([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch player's sports with sport details
      const { data, error: sportsError } = await supabase
        .from('player_sport')
        .select(
          `
          player_id,
          sport_id,
          is_primary,
          preferred_match_duration,
          preferred_match_type,
          sport:sport_id (
            id,
            name,
            display_name,
            icon_url,
            is_active
          )
        `
        )
        .eq('player_id', playerId);

      if (sportsError) {
        throw new Error(sportsError.message);
      }

      setPlayerSports(data || []);
    } catch (err) {
      console.error('Error fetching player sports:', err);
      setError(err as Error);
      setPlayerSports([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  // Fetch when playerId changes
  useEffect(() => {
    fetchPlayerSports();
  }, [fetchPlayerSports]);

  return {
    playerSports,
    loading,
    error,
    refetch: fetchPlayerSports,
  };
};
