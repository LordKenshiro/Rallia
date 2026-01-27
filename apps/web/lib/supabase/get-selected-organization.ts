import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const SELECTED_ORG_COOKIE_NAME = 'selected-org-id';

export interface SelectedOrganization {
  id: string;
  name: string;
  slug: string;
  nature: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  type: string | null;
  description: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get the selected organization for the current user from server-side.
 * Uses a cookie to determine which organization is selected when user has multiple memberships.
 * Falls back to the first organization if no selection is stored.
 *
 * @param userId - The authenticated user's ID
 * @returns The selected organization or null if user has no memberships
 */
export async function getSelectedOrganization(
  userId: string
): Promise<SelectedOrganization | null> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // Fetch all organization memberships for the user
  const { data: memberships, error } = await supabase
    .from('organization_member')
    .select(
      `
      organization (
        id,
        name,
        nature,
        email,
        phone,
        slug,
        address,
        city,
        country,
        postal_code,
        type,
        description,
        website,
        is_active,
        created_at
      )
    `
    )
    .eq('user_id', userId)
    .is('left_at', null);

  if (error) {
    console.error('Error fetching organization memberships:', error);
    return null;
  }

  if (!memberships || memberships.length === 0) {
    return null;
  }

  // Extract organizations from memberships
  const organizations = memberships
    .map(m => m.organization as SelectedOrganization | null)
    .filter((org): org is SelectedOrganization => org !== null);

  if (organizations.length === 0) {
    return null;
  }

  // Check for saved selection in cookie
  const savedOrgId = cookieStore.get(SELECTED_ORG_COOKIE_NAME)?.value;

  if (savedOrgId) {
    const selectedOrg = organizations.find(org => org.id === savedOrgId);
    if (selectedOrg) {
      return selectedOrg;
    }
  }

  // Default to first organization
  return organizations[0];
}
