/**
 * Program Publish API Route
 *
 * POST /api/programs/[id]/publish - Publish a draft program
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { publishProgram, blockCourtsForProgram } from '@rallia/shared-services';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
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
      .select('organization_id, auto_block_courts')
      .eq('id', id)
      .single();

    if (!program || program.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Publish the program
    const result = await publishProgram(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Block courts for sessions if auto_block_courts is enabled
    let courtBlockingResult = null;
    if (program.auto_block_courts) {
      courtBlockingResult = await blockCourtsForProgram(supabase, id);
    }

    return NextResponse.json({
      program: result.data,
      courtBlocking: courtBlockingResult,
    });
  } catch (error) {
    console.error('Error publishing program:', error);
    return NextResponse.json({ error: 'Failed to publish program' }, { status: 500 });
  }
}
