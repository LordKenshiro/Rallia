/**
 * useFavoriteStatus Hook
 * 
 * Manages the favorite status between two users.
 * Used in both PlayerProfile and Chat screens.
 */

import { useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@rallia/shared-services';

interface UseFavoriteStatusResult {
  /** Whether the current user has favorited the other user */
  isFavorite: boolean;
  /** Loading state for the initial check */
  isLoading: boolean;
  /** Whether a favorite/unfavorite operation is in progress */
  isToggling: boolean;
  /** Toggle favorite status */
  toggleFavorite: () => Promise<void>;
  /** Explicitly add to favorites */
  addFavorite: () => Promise<void>;
  /** Explicitly remove from favorites */
  removeFavorite: () => Promise<void>;
  /** Refetch the favorite status */
  refetch: () => void;
}

/**
 * Hook to check and manage favorite status between the current user and another user
 * 
 * @param currentUserId - The current authenticated user's ID
 * @param otherUserId - The other user's ID to check favorite status for
 * @returns Object containing favorite status and mutation functions
 * 
 * @example
 * ```tsx
 * const { isFavorite, toggleFavorite, isToggling } = useFavoriteStatus(myUserId, otherUserId);
 * 
 * <Button onPress={toggleFavorite} disabled={isToggling}>
 *   {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
 * </Button>
 * ```
 */
export const useFavoriteStatus = (
  currentUserId: string | undefined,
  otherUserId: string | undefined
): UseFavoriteStatusResult => {
  const queryClient = useQueryClient();
  const queryKey = ['favoriteStatus', currentUserId, otherUserId];

  // Query to check if current user has favorited the other user
  const { data: isFavorite = false, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentUserId || !otherUserId) return false;
      
      const { data, error } = await supabase
        .from('player_favorite')
        .select('id')
        .eq('player_id', currentUserId)
        .eq('favorite_player_id', otherUserId)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking favorite status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!currentUserId && !!otherUserId,
    staleTime: 30000, // 30 seconds
  });

  // Mutation to add to favorites
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !otherUserId) {
        throw new Error('Missing user IDs');
      }

      const { error } = await supabase
        .from('player_favorite')
        .insert({
          player_id: currentUserId,
          favorite_player_id: otherUserId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, true);
    },
  });

  // Mutation to remove from favorites
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !otherUserId) {
        throw new Error('Missing user IDs');
      }

      const { error } = await supabase
        .from('player_favorite')
        .delete()
        .eq('player_id', currentUserId)
        .eq('favorite_player_id', otherUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, false);
    },
  });

  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      await removeFavoriteMutation.mutateAsync();
    } else {
      await addFavoriteMutation.mutateAsync();
    }
  }, [isFavorite, addFavoriteMutation, removeFavoriteMutation]);

  const addFavorite = useCallback(async () => {
    if (!isFavorite) {
      await addFavoriteMutation.mutateAsync();
    }
  }, [isFavorite, addFavoriteMutation]);

  const removeFavorite = useCallback(async () => {
    if (isFavorite) {
      await removeFavoriteMutation.mutateAsync();
    }
  }, [isFavorite, removeFavoriteMutation]);

  return {
    isFavorite,
    isLoading,
    isToggling: addFavoriteMutation.isPending || removeFavoriteMutation.isPending,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    refetch,
  };
};
