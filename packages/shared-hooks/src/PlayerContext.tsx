/**
 * Player Context - Global player state management
 *
 * This context provides a single source of truth for the current user's player data.
 * All components using usePlayer() will share the same player state, ensuring
 * that when one component refetches the player data (e.g., after updating settings),
 * all consumers are updated.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { supabase } from '@rallia/shared-services';
import type { Player } from '@rallia/shared-types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default max travel distance in km if not set by user */
const DEFAULT_MAX_TRAVEL_DISTANCE_KM = 25;

// =============================================================================
// TYPES
// =============================================================================

export interface PlayerContextType {
  /** Current user's player data */
  player: Player | null;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Refetch the player data */
  refetch: () => Promise<void>;

  /** Max travel distance with fallback to default */
  maxTravelDistanceKm: number;
}

// =============================================================================
// CONTEXT
// =============================================================================

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      // Fetch player from database
      const { data, error: playerError } = await supabase
        .from('player')
        .select('*')
        .eq('id', user.id)
        .single();

      if (playerError) {
        // PGRST116 means no rows found - player record doesn't exist yet
        if (playerError.code === 'PGRST116') {
          setPlayer(null);
          setLoading(false);
          return;
        }
        throw new Error(playerError.message);
      }

      setPlayer(data);
    } catch (err) {
      console.error('Error fetching player:', err);
      setError(err as Error);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch player data
  const refetch = useCallback(async () => {
    await fetchPlayer();
  }, [fetchPlayer]);

  // Initial fetch
  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  // Listen for auth state changes and refetch player
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchPlayer();
        }
      } else if (event === 'SIGNED_OUT') {
        setPlayer(null);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPlayer]);

  // Calculate max travel distance with fallback to default
  const maxTravelDistanceKm = useMemo(
    () => player?.max_travel_distance ?? DEFAULT_MAX_TRAVEL_DISTANCE_KM,
    [player?.max_travel_distance]
  );

  const contextValue: PlayerContextType = {
    player,
    loading,
    error,
    refetch,
    maxTravelDistanceKm,
  };

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the player context.
 * Returns the current user's player data, loading state, error, and refetch function.
 *
 * @example
 * ```tsx
 * const { player, maxTravelDistanceKm, loading, refetch } = usePlayer();
 *
 * if (loading) return <Spinner />;
 *
 * // After updating player settings, call refetch to update all consumers
 * const handleSaveSettings = async () => {
 *   await updatePlayerSettings(...);
 *   await refetch(); // This updates all components using usePlayer()
 * };
 *
 * return <Text>Max travel: {maxTravelDistanceKm} km</Text>;
 * ```
 */
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);

  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }

  return context;
};

export default PlayerContext;
