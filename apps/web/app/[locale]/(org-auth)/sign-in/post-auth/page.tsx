import { hasOrganizationMembership } from '@/lib/supabase/check-organization';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PostAuthPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to sign-in
  if (authError || !user) {
    redirect('/sign-in');
  }

  // Check if user has organization membership
  const hasOrg = await hasOrganizationMembership(user.id);

  // Redirect based on organization membership
  if (hasOrg) {
    redirect('/dashboard');
  } else {
    redirect('/onboarding');
  }
}
