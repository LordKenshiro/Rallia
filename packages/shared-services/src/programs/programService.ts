/**
 * Program Service
 *
 * Manages programs and lessons for organizations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramStatusEnum } from '@rallia/shared-types';
import type {
  CreateProgramParams,
  UpdateProgramParams,
  ProgramWithDetails,
  ProgramListFilters,
  ServiceResult,
  PaginatedResult,
  CreateSessionParams,
} from './types';

const DEFAULT_CANCELLATION_POLICY = {
  full_refund_days_before_start: 7,
  partial_refund_days_before_start: 3,
  partial_refund_percent: 50,
  no_refund_after_start: true,
  prorate_by_sessions_attended: true,
};

/**
 * Create a new program
 */
export async function createProgram(
  supabase: SupabaseClient,
  params: CreateProgramParams
): Promise<ServiceResult<ProgramWithDetails>> {
  // Create the program
  const { data: program, error: programError } = await supabase
    .from('program')
    .insert({
      organization_id: params.organizationId,
      facility_id: params.facilityId || null,
      sport_id: params.sportId || null,
      type: params.type,
      status: 'draft',
      name: params.name,
      description: params.description || null,
      start_date: params.startDate,
      end_date: params.endDate || null,
      registration_opens_at: params.registrationOpensAt || null,
      registration_deadline: params.registrationDeadline || null,
      min_participants: params.minParticipants || 1,
      max_participants: params.maxParticipants || null,
      price_cents: params.priceCents,
      currency: params.currency || 'CAD',
      allow_installments: params.allowInstallments || false,
      installment_count: params.installmentCount || 1,
      deposit_cents: params.depositCents || null,
      auto_block_courts: params.autoBlockCourts || false,
      waitlist_enabled: params.waitlistEnabled ?? true,
      waitlist_limit: params.waitlistLimit || null,
      age_min: params.ageMin || null,
      age_max: params.ageMax || null,
      skill_level_min: params.skillLevelMin || null,
      skill_level_max: params.skillLevelMax || null,
      cancellation_policy: {
        ...DEFAULT_CANCELLATION_POLICY,
        ...params.cancellationPolicy,
      },
      cover_image_url: params.coverImageUrl || null,
    })
    .select()
    .single();

  if (programError) {
    return { success: false, error: programError.message };
  }

  // Create sessions if provided
  if (params.sessions && params.sessions.length > 0) {
    const sessionsToInsert = params.sessions.map(session => ({
      program_id: program.id,
      date: session.date,
      start_time: session.startTime,
      end_time: session.endTime,
      location_override: session.locationOverride || null,
      notes: session.notes || null,
    }));

    const { data: createdSessions, error: sessionError } = await supabase
      .from('program_session')
      .insert(sessionsToInsert)
      .select();

    if (sessionError) {
      // Rollback program creation
      await supabase.from('program').delete().eq('id', program.id);
      return { success: false, error: `Failed to create sessions: ${sessionError.message}` };
    }

    // Add court assignments for each session if provided
    const courtAssignments: { session_id: string; court_id: string }[] = [];
    params.sessions.forEach((sessionParams, index) => {
      if (sessionParams.courtIds && sessionParams.courtIds.length > 0 && createdSessions[index]) {
        sessionParams.courtIds.forEach(courtId => {
          courtAssignments.push({
            session_id: createdSessions[index].id,
            court_id: courtId,
          });
        });
      }
    });

    if (courtAssignments.length > 0) {
      const { error: courtError } = await supabase
        .from('program_session_court')
        .insert(courtAssignments);

      if (courtError) {
        console.error('Failed to assign courts to sessions:', courtError);
        // Don't rollback, just log the error - sessions are created
      }
    }
  }

  // Assign instructors if provided
  if (params.instructorIds && params.instructorIds.length > 0) {
    const instructorAssignments = params.instructorIds.map((instructorId, index) => ({
      program_id: program.id,
      instructor_id: instructorId,
      is_primary: index === 0, // First instructor is primary
    }));

    const { error: instructorError } = await supabase
      .from('program_instructor')
      .insert(instructorAssignments);

    if (instructorError) {
      console.error('Failed to assign instructors:', instructorError);
      // Don't rollback, just log the error
    }
  }

  // Return the created program with details
  return getProgram(supabase, program.id);
}

/**
 * Get program by ID with details
 */
export async function getProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<ServiceResult<ProgramWithDetails>> {
  const { data, error } = await supabase
    .from('program')
    .select(
      `
      *,
      facility:facility_id (
        id,
        name
      ),
      sport:sport_id (
        id,
        name,
        slug
      ),
      sessions:program_session (
        *
      ),
      program_instructors:program_instructor (
        instructor:instructor_id (
          *,
          organization_member:organization_member_id (
            id,
            user_id,
            role,
            profile:user_id (
              first_name,
              last_name,
              display_name,
              profile_picture_url
            )
          )
        ),
        is_primary
      )
    `
    )
    .eq('id', programId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Get registration and waitlist counts
  const [{ count: registrationsCount }, { count: waitlistCount }] = await Promise.all([
    supabase
      .from('program_registration')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('status', 'confirmed'),
    supabase
      .from('program_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId),
  ]);

  // Transform the data
  const programWithDetails: ProgramWithDetails = {
    ...data,
    instructors:
      data.program_instructors?.map((pi: { instructor: unknown; is_primary: boolean }) => {
        // Handle instructor relation (Supabase returns as array in types but object in runtime)
        const instructorData = Array.isArray(pi.instructor) ? pi.instructor[0] : pi.instructor;
        return {
          ...(instructorData as Record<string, unknown>),
          is_primary: pi.is_primary,
        };
      }) || [],
    registrations_count: registrationsCount || 0,
    waitlist_count: waitlistCount || 0,
  };

  return { success: true, data: programWithDetails };
}

/**
 * List programs with filters
 */
export async function listPrograms(
  supabase: SupabaseClient,
  filters: ProgramListFilters
): Promise<PaginatedResult<ProgramWithDetails>> {
  let query = supabase
    .from('program')
    .select(
      `
      *,
      facility:facility_id (
        id,
        name
      ),
      sport:sport_id (
        id,
        name,
        slug
      )
    `,
      { count: 'exact' }
    )
    .eq('organization_id', filters.organizationId)
    .order('start_date', { ascending: true });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.facilityId) {
    query = query.eq('facility_id', filters.facilityId);
  }

  if (filters.sportId) {
    query = query.eq('sport_id', filters.sportId);
  }

  if (filters.startDateFrom) {
    query = query.gte('start_date', filters.startDateFrom);
  }

  if (filters.startDateTo) {
    query = query.lte('start_date', filters.startDateTo);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], total: 0, limit, offset };
  }

  return {
    data: (data || []) as ProgramWithDetails[],
    total: count || 0,
    limit,
    offset,
  };
}

/**
 * Update a program
 */
export async function updateProgram(
  supabase: SupabaseClient,
  programId: string,
  params: UpdateProgramParams
): Promise<ServiceResult<Program>> {
  // Check program status
  const { data: existing } = await supabase
    .from('program')
    .select('status')
    .eq('id', programId)
    .single();

  if (!existing) {
    return { success: false, error: 'Program not found' };
  }

  // Prevent editing completed/cancelled programs
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    return { success: false, error: `Cannot edit a ${existing.status} program` };
  }

  const updateData: Record<string, unknown> = {};

  if (params.facilityId !== undefined) updateData.facility_id = params.facilityId;
  if (params.sportId !== undefined) updateData.sport_id = params.sportId;
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.startDate !== undefined) updateData.start_date = params.startDate;
  if (params.endDate !== undefined) updateData.end_date = params.endDate;
  if (params.registrationOpensAt !== undefined)
    updateData.registration_opens_at = params.registrationOpensAt;
  if (params.registrationDeadline !== undefined)
    updateData.registration_deadline = params.registrationDeadline;
  if (params.minParticipants !== undefined) updateData.min_participants = params.minParticipants;
  if (params.maxParticipants !== undefined) updateData.max_participants = params.maxParticipants;
  if (params.priceCents !== undefined) updateData.price_cents = params.priceCents;
  if (params.currency !== undefined) updateData.currency = params.currency;
  if (params.allowInstallments !== undefined)
    updateData.allow_installments = params.allowInstallments;
  if (params.installmentCount !== undefined) updateData.installment_count = params.installmentCount;
  if (params.depositCents !== undefined) updateData.deposit_cents = params.depositCents;
  if (params.autoBlockCourts !== undefined) updateData.auto_block_courts = params.autoBlockCourts;
  if (params.waitlistEnabled !== undefined) updateData.waitlist_enabled = params.waitlistEnabled;
  if (params.waitlistLimit !== undefined) updateData.waitlist_limit = params.waitlistLimit;
  if (params.ageMin !== undefined) updateData.age_min = params.ageMin;
  if (params.ageMax !== undefined) updateData.age_max = params.ageMax;
  if (params.skillLevelMin !== undefined) updateData.skill_level_min = params.skillLevelMin;
  if (params.skillLevelMax !== undefined) updateData.skill_level_max = params.skillLevelMax;
  if (params.cancellationPolicy !== undefined) {
    updateData.cancellation_policy = {
      ...DEFAULT_CANCELLATION_POLICY,
      ...params.cancellationPolicy,
    };
  }
  if (params.coverImageUrl !== undefined) updateData.cover_image_url = params.coverImageUrl;

  const { data, error } = await supabase
    .from('program')
    .update(updateData)
    .eq('id', programId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Publish a program (change status from draft to published)
 */
export async function publishProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<ServiceResult<Program>> {
  // Get program details
  const { data: program, error: fetchError } = await supabase
    .from('program')
    .select(
      `
      *,
      sessions:program_session (id)
    `
    )
    .eq('id', programId)
    .single();

  if (fetchError || !program) {
    return { success: false, error: 'Program not found' };
  }

  if (program.status !== 'draft') {
    return { success: false, error: `Program is already ${program.status}` };
  }

  // Validate program has at least one session
  if (!program.sessions || program.sessions.length === 0) {
    return { success: false, error: 'Program must have at least one session to be published' };
  }

  // Update status to published
  const { data, error } = await supabase
    .from('program')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', programId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Cancel a program
 */
export async function cancelProgram(
  supabase: SupabaseClient,
  programId: string,
  reason?: string
): Promise<ServiceResult<Program>> {
  const { data: program } = await supabase
    .from('program')
    .select('status')
    .eq('id', programId)
    .single();

  if (!program) {
    return { success: false, error: 'Program not found' };
  }

  if (program.status === 'cancelled') {
    return { success: false, error: 'Program is already cancelled' };
  }

  if (program.status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed program' };
  }

  // Update status to cancelled
  const { data, error } = await supabase
    .from('program')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      metadata: { cancellation_reason: reason },
    })
    .eq('id', programId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // TODO: Handle refunds for registered participants
  // TODO: Release court bookings
  // TODO: Send notifications

  return { success: true, data };
}

/**
 * Delete a program (only if draft with no registrations)
 */
export async function deleteProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<ServiceResult<void>> {
  // Check program status and registrations
  const { data: program } = await supabase
    .from('program')
    .select(
      `
      status,
      registrations:program_registration (id)
    `
    )
    .eq('id', programId)
    .single();

  if (!program) {
    return { success: false, error: 'Program not found' };
  }

  if (program.status !== 'draft') {
    return { success: false, error: 'Only draft programs can be deleted' };
  }

  if (program.registrations && program.registrations.length > 0) {
    return { success: false, error: 'Cannot delete program with registrations' };
  }

  const { error } = await supabase.from('program').delete().eq('id', programId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update program status (for completion, etc.)
 */
export async function updateProgramStatus(
  supabase: SupabaseClient,
  programId: string,
  status: ProgramStatusEnum
): Promise<ServiceResult<Program>> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  } else if (status === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('program')
    .update(updateData)
    .eq('id', programId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Assign instructors to a program
 */
export async function assignInstructors(
  supabase: SupabaseClient,
  programId: string,
  instructorIds: string[],
  primaryInstructorId?: string
): Promise<ServiceResult<void>> {
  // Remove existing assignments
  await supabase.from('program_instructor').delete().eq('program_id', programId);

  if (instructorIds.length === 0) {
    return { success: true };
  }

  // Create new assignments
  const assignments = instructorIds.map(instructorId => ({
    program_id: programId,
    instructor_id: instructorId,
    is_primary: instructorId === (primaryInstructorId || instructorIds[0]),
  }));

  const { error } = await supabase.from('program_instructor').insert(assignments);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if program has capacity for new registrations
 */
export async function checkProgramCapacity(
  supabase: SupabaseClient,
  programId: string
): Promise<{ hasCapacity: boolean; currentCount: number; maxCount: number | null }> {
  const { data } = await supabase
    .from('program')
    .select('current_participants, max_participants')
    .eq('id', programId)
    .single();

  if (!data) {
    return { hasCapacity: false, currentCount: 0, maxCount: null };
  }

  const hasCapacity = !data.max_participants || data.current_participants < data.max_participants;

  return {
    hasCapacity,
    currentCount: data.current_participants,
    maxCount: data.max_participants,
  };
}
