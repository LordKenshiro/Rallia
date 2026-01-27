/**
 * Program Instructors API Routes
 *
 * GET /api/programs/[id]/instructors - Get instructors assigned to a program
 * PUT /api/programs/[id]/instructors - Assign instructors to a program
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { assignInstructors } from '@rallia/shared-services';
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

    const organization = await getSelectedOrganization(user.id);
    if (!organization) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    // Verify program belongs to organization
    const { data: program } = await supabase
      .from('program')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!program || program.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Get assigned instructors
    const { data: assignments, error } = await supabase
      .from('program_instructor')
      .select(
        `
        id,
        is_primary,
        instructor:instructor_id (
          id,
          display_name,
          email,
          avatar_url,
          is_active,
          specializations
        )
      `
      )
      .eq('program_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(assignments || []);
  } catch (error) {
    console.error('Error getting program instructors:', error);
    return NextResponse.json({ error: 'Failed to get program instructors' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    if (!member || !['admin', 'owner', 'staff'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify program belongs to organization
    const { data: program } = await supabase
      .from('program')
      .select('organization_id, status')
      .eq('id', id)
      .single();

    if (!program || program.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Don't allow editing completed/cancelled programs
    if (['completed', 'cancelled'].includes(program.status)) {
      return NextResponse.json(
        { error: 'Cannot modify instructors for completed or cancelled programs' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { instructorIds, primaryInstructorId } = body;

    if (!Array.isArray(instructorIds)) {
      return NextResponse.json({ error: 'instructorIds must be an array' }, { status: 400 });
    }

    // Verify all instructors belong to this organization
    if (instructorIds.length > 0) {
      const { data: instructors, error: instructorError } = await supabase
        .from('instructor_profile')
        .select('id')
        .eq('organization_id', organization.id)
        .in('id', instructorIds);

      if (instructorError) {
        return NextResponse.json({ error: instructorError.message }, { status: 500 });
      }

      if (!instructors || instructors.length !== instructorIds.length) {
        return NextResponse.json({ error: 'One or more instructors not found' }, { status: 400 });
      }
    }

    const result = await assignInstructors(supabase, id, instructorIds, primaryInstructorId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return updated assignments
    const { data: assignments } = await supabase
      .from('program_instructor')
      .select(
        `
        id,
        is_primary,
        instructor:instructor_id (
          id,
          display_name,
          email,
          avatar_url,
          is_active,
          specializations
        )
      `
      )
      .eq('program_id', id);

    return NextResponse.json(assignments || []);
  } catch (error) {
    console.error('Error assigning program instructors:', error);
    return NextResponse.json({ error: 'Failed to assign instructors' }, { status: 500 });
  }
}
