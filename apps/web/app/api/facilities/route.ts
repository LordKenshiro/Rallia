/**
 * Facilities API Route
 *
 * GET /api/facilities - List facilities for the user's organization
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await getSelectedOrganization(user.id);
    if (!organization) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const { data: facilities, error } = await supabase
      .from('facility')
      .select('id, name, city, address')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching facilities:', error);
      return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
    }

    return NextResponse.json({ facilities: facilities || [] });
  } catch (error) {
    console.error('Facilities fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching facilities' },
      { status: 500 }
    );
  }
}
