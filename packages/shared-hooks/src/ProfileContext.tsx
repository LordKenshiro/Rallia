/**
 * Profile Context - Global profile state management
 *
 * This context provides a single source of truth for the current user's profile.
 * All components using useProfile() will share the same profile state, ensuring
 * that when one component refetches the profile, all consumers are updated.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '@rallia/shared-services';
import type { Profile } from '@rallia/shared-types';

// =============================================================================
// TYPES
// =============================================================================

export interface ProfileContextType {
  /** Current user's profile data */
  profile: Profile | null;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Refetch the profile data */
  refetch: () => Promise<void>;

  /** Refetch profile for a specific user ID */
  refetchForUser: (userId: string) => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface ProfileProviderProps {
  children: ReactNode;
  /** Optional user ID to fetch. If not provided, fetches current authenticated user */
  userId?: string;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children, userId }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(
    async (targetUserId?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Get current authenticated user if no userId provided
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const finalUserId = targetUserId || userId || user?.id;

        if (!finalUserId) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Fetch profile from database
        // Use maybeSingle() to gracefully handle case where profile doesn't exist yet
        const { data, error: profileError } = await supabase
          .from('profile')
          .select('*')
          .eq('id', finalUserId)
          .maybeSingle();

        if (profileError) {
          throw new Error(profileError.message);
        }

        // data will be null if no profile exists (new user)
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err as Error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Refetch current user's profile
  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Refetch profile for a specific user
  const refetchForUser = useCallback(
    async (targetUserId: string) => {
      await fetchProfile(targetUserId);
    },
    [fetchProfile]
  );

  // Initial fetch and refetch when userId prop changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Listen for auth state changes and refetch profile
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && (!userId || userId === session.user.id)) {
          await fetchProfile();
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchProfile]);

  const contextValue: ProfileContextType = {
    profile,
    loading,
    error,
    refetch,
    refetchForUser,
  };

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the profile context.
 * Returns the current user's profile data, loading state, error, and refetch function.
 *
 * @param userId - Optional user ID parameter (kept for backward compatibility).
 *                 Currently, the context only manages the current authenticated user's profile.
 *                 For fetching other users' profiles, use refetchForUser or create a separate hook.
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
export const useProfile = (userId?: string): ProfileContextType => {
  const context = useContext(ProfileContext);

  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  // Note: userId parameter is kept for backward compatibility but currently
  // the context only manages the current user's profile. If you need to fetch
  // another user's profile, use refetchForUser or create a separate hook.
  if (userId && context.profile?.id !== userId) {
    console.warn(
      "useProfile called with userId parameter. The context only manages the current user's profile. Use refetchForUser if you need to fetch another user's profile."
    );
  }

  return context;
};

export default ProfileContext;
