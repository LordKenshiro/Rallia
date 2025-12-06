import { createClient } from '@/lib/supabase/server';

/**
 * Check if a user is linked to at least one active organization
 * @param userId - The user's profile ID (auth.users.id)
 * @returns true if user has at least one organization, false otherwise
 */
export async function hasOrganizationMembership(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .is('left_at', null) // Only count active memberships
    .limit(1);

  if (error) {
    console.error('Error checking organization membership:', error);
    // Default to false on error, will redirect to onboarding
    return false;
  }

  return (data?.length ?? 0) > 0;
}
