/**
 * usePlayer Hook
 * Custom hook for fetching and managing the current user's player data.
 * Uses PlayerContext to provide a single source of truth for player state.
 *
 * @example
 * ```tsx
 * const { player, maxTravelDistanceKm, loading, refetch } = usePlayer();
 *
 * if (loading) return <Spinner />;
 *
 * return <Text>Max travel: {maxTravelDistanceKm} km</Text>;
 * ```
 */

// Re-export from PlayerContext for backward compatibility
export { usePlayer, PlayerProvider } from './PlayerContext';
export type { PlayerContextType } from './PlayerContext';
