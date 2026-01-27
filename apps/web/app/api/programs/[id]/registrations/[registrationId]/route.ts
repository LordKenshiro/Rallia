/**
 * Individual Program Registration API Routes
 *
 * PATCH /api/programs/[id]/registrations/[registrationId] - Update registration status
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { updateRegistrationStatus } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';
import type { RegistrationStatusEnum } from '@rallia/shared-types';

type RouteContext = { params: Promise<{ id: string; registrationId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: programId, registrationId } = await context.params;
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
      .select('organization_id')
      .eq('id', programId)
      .single();

    if (!program || program.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Verify registration belongs to program
    const { data: registration } = await supabase
      .from('program_registration')
      .select('id, program_id')
      .eq('id', registrationId)
      .single();

    if (!registration || registration.program_id !== programId) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses: RegistrationStatusEnum[] = [
      'pending',
      'confirmed',
      'cancelled',
      'refunded',
    ];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await updateRegistrationStatus(supabase, registrationId, status, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
  }
}
