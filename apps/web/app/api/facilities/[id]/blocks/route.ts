/**
 * API routes for facility availability blocks
 *
 * POST /api/facilities/[id]/blocks - Create a new block with booking conflict validation
 * GET /api/facilities/[id]/blocks/check-conflicts - Check for booking conflicts (query params)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface ConflictingBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  court_name: string | null;
  court_number: number | null;
  player_name: string | null;
}

interface OverlappingBlock {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  block_type: string;
  reason: string | null;
  court_name: string | null;
  court_number: number | null;
}

interface BlockCreateRequest {
  court_id: string | null;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  block_type: 'manual' | 'maintenance' | 'holiday' | 'weather' | 'private_event';
  reason: string | null;
}

/**
 * Check for booking conflicts with a proposed block
 */
async function checkBookingConflicts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  facilityId: string,
  params: {
    courtId: string | null;
    blockDate: string;
    startTime: string | null;
    endTime: string | null;
  }
): Promise<ConflictingBooking[]> {
  try {
    // Get the court IDs to check
    let courtIds: string[] = [];

    if (params.courtId) {
      // Blocking a specific court
      courtIds = [params.courtId];
    } else {
      // Blocking all courts - get all court IDs for this facility
      const { data: courts, error: courtsError } = await supabase
        .from('court')
        .select('id')
        .eq('facility_id', facilityId);

      if (courtsError) {
        console.error('Error fetching facility courts:', courtsError);
        throw new Error('Failed to fetch facility courts');
      }

      if (!courts || courts.length === 0) {
        // No courts in facility, no conflicts possible
        return [];
      }

      courtIds = courts.map(c => c.id);
    }

    // Query bookings for these courts on the specified date
    // Note: player_id references the player table which extends profile
    // We need to join through player to get the profile data
    const { data: bookings, error: bookingsError } = await supabase
      .from('booking')
      .select(
        `
        id,
        booking_date,
        start_time,
        end_time,
        status,
        player_id,
        court:court_id (
          id,
          name,
          court_number
        )
      `
      )
      .in('court_id', courtIds)
      .eq('booking_date', params.blockDate)
      .neq('status', 'cancelled');

    if (bookingsError) {
      console.error('Error checking booking conflicts:', bookingsError);
      throw new Error('Failed to check for booking conflicts');
    }

    if (!bookings || bookings.length === 0) {
      return [];
    }

    // Fetch player names from profile table for all player_ids
    const playerIds = bookings.map(b => b.player_id).filter((id): id is string => id !== null);

    let playerNames: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profile')
        .select('id, first_name, last_name')
        .in('id', playerIds);

      if (profiles) {
        playerNames = profiles.reduce(
          (acc, p) => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ');
            acc[p.id] = fullName || '';
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    // Helper to map booking to conflict
    const mapBookingToConflict = (b: (typeof bookings)[0]): ConflictingBooking => {
      const court = b.court as { name: string | null; court_number: number | null } | null;
      return {
        id: b.id,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status || 'unknown',
        court_name: court?.name || null,
        court_number: court?.court_number || null,
        player_name: b.player_id ? playerNames[b.player_id] || null : null,
      };
    };

    // If it's an all-day block (no start/end time), all bookings conflict
    if (!params.startTime || !params.endTime) {
      return bookings.map(mapBookingToConflict);
    }

    // Check for time overlap
    const blockStart = params.startTime;
    const blockEnd = params.endTime;

    const conflicts = bookings.filter(booking => {
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;

      // Check if times overlap
      // Two time ranges overlap if: start1 < end2 AND start2 < end1
      return bookingStart < blockEnd && blockStart < bookingEnd;
    });

    return conflicts.map(mapBookingToConflict);
  } catch (error) {
    console.error('Error in checkBookingConflicts:', error);
    throw error;
  }
}

/**
 * Check for overlapping blocks with a proposed block
 */
async function checkOverlappingBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  facilityId: string,
  params: {
    courtId: string | null;
    blockDate: string;
    startTime: string | null;
    endTime: string | null;
  }
): Promise<OverlappingBlock[]> {
  try {
    // Query existing blocks for this facility and date
    const query = supabase
      .from('availability_block')
      .select(
        `
        id,
        block_date,
        start_time,
        end_time,
        block_type,
        reason,
        court_id,
        court:court_id (
          id,
          name,
          court_number
        )
      `
      )
      .eq('facility_id', facilityId)
      .eq('block_date', params.blockDate);

    const { data: existingBlocks, error: blocksError } = await query;

    if (blocksError) {
      console.error('Error checking overlapping blocks:', blocksError);
      throw new Error('Failed to check for overlapping blocks');
    }

    if (!existingBlocks || existingBlocks.length === 0) {
      return [];
    }

    // Filter blocks that would overlap with the new block
    const overlapping = existingBlocks.filter(block => {
      // Check court overlap:
      // - If new block is for all courts (courtId is null), it overlaps with any block
      // - If new block is for specific court, it overlaps with blocks for that court OR all-court blocks
      // - If existing block is for all courts (court_id is null), it overlaps with any new block
      const courtOverlaps =
        params.courtId === null || block.court_id === null || params.courtId === block.court_id;

      if (!courtOverlaps) {
        return false;
      }

      // Check time overlap:
      // - If either block is all-day (no start/end time), they overlap
      // - Otherwise, check for time range overlap
      const newIsAllDay = !params.startTime || !params.endTime;
      const existingIsAllDay = !block.start_time || !block.end_time;

      if (newIsAllDay || existingIsAllDay) {
        return true;
      }

      // Both have specific times - check for overlap
      // Two time ranges overlap if: start1 < end2 AND start2 < end1
      return block.start_time! < params.endTime! && params.startTime! < block.end_time!;
    });

    return overlapping.map(block => {
      const court = block.court as { name: string | null; court_number: number | null } | null;
      return {
        id: block.id,
        block_date: block.block_date,
        start_time: block.start_time,
        end_time: block.end_time,
        block_type: block.block_type,
        reason: block.reason,
        court_name: court?.name || null,
        court_number: court?.court_number || null,
      };
    });
  } catch (error) {
    console.error('Error in checkOverlappingBlocks:', error);
    throw error;
  }
}

/**
 * POST /api/facilities/[id]/blocks
 * Create a new availability block with booking conflict validation
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: facilityId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has permission to manage this facility
    const { data: facility, error: facilityError } = await supabase
      .from('facility')
      .select('id, organization_id')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Check organization membership
    const { data: membership } = await supabase
      .from('organization_member')
      .select('role')
      .eq('organization_id', facility.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'staff'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage blocks for this facility' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: BlockCreateRequest = await request.json();

    if (!body.block_date) {
      return NextResponse.json({ error: 'Block date is required' }, { status: 400 });
    }

    // Check for overlapping blocks first
    const overlappingBlocks = await checkOverlappingBlocks(supabase, facilityId, {
      courtId: body.court_id,
      blockDate: body.block_date,
      startTime: body.start_time,
      endTime: body.end_time,
    });

    if (overlappingBlocks.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot create block: overlapping blocks exist',
          code: 'BLOCK_OVERLAP',
          overlappingBlocks,
        },
        { status: 409 }
      );
    }

    // Check for conflicting bookings
    const conflicts = await checkBookingConflicts(supabase, facilityId, {
      courtId: body.court_id,
      blockDate: body.block_date,
      startTime: body.start_time,
      endTime: body.end_time,
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot create block: conflicting bookings exist',
          code: 'BOOKING_CONFLICT',
          conflicts,
        },
        { status: 409 }
      );
    }

    // Create the block
    const { data: block, error: insertError } = await supabase
      .from('availability_block')
      .insert({
        facility_id: facilityId,
        court_id: body.court_id,
        block_date: body.block_date,
        start_time: body.start_time,
        end_time: body.end_time,
        block_type: body.block_type,
        reason: body.reason,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating block:', insertError);
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      blockId: block.id,
    });
  } catch (error) {
    console.error('Error in block creation:', error);
    const message = error instanceof Error ? error.message : 'Failed to create block';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/facilities/[id]/blocks
 * Get all blocks for a facility
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: facilityId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch blocks for this facility
    const { data: blocks, error: blocksError } = await supabase
      .from('availability_block')
      .select(
        `
        id,
        court_id,
        facility_id,
        block_date,
        start_time,
        end_time,
        reason,
        block_type,
        created_at,
        court:court_id (id, name, court_number)
      `
      )
      .eq('facility_id', facilityId)
      .order('block_date', { ascending: false })
      .order('start_time');

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch blocks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/facilities/[id]/blocks
 * Delete a block (block ID passed as query param)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the block belongs to this facility
    const { data: block, error: blockError } = await supabase
      .from('availability_block')
      .select('id, facility_id')
      .eq('id', blockId)
      .eq('facility_id', facilityId)
      .single();

    if (blockError || !block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Delete the block
    const { error: deleteError } = await supabase
      .from('availability_block')
      .delete()
      .eq('id', blockId);

    if (deleteError) {
      console.error('Error deleting block:', deleteError);
      return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting block:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete block';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
