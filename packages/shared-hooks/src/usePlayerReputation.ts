/**
 * usePlayerReputation Hook
 *
 * Fetches and caches player reputation data with loading and error states.
 * Provides both the raw reputation data and display-ready formatted data.
 *
 * @example
 * ```tsx
 * const { reputation, display, loading, error, refetch } = usePlayerReputation(playerId);
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 *
 * return (
 *   <ReputationBadge
 *     tier={display.tier}
 *     score={display.score}
 *     isVisible={display.isVisible}
 *   />
 * );
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getReputationSummary,
  getReputationDisplay,
  calculateTierLocally,
  getTierConfig,
  type ReputationSummary,
  type ReputationDisplay,
  type ReputationTier,
} from '@rallia/shared-services';

// =============================================================================
// TYPES
// =============================================================================

export interface UsePlayerReputationResult {
  /** Raw reputation summary data */
  reputation: ReputationSummary | null;
  /** Display-ready reputation data for UI components */
  display: ReputationDisplay;
  /** Whether the data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch the reputation data */
  refetch: () => Promise<void>;
}

export interface UsePlayerReputationOptions {
  /** Whether to skip fetching (useful for conditional queries) */
  skip?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
}

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry {
  data: ReputationSummary;
  timestamp: number;
}

const reputationCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedReputation(playerId: string, cacheTtl: number): ReputationSummary | null {
  const entry = reputationCache.get(playerId);

  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > cacheTtl;
  if (isExpired) {
    reputationCache.delete(playerId);
    return null;
  }

  return entry.data;
}

function setCachedReputation(playerId: string, data: ReputationSummary): void {
  reputationCache.set(playerId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear the reputation cache for a specific player or all players
 */
export function clearReputationCache(playerId?: string): void {
  if (playerId) {
    reputationCache.delete(playerId);
  } else {
    reputationCache.clear();
  }
}

// =============================================================================
// DEFAULT DISPLAY
// =============================================================================

const defaultDisplay: ReputationDisplay = {
  tier: 'unknown' as ReputationTier,
  score: 100,
  isVisible: false,
  tierLabel: 'New Player',
  tierColor: '#9CA3AF',
  tierIcon: 'help-circle',
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to fetch and manage player reputation data.
 *
 * @param playerId - The player ID to fetch reputation for
 * @param options - Hook options
 */
export function usePlayerReputation(
  playerId: string | null | undefined,
  options: UsePlayerReputationOptions = {}
): UsePlayerReputationResult {
  const { skip = false, cacheTtl = DEFAULT_CACHE_TTL } = options;

  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [display, setDisplay] = useState<ReputationDisplay>(defaultDisplay);
  const [loading, setLoading] = useState(!skip && !!playerId);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchReputation = useCallback(async () => {
    if (!playerId || skip) {
      setReputation(null);
      setDisplay(defaultDisplay);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedReputation(playerId, cacheTtl);
    if (cached) {
      const tierConfig = getTierConfig(cached.tier);
      setReputation(cached);
      setDisplay({
        tier: cached.tier,
        score: cached.score,
        isVisible: cached.isPublic,
        tierLabel: tierConfig.label,
        tierColor: tierConfig.color,
        tierIcon: tierConfig.icon,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summary = await getReputationSummary(playerId);

      if (!isMountedRef.current) return;

      // Cache the result
      setCachedReputation(playerId, summary);

      setReputation(summary);

      const tierConfig = getTierConfig(summary.tier);
      setDisplay({
        tier: summary.tier,
        score: summary.score,
        isVisible: summary.isPublic,
        tierLabel: tierConfig.label,
        tierColor: tierConfig.color,
        tierIcon: tierConfig.icon,
      });
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reputation';
      setError(errorMessage);
      console.error('[usePlayerReputation] Error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [playerId, skip, cacheTtl]);

  // Fetch on mount and when playerId changes
  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  const refetch = useCallback(async () => {
    // Clear cache before refetching
    if (playerId) {
      clearReputationCache(playerId);
    }
    await fetchReputation();
  }, [playerId, fetchReputation]);

  return {
    reputation,
    display,
    loading,
    error,
    refetch,
  };
}

// =============================================================================
// BATCH HOOK
// =============================================================================

export interface UseMultipleReputationsResult {
  /** Map of player ID to reputation display */
  reputations: Map<string, ReputationDisplay>;
  /** Whether any data is loading */
  loading: boolean;
  /** Error message if any fetch failed */
  error: string | null;
  /** Refetch all reputations */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch reputation data for multiple players at once.
 * Useful for displaying badges in lists.
 *
 * @param playerIds - Array of player IDs
 * @param options - Hook options
 */
export function useMultipleReputations(
  playerIds: string[],
  options: UsePlayerReputationOptions = {}
): UseMultipleReputationsResult {
  const { skip = false, cacheTtl = DEFAULT_CACHE_TTL } = options;

  const [reputations, setReputations] = useState<Map<string, ReputationDisplay>>(new Map());
  const [loading, setLoading] = useState(!skip && playerIds.length > 0);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchReputations = useCallback(async () => {
    if (skip || playerIds.length === 0) {
      setReputations(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = new Map<string, ReputationDisplay>();

    // Fetch all reputations in parallel
    try {
      const promises = playerIds.map(async playerId => {
        // Check cache first
        const cached = getCachedReputation(playerId, cacheTtl);
        if (cached) {
          const tierConfig = getTierConfig(cached.tier);
          return {
            playerId,
            display: {
              tier: cached.tier,
              score: cached.score,
              isVisible: cached.isPublic,
              tierLabel: tierConfig.label,
              tierColor: tierConfig.color,
              tierIcon: tierConfig.icon,
            } as ReputationDisplay,
          };
        }

        // Fetch from server
        const summary = await getReputationSummary(playerId);
        setCachedReputation(playerId, summary);

        const tierConfig = getTierConfig(summary.tier);
        return {
          playerId,
          display: {
            tier: summary.tier,
            score: summary.score,
            isVisible: summary.isPublic,
            tierLabel: tierConfig.label,
            tierColor: tierConfig.color,
            tierIcon: tierConfig.icon,
          } as ReputationDisplay,
        };
      });

      const results = await Promise.all(promises);

      if (!isMountedRef.current) return;

      results.forEach(({ playerId, display }) => {
        result.set(playerId, display);
      });

      setReputations(result);
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reputations';
      setError(errorMessage);
      console.error('[useMultipleReputations] Error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [playerIds.join(','), skip, cacheTtl]);

  useEffect(() => {
    fetchReputations();
  }, [fetchReputations]);

  const refetch = useCallback(async () => {
    playerIds.forEach(id => clearReputationCache(id));
    await fetchReputations();
  }, [playerIds, fetchReputations]);

  return {
    reputations,
    loading,
    error,
    refetch,
  };
}

export default usePlayerReputation;
