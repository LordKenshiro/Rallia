import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@rallia/shared-services';
import type { Profile } from '@rallia/shared-types';

/**
 * Custom hook for fetching and managing user profile data
 * Eliminates duplicate profile fetching code across components
 * 
 * @param userId - Optional user ID to fetch. If not provided, fetches current authenticated user
 * @returns Object containing profile data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { profile, loading, error, refetch } = useProfile();
 * 
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error.message} />;
 * 
 * return <Text>{profile?.full_name}</Text>;
 * ```
 */
export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user if no userId provided
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch profile from database
      const { data, error: profileError } = await supabase
        .from('profile')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err as Error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { 
    profile, 
    loading, 
    error, 
    refetch: fetchProfile 
  };
};
