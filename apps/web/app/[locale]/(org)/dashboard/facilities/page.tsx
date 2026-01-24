import { FacilitiesList } from '@/components/facilities-list';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Facilities - Rallia',
    description: 'Manage your organization facilities.',
  };
}

export default async function FacilitiesPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', user!.id)
    .is('left_at', null)
    .single();

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    );
  }

  // Fetch facilities with court details including availability status
  const { data: facilities, error } = await supabase
    .from('facility')
    .select(
      `
      id,
      name,
      address,
      city,
      is_active,
      created_at,
      court (
        id,
        availability_status,
        is_active
      )
    `
    )
    .eq('organization_id', membership.organization_id)
    .is('archived_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching facilities:', error);
  }

  return (
    <FacilitiesList facilities={facilities ?? []} organizationId={membership.organization_id} />
  );
}
