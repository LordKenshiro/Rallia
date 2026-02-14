/**
 * Facility Courts API Route
 *
 * GET /api/facilities/[id]/courts - List courts for a facility
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's selected organization
    const organization = await getSelectedOrganization(user.id);
    if (!organization) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    // Verify facility belongs to user's organization
    const { data: facility } = await supabase
      .from('facility')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', organization.id)
      .single();

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Fetch active courts for the facility
    const { data: courts, error: courtsError } = await supabase
      .from('court')
      .select('id, name, court_number, surface_type, indoor, lighting')
      .eq('facility_id', id)
      .eq('is_active', true)
      .order('court_number', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (courtsError) {
      console.error('Error fetching courts:', courtsError);
      return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 });
    }

    return NextResponse.json({ courts: courts || [] });
  } catch (error) {
    console.error('Error fetching facility courts:', error);
    return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 });
  }
}
