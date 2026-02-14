/**
 * Program Waitlist API Routes
 *
 * GET /api/programs/[id]/waitlist - List waitlist entries
 * POST /api/programs/[id]/waitlist - Add to waitlist
 * PATCH /api/programs/[id]/waitlist - Promote a waitlist entry
 * DELETE /api/programs/[id]/waitlist - Remove from waitlist
 */

import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import {
  listWaitlist,
  addToWaitlist,
  removePlayerFromWaitlist,
  promoteFromWaitlist,
} from '@rallia/shared-services';
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

    // Verify user is org staff
    const { data: member } = await supabase
      .from('organization_member')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['admin', 'owner', 'staff'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const result = await listWaitlist(supabase, id, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing waitlist:', error);
    return NextResponse.json({ error: 'Failed to list waitlist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: programId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const playerId = body.playerId || user.id;

    const result = await addToWaitlist(supabase, {
      programId,
      playerId,
      addedBy: user.id,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json({ error: 'Failed to add to waitlist' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: programId } = await context.params;
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

    // Verify user is org staff
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

    const body = await request.json();
    const { waitlistId, action } = body;

    if (!waitlistId) {
      return NextResponse.json({ error: 'waitlistId is required' }, { status: 400 });
    }

    if (action === 'promote') {
      const result = await promoteFromWaitlist(supabase, waitlistId, body.claimHours);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating waitlist:', error);
    return NextResponse.json({ error: 'Failed to update waitlist' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: programId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId') || user.id;

    const result = await removePlayerFromWaitlist(supabase, programId, playerId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from waitlist:', error);
    return NextResponse.json({ error: 'Failed to remove from waitlist' }, { status: 500 });
  }
}
