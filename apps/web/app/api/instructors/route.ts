/**
 * Instructors API Routes
 *
 * GET /api/instructors - List instructors for organization
 * POST /api/instructors - Create a new instructor
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import {
  listInstructors,
  createInstructor,
  createInstructorFromMember,
} from '@rallia/shared-services';
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
    const options = {
      isActive:
        searchParams.get('isActive') === 'true'
          ? true
          : searchParams.get('isActive') === 'false'
            ? false
            : undefined,
      isExternal:
        searchParams.get('isExternal') === 'true'
          ? true
          : searchParams.get('isExternal') === 'false'
            ? false
            : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const result = await listInstructors(supabase, organization.id, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing instructors:', error);
    return NextResponse.json({ error: 'Failed to list instructors' }, { status: 500 });
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

    // Check user has permission
    const { data: member } = await supabase
      .from('organization_member')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // If creating from org member
    if (body.organizationMemberId && !body.displayName) {
      const result = await createInstructorFromMember(
        supabase,
        organization.id,
        body.organizationMemberId
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data, { status: 201 });
    }

    // Create new instructor
    const result = await createInstructor(supabase, {
      organizationId: organization.id,
      organizationMemberId: body.organizationMemberId,
      displayName: body.displayName,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      email: body.email,
      phone: body.phone,
      hourlyRateCents: body.hourlyRateCents,
      currency: body.currency,
      certifications: body.certifications,
      specializations: body.specializations,
      isExternal: body.isExternal,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating instructor:', error);
    return NextResponse.json({ error: 'Failed to create instructor' }, { status: 500 });
  }
}
