/**
 * Programs API Routes
 *
 * GET /api/programs - List programs for organization
 * POST /api/programs - Create a new program
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { listPrograms, createProgram } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      organizationId: organization.id,
      type: searchParams.get('type') as 'program' | 'lesson' | undefined,
      status: searchParams.get('status') as
        | 'draft'
        | 'published'
        | 'cancelled'
        | 'completed'
        | undefined,
      facilityId: searchParams.get('facilityId') || undefined,
      sportId: searchParams.get('sportId') || undefined,
      startDateFrom: searchParams.get('startDateFrom') || undefined,
      startDateTo: searchParams.get('startDateTo') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const result = await listPrograms(supabase, filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing programs:', error);
    return NextResponse.json({ error: 'Failed to list programs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Check user has permission to create programs
    const { data: member } = await supabase
      .from('organization_member')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['admin', 'owner', 'staff'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    const result = await createProgram(supabase, {
      organizationId: organization.id,
      facilityId: body.facilityId,
      sportId: body.sportId,
      type: body.type || 'program',
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      registrationOpensAt: body.registrationOpensAt,
      registrationDeadline: body.registrationDeadline,
      minParticipants: body.minParticipants,
      maxParticipants: body.maxParticipants,
      priceCents: body.priceCents,
      currency: body.currency,
      allowInstallments: body.allowInstallments,
      installmentCount: body.installmentCount,
      depositCents: body.depositCents,
      autoBlockCourts: body.autoBlockCourts,
      waitlistEnabled: body.waitlistEnabled,
      waitlistLimit: body.waitlistLimit,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      skillLevelMin: body.skillLevelMin,
      skillLevelMax: body.skillLevelMax,
      cancellationPolicy: body.cancellationPolicy,
      coverImageUrl: body.coverImageUrl,
      instructorIds: body.instructorIds,
      sessions: body.sessions,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 });
  }
}
