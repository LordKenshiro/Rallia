/**
 * Custom hook for fetching and managing user profile data
 * Uses ProfileContext to provide a single source of truth for profile state
 *
 * @param userId - Optional user ID to fetch. If not provided, fetches current authenticated user
 *                 Note: For other users' profiles, consider using refetchForUser or a separate hook
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

// Re-export from ProfileContext for backward compatibility
export { useProfile, ProfileProvider } from './ProfileContext';
export type { ProfileContextType } from './ProfileContext';
