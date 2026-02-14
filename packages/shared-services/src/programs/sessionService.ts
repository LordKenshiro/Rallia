/**
 * Session Service
 *
 * Manages program sessions and court blocking.
 * Supports multiple courts per session via program_session_court junction table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgramSession } from '@rallia/shared-types';
import { normalizeTimeForComparison } from '../bookings/timeUtils';
import type {
  CreateSessionParams,
  UpdateSessionParams,
  SessionWithDetails,
  ServiceResult,
  BlockCourtParams,
  BlockCourtsResult,
} from './types';

/**
 * Create a session for a program with optional court assignments
 */
export async function createSession(
  supabase: SupabaseClient,
  programId: string,
  params: CreateSessionParams
): Promise<ServiceResult<SessionWithDetails>> {
  // Get program to validate facility and get next session number
  const { data: program, error: programError } = await supabase
    .from('program')
    .select('id, organization_id, facility_id, auto_block_courts')
    .eq('id', programId)
    .single();

  if (programError || !program) {
    return { success: false, error: 'Program not found' };
  }

  // Normalize time format to include seconds if not present
  const startTime = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
  const endTime = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

  // Check for overlapping sessions on the same date
  const { data: overlappingSessions, error: overlapError } = await supabase
    .from('program_session')
    .select('id, date, start_time, end_time')
    .eq('program_id', programId)
    .eq('date', params.date)
    .eq('is_cancelled', false);

  if (overlapError) {
    return {
      success: false,
      error: `Failed to check for overlapping sessions: ${overlapError.message}`,
    };
  }

  // Check if any existing session overlaps with the new one
  const overlapping = overlappingSessions?.find(session => {
    const existingStart = session.start_time;
    const existingEnd = session.end_time;
    // Sessions overlap if: new start < existing end AND new end > existing start
    return startTime < existingEnd && endTime > existingStart;
  });

  if (overlapping) {
    return {
      success: false,
      error: `Session overlaps with existing session on ${overlapping.date} (${overlapping.start_time.slice(0, 5)} - ${overlapping.end_time.slice(0, 5)})`,
    };
  }

  // Validate courts belong to the program's facility if courtIds provided
  if (params.courtIds && params.courtIds.length > 0) {
    if (!program.facility_id) {
      return {
        success: false,
        error: 'Program must have a facility assigned before adding courts to sessions',
      };
    }

    const { data: courts, error: courtsError } = await supabase
      .from('court')
      .select('id, facility_id')
      .in('id', params.courtIds);

    if (courtsError) {
      return { success: false, error: `Failed to validate courts: ${courtsError.message}` };
    }

    const invalidCourts = courts?.filter(c => c.facility_id !== program.facility_id) || [];
    if (invalidCourts.length > 0) {
      return { success: false, error: "All courts must belong to the program's facility" };
    }
  }

  // Create the session
  const { data: session, error: sessionError } = await supabase
    .from('program_session')
    .insert({
      program_id: programId,
      date: params.date,
      start_time: startTime,
      end_time: endTime,
      location_override: params.locationOverride || null,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (sessionError) {
    return { success: false, error: sessionError.message };
  }

  // Add court assignments if provided
  if (params.courtIds && params.courtIds.length > 0) {
    const courtAssignments = params.courtIds.map(courtId => ({
      session_id: session.id,
      court_id: courtId,
    }));

    const { data: insertedCourts, error: courtError } = await supabase
      .from('program_session_court')
      .insert(courtAssignments)
      .select('id, court_id');

    if (courtError) {
      // Rollback session creation
      await supabase.from('program_session').delete().eq('id', session.id);
      return { success: false, error: `Failed to assign courts: ${courtError.message}` };
    }

    // Auto-block courts if enabled on the program
    if (program.auto_block_courts && insertedCourts && insertedCourts.length > 0) {
      for (const sessionCourt of insertedCourts) {
        const blockResult = await blockCourtForSession(supabase, {
          programId: program.id,
          sessionId: session.id,
          sessionCourtId: sessionCourt.id,
          courtId: sessionCourt.court_id,
          date: params.date,
          startTime: startTime,
          endTime: endTime,
          organizationId: program.organization_id,
        });

        if (!blockResult.success) {
          // Log warning but don't fail - court can be blocked later
          console.warn(
            `Failed to auto-block court ${sessionCourt.court_id} for session ${session.id}: ${blockResult.error}`
          );
        }
      }
    }
  }

  // Return session with details
  return getSession(supabase, session.id);
}

/**
 * Get session by ID with court details
 */
export async function getSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ServiceResult<SessionWithDetails>> {
  const { data, error } = await supabase
    .from('program_session')
    .select(
      `
      *,
      program:program_id (
        facility_id,
        facility:facility_id (
          id,
          name
        )
      ),
      courts:program_session_court (
        id,
        court_id,
        booking_id,
        court:court_id (
          id,
          name,
          court_number
        )
      )
    `
    )
    .eq('id', sessionId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Transform the nested data
  const programData = Array.isArray(data.program) ? data.program[0] : data.program;
  const result: SessionWithDetails = {
    ...data,
    facility: programData?.facility || null,
    courts: data.courts || [],
  };

  return { success: true, data: result };
}

/**
 * List sessions for a program with court details
 * Sessions are sorted chronologically
 */
export async function listSessions(
  supabase: SupabaseClient,
  programId: string
): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('program_session')
    .select(
      `
      *,
      program:program_id (
        facility_id,
        facility:facility_id (
          id,
          name
        )
      ),
      courts:program_session_court (
        id,
        court_id,
        booking_id,
        court:court_id (
          id,
          name,
          court_number
        )
      )
    `
    )
    .eq('program_id', programId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return [];
  }

  // Transform the nested data
  const sessions = (data || []).map(session => {
    const programData = Array.isArray(session.program) ? session.program[0] : session.program;
    return {
      ...session,
      facility: programData?.facility || null,
      courts: session.courts || [],
    };
  }) as SessionWithDetails[];

  return sessions;
}

/**
 * Update a session (including court assignments)
 */
export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  params: UpdateSessionParams
): Promise<ServiceResult<SessionWithDetails>> {
  // Get session with program info
  const { data: session, error: sessionError } = await supabase
    .from('program_session')
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      program:program_id (
        id,
        facility_id,
        organization_id,
        auto_block_courts
      )
    `
    )
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: 'Session not found' };
  }

  const programData = Array.isArray(session.program) ? session.program[0] : session.program;
  const program = programData as {
    id: string;
    facility_id: string | null;
    organization_id: string;
    auto_block_courts: boolean;
  } | null;

  // Update session fields
  const updateData: Record<string, unknown> = {};
  if (params.date !== undefined) updateData.date = params.date;
  if (params.startTime !== undefined) updateData.start_time = params.startTime;
  if (params.endTime !== undefined) updateData.end_time = params.endTime;
  if (params.locationOverride !== undefined) updateData.location_override = params.locationOverride;
  if (params.notes !== undefined) updateData.notes = params.notes;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('program_session')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  // Update court assignments if provided
  if (params.courtIds !== undefined) {
    // Validate courts belong to program's facility
    if (params.courtIds.length > 0) {
      if (!program?.facility_id) {
        return {
          success: false,
          error: 'Program must have a facility assigned before adding courts to sessions',
        };
      }

      const { data: courts } = await supabase
        .from('court')
        .select('id, facility_id')
        .in('id', params.courtIds);

      const invalidCourts = courts?.filter(c => c.facility_id !== program.facility_id) || [];
      if (invalidCourts.length > 0) {
        return { success: false, error: "All courts must belong to the program's facility" };
      }
    }

    // Get current court assignments to release bookings
    const { data: currentCourts } = await supabase
      .from('program_session_court')
      .select('id, court_id, booking_id')
      .eq('session_id', sessionId);

    // Release bookings for courts being removed
    const courtIdsBeingRemoved = (currentCourts || [])
      .filter(c => !params.courtIds!.includes(c.court_id))
      .filter(c => c.booking_id)
      .map(c => c.booking_id as string);

    if (courtIdsBeingRemoved.length > 0) {
      await supabase
        .from('booking')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Court removed from session',
        })
        .in('id', courtIdsBeingRemoved);
    }

    // Delete all current court assignments
    await supabase.from('program_session_court').delete().eq('session_id', sessionId);

    // Insert new court assignments
    if (params.courtIds.length > 0) {
      const courtAssignments = params.courtIds.map(courtId => ({
        session_id: sessionId,
        court_id: courtId,
      }));

      const { data: insertedCourts, error: courtError } = await supabase
        .from('program_session_court')
        .insert(courtAssignments)
        .select('id, court_id');

      if (courtError) {
        return { success: false, error: `Failed to assign courts: ${courtError.message}` };
      }

      // Auto-block courts if enabled on the program
      if (program?.auto_block_courts && insertedCourts && insertedCourts.length > 0) {
        // Use updated values if provided, otherwise use existing session values
        const effectiveDate = params.date ?? session.date;
        const effectiveStartTime = params.startTime ?? session.start_time;
        const effectiveEndTime = params.endTime ?? session.end_time;

        for (const sessionCourt of insertedCourts) {
          const blockResult = await blockCourtForSession(supabase, {
            programId: program.id,
            sessionId: sessionId,
            sessionCourtId: sessionCourt.id,
            courtId: sessionCourt.court_id,
            date: effectiveDate,
            startTime: effectiveStartTime,
            endTime: effectiveEndTime,
            organizationId: program.organization_id,
          });

          if (!blockResult.success) {
            // Log warning but don't fail - court can be blocked later
            console.warn(
              `Failed to auto-block court ${sessionCourt.court_id} for session ${sessionId}: ${blockResult.error}`
            );
          }
        }
      }
    }
  }

  return getSession(supabase, sessionId);
}

/**
 * Cancel a session and release all court bookings
 */
export async function cancelSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ServiceResult<ProgramSession>> {
  // Get session courts with bookings
  const { data: sessionCourts } = await supabase
    .from('program_session_court')
    .select('id, booking_id')
    .eq('session_id', sessionId);

  // Release all court bookings
  const bookingIds = (sessionCourts || [])
    .filter(sc => sc.booking_id)
    .map(sc => sc.booking_id as string);

  if (bookingIds.length > 0) {
    await supabase
      .from('booking')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Program session cancelled',
      })
      .in('id', bookingIds);

    // Clear booking references
    await supabase
      .from('program_session_court')
      .update({ booking_id: null })
      .eq('session_id', sessionId);
  }

  // Mark session as cancelled
  const { data, error } = await supabase
    .from('program_session')
    .update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a session (only if program is draft)
 */
export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ServiceResult<void>> {
  // Check if program is draft
  const { data: session } = await supabase
    .from('program_session')
    .select(
      `
      id,
      program:program_id (
        status
      )
    `
    )
    .eq('id', sessionId)
    .single();

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const programData = Array.isArray(session.program) ? session.program[0] : session.program;
  const program = programData as { status: string } | null;
  if (program?.status !== 'draft') {
    return { success: false, error: 'Can only delete sessions from draft programs' };
  }

  // Get and release court bookings
  const { data: sessionCourts } = await supabase
    .from('program_session_court')
    .select('booking_id')
    .eq('session_id', sessionId);

  const bookingIds = (sessionCourts || [])
    .filter(sc => sc.booking_id)
    .map(sc => sc.booking_id as string);

  if (bookingIds.length > 0) {
    await supabase.from('booking').delete().in('id', bookingIds);
  }

  // Delete session (cascade will delete program_session_court entries)
  const { error } = await supabase.from('program_session').delete().eq('id', sessionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk create sessions for a program
 */
export async function bulkCreateSessions(
  supabase: SupabaseClient,
  programId: string,
  sessions: CreateSessionParams[]
): Promise<ServiceResult<ProgramSession[]>> {
  // Get program to check auto_block_courts setting
  const { data: program, error: programError } = await supabase
    .from('program')
    .select('id, organization_id, auto_block_courts')
    .eq('id', programId)
    .single();

  if (programError || !program) {
    return { success: false, error: 'Program not found' };
  }

  // Normalize times for all sessions
  const normalizedSessions = sessions.map(session => ({
    ...session,
    startTime: session.startTime.length === 5 ? `${session.startTime}:00` : session.startTime,
    endTime: session.endTime.length === 5 ? `${session.endTime}:00` : session.endTime,
  }));

  // Check for overlaps among the new sessions themselves
  for (let i = 0; i < normalizedSessions.length; i++) {
    for (let j = i + 1; j < normalizedSessions.length; j++) {
      const a = normalizedSessions[i];
      const b = normalizedSessions[j];
      if (a.date === b.date && a.startTime < b.endTime && a.endTime > b.startTime) {
        return {
          success: false,
          error: `Sessions ${i + 1} and ${j + 1} overlap on ${a.date}`,
        };
      }
    }
  }

  // Get all unique dates from new sessions
  const uniqueDates = [...new Set(normalizedSessions.map(s => s.date))];

  // Check for overlaps with existing sessions
  const { data: existingSessions, error: existingError } = await supabase
    .from('program_session')
    .select('id, date, start_time, end_time')
    .eq('program_id', programId)
    .eq('is_cancelled', false)
    .in('date', uniqueDates);

  if (existingError) {
    return { success: false, error: `Failed to check existing sessions: ${existingError.message}` };
  }

  for (const newSession of normalizedSessions) {
    const overlap = existingSessions?.find(
      existing =>
        existing.date === newSession.date &&
        newSession.startTime < existing.end_time &&
        newSession.endTime > existing.start_time
    );
    if (overlap) {
      return {
        success: false,
        error: `New session on ${newSession.date} overlaps with existing session on ${overlap.date} (${overlap.start_time.slice(0, 5)} - ${overlap.end_time.slice(0, 5)})`,
      };
    }
  }

  const sessionsToInsert = normalizedSessions.map(session => ({
    program_id: programId,
    date: session.date,
    start_time: session.startTime,
    end_time: session.endTime,
    location_override: session.locationOverride || null,
    notes: session.notes || null,
  }));

  const { data, error } = await supabase.from('program_session').insert(sessionsToInsert).select();

  if (error) {
    return { success: false, error: error.message };
  }

  // Add court assignments for each session if provided
  const courtAssignments: { session_id: string; court_id: string }[] = [];
  sessions.forEach((sessionParams, index) => {
    if (sessionParams.courtIds && sessionParams.courtIds.length > 0 && data[index]) {
      sessionParams.courtIds.forEach(courtId => {
        courtAssignments.push({
          session_id: data[index].id,
          court_id: courtId,
        });
      });
    }
  });

  if (courtAssignments.length > 0) {
    const { data: insertedCourts, error: courtError } = await supabase
      .from('program_session_court')
      .insert(courtAssignments)
      .select('id, session_id, court_id');

    if (courtError) {
      // Log but don't fail - sessions are created, courts can be added later
      console.error('Failed to assign courts to sessions:', courtError);
    } else if (program.auto_block_courts && insertedCourts && insertedCourts.length > 0) {
      // Auto-block courts if enabled on the program
      for (const sessionCourt of insertedCourts) {
        // Find the session data to get date and times
        const sessionIndex = data.findIndex(s => s.id === sessionCourt.session_id);
        if (sessionIndex === -1) continue;

        const sessionData = data[sessionIndex];
        const blockResult = await blockCourtForSession(supabase, {
          programId: program.id,
          sessionId: sessionCourt.session_id,
          sessionCourtId: sessionCourt.id,
          courtId: sessionCourt.court_id,
          date: sessionData.date,
          startTime: sessionData.start_time,
          endTime: sessionData.end_time,
          organizationId: program.organization_id,
        });

        if (!blockResult.success) {
          // Log warning but don't fail - court can be blocked later
          console.warn(
            `Failed to auto-block court ${sessionCourt.court_id} for session ${sessionCourt.session_id}: ${blockResult.error}`
          );
        }
      }
    }
  }

  return { success: true, data: data || [] };
}

/**
 * Block court for a single session-court assignment
 */
export async function blockCourtForSession(
  supabase: SupabaseClient,
  params: BlockCourtParams
): Promise<ServiceResult<{ bookingId: string }>> {
  // Normalize time format to include seconds if not present
  const startTime = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
  const endTime = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

  // Check for conflicting bookings directly
  // Program sessions can span multiple slots, so we check for any overlap
  const { data: conflictingBookings, error: conflictError } = await supabase
    .from('booking')
    .select('id, start_time, end_time')
    .eq('court_id', params.courtId)
    .eq('booking_date', params.date)
    .neq('status', 'cancelled')
    .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

  if (conflictError) {
    return { success: false, error: `Failed to check availability: ${conflictError.message}` };
  }

  if (conflictingBookings && conflictingBookings.length > 0) {
    const conflict = conflictingBookings[0];
    return {
      success: false,
      error: `Court already booked on ${params.date} from ${conflict.start_time} to ${conflict.end_time}`,
    };
  }

  // Get court's facility to check facility-wide blocks
  const { data: court } = await supabase
    .from('court')
    .select('facility_id')
    .eq('id', params.courtId)
    .single();

  // Check availability blocks (court-specific or facility-wide)
  let blockQuery = supabase
    .from('availability_block')
    .select('id, start_time, end_time')
    .eq('block_date', params.date);

  if (court?.facility_id) {
    blockQuery = blockQuery.or(
      `court_id.eq.${params.courtId},and(court_id.is.null,facility_id.eq.${court.facility_id})`
    );
  } else {
    blockQuery = blockQuery.eq('court_id', params.courtId);
  }

  const { data: blocks, error: blockError } = await blockQuery;

  if (blockError) {
    // Log but don't fail - this is an optional check
    console.warn('Failed to check availability blocks:', blockError);
  } else if (blocks && blocks.length > 0) {
    // Check for overlapping blocks
    const overlappingBlock = blocks.find(block => {
      if (!block.start_time) return true; // Entire day block
      const blockStart = block.start_time;
      const blockEnd = block.end_time;
      return startTime < blockEnd && endTime > blockStart;
    });

    if (overlappingBlock) {
      return {
        success: false,
        error: `Court is blocked on ${params.date}${overlappingBlock.start_time ? ` from ${overlappingBlock.start_time} to ${overlappingBlock.end_time}` : ' (entire day)'}`,
      };
    }
  }

  // Create booking with program metadata
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .insert({
      organization_id: params.organizationId,
      court_id: params.courtId,
      player_id: null, // No player - this is a program block
      booking_date: params.date,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed', // Auto-confirmed for program blocks
      price_cents: 0, // No charge - included in program fee
      booking_type: 'program_session',
      notes: 'Program session block',
      metadata: {
        program_id: params.programId,
        session_id: params.sessionId,
      },
    })
    .select('id')
    .single();

  if (bookingError) {
    if (bookingError.code === '23P01') {
      return { success: false, error: 'Court time slot already booked' };
    }
    return { success: false, error: `Failed to block court: ${bookingError.message}` };
  }

  // Update session_court with booking reference
  await supabase
    .from('program_session_court')
    .update({ booking_id: booking.id })
    .eq('id', params.sessionCourtId);

  return { success: true, data: { bookingId: booking.id } };
}

/**
 * Block courts for all sessions in a program
 */
export async function blockCourtsForProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<BlockCourtsResult> {
  // Get program with sessions and their courts
  const { data: program } = await supabase
    .from('program')
    .select(
      `
      id,
      organization_id,
      auto_block_courts,
      sessions:program_session (
        id,
        date,
        start_time,
        end_time,
        courts:program_session_court (
          id,
          court_id,
          booking_id
        )
      )
    `
    )
    .eq('id', programId)
    .single();

  if (!program?.auto_block_courts) {
    return { success: 0, failed: 0, errors: ['Auto-block courts is disabled'] };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const session of program.sessions || []) {
    for (const sessionCourt of session.courts || []) {
      // Skip if already blocked
      if (sessionCourt.booking_id) continue;

      const result = await blockCourtForSession(supabase, {
        programId: program.id,
        sessionId: session.id,
        sessionCourtId: sessionCourt.id,
        courtId: sessionCourt.court_id,
        date: session.date,
        startTime: session.start_time,
        endTime: session.end_time,
        organizationId: program.organization_id,
      });

      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`Session ${session.id}, Court ${sessionCourt.court_id}: ${result.error}`);
      }
    }
  }

  return { success, failed, errors };
}

/**
 * Release court bookings for sessions
 */
export async function releaseSessionBookings(
  supabase: SupabaseClient,
  sessionIds: string[]
): Promise<ServiceResult<void>> {
  // Get booking IDs for these sessions
  const { data: sessionCourts } = await supabase
    .from('program_session_court')
    .select('id, session_id, booking_id')
    .in('session_id', sessionIds)
    .not('booking_id', 'is', null);

  const bookingIds = (sessionCourts || [])
    .filter(sc => sc.booking_id)
    .map(sc => sc.booking_id as string);

  if (bookingIds.length === 0) {
    return { success: true };
  }

  // Cancel the bookings (this frees up the slots)
  const { error: cancelError } = await supabase
    .from('booking')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Program session cancelled',
    })
    .in('id', bookingIds);

  if (cancelError) {
    return { success: false, error: cancelError.message };
  }

  // Clear booking references from session courts
  const sessionCourtIds = (sessionCourts || []).map(sc => sc.id);
  const { error: updateError } = await supabase
    .from('program_session_court')
    .update({ booking_id: null })
    .in('id', sessionCourtIds);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Generate recurring sessions for a program
 */
export async function generateRecurringSessions(
  supabase: SupabaseClient,
  programId: string,
  options: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
    startTime: string;
    endTime: string;
    courtIds?: string[]; // Apply same courts to all sessions
  }
): Promise<ServiceResult<ProgramSession[]>> {
  const sessions: CreateSessionParams[] = [];
  const start = new Date(options.startDate);
  const end = new Date(options.endDate);

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();

    if (options.daysOfWeek.includes(dayOfWeek)) {
      sessions.push({
        date: current.toISOString().split('T')[0],
        startTime: options.startTime,
        endTime: options.endTime,
        courtIds: options.courtIds,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  if (sessions.length === 0) {
    return { success: false, error: 'No sessions generated for the given schedule' };
  }

  return bulkCreateSessions(supabase, programId, sessions);
}

/**
 * Check availability for courts at a given time
 */
export async function checkCourtsAvailability(
  supabase: SupabaseClient,
  courtIds: string[],
  date: string,
  startTime: string,
  endTime: string
): Promise<{ courtId: string; available: boolean; error?: string }[]> {
  const results: { courtId: string; available: boolean; error?: string }[] = [];

  for (const courtId of courtIds) {
    const { data: availableSlots, error } = await supabase.rpc('get_available_slots', {
      p_court_id: courtId,
      p_date: date,
    });

    if (error) {
      results.push({ courtId, available: false, error: error.message });
      continue;
    }

    const normStart = normalizeTimeForComparison(startTime);
    const normEnd = normalizeTimeForComparison(endTime);
    const matchingSlot = availableSlots?.find(
      (slot: { start_time: string; end_time: string }) =>
        normalizeTimeForComparison(slot.start_time) === normStart &&
        normalizeTimeForComparison(slot.end_time) === normEnd
    );

    results.push({ courtId, available: !!matchingSlot });
  }

  return results;
}
