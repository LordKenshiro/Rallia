/**
 * Instructor Detail API Routes
 *
 * GET /api/instructors/[id] - Get instructor details
 * PATCH /api/instructors/[id] - Update instructor
 * DELETE /api/instructors/[id] - Delete instructor
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { getInstructor, updateInstructor, deleteInstructor } from '@rallia/shared-services';
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

    const result = await getInstructor(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error getting instructor:', error);
    return NextResponse.json({ error: 'Failed to get instructor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify instructor belongs to organization
    const { data: instructor } = await supabase
      .from('instructor_profile')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!instructor || instructor.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const body = await request.json();

    const result = await updateInstructor(supabase, id, {
      displayName: body.displayName,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      email: body.email,
      phone: body.phone,
      hourlyRateCents: body.hourlyRateCents,
      currency: body.currency,
      certifications: body.certifications,
      specializations: body.specializations,
      isActive: body.isActive,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error updating instructor:', error);
    return NextResponse.json({ error: 'Failed to update instructor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify instructor belongs to organization
    const { data: instructor } = await supabase
      .from('instructor_profile')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!instructor || instructor.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const result = await deleteInstructor(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting instructor:', error);
    return NextResponse.json({ error: 'Failed to delete instructor' }, { status: 500 });
  }
}
