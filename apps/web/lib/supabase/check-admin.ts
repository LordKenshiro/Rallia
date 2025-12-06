import { createClient } from '@/lib/supabase/server';

/**
 * Check if a user is an admin (Rallia employee/manager)
 *
 * Checks the `admins` table to see if the user has an admin role.
 * The `admins` table references `profiles.id`, which in turn references `auth_users.id`.
 *
 * Schema:
 * - auth_users.id (Supabase auth user ID)
 * - profiles.id (references auth_users.id)
 * - admins.id (references profiles.id)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check if user exists in the admins table
  // The userId is the auth_users.id, which matches profiles.id
  // and admins.id references profiles.id
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, role')
    .eq('id', userId)
    .single();

  // If there's an error or no admin record found, user is not a platform admin
  if (error || !admin) {
    return false;
  }

  // User has an admin record, so they are a platform admin
  return true;
}

/**
 * Get the admin role for a user
 *
 * Returns the admin role enum value if the user is an admin, null otherwise.
 */
export async function getAdminRole(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: admin, error } = await supabase
    .from('admins')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !admin) {
    return null;
  }

  return admin.role;
}

/**
 * Check if a user is a super admin
 *
 * Returns true if the user is a super admin, false otherwise.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: admin, error } = await supabase
    .from('admins')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !admin) {
    return false;
  }

  return admin.role === 'super_admin';
}
