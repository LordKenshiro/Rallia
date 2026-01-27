/**
 * Instructor Service
 *
 * Manages instructor profiles for organizations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InstructorProfile } from '@rallia/shared-types';
import type {
  CreateInstructorParams,
  UpdateInstructorParams,
  InstructorWithDetails,
  ServiceResult,
  PaginatedResult,
} from './types';

/**
 * Create a new instructor profile
 */
export async function createInstructor(
  supabase: SupabaseClient,
  params: CreateInstructorParams
): Promise<ServiceResult<InstructorProfile>> {
  const { data, error } = await supabase
    .from('instructor_profile')
    .insert({
      organization_id: params.organizationId,
      organization_member_id: params.organizationMemberId || null,
      display_name: params.displayName,
      bio: params.bio || null,
      avatar_url: params.avatarUrl || null,
      email: params.email || null,
      phone: params.phone || null,
      hourly_rate_cents: params.hourlyRateCents || null,
      currency: params.currency || 'CAD',
      certifications: params.certifications || [],
      specializations: params.specializations || [],
      is_external: params.isExternal ?? !params.organizationMemberId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get instructor by ID
 */
export async function getInstructor(
  supabase: SupabaseClient,
  instructorId: string
): Promise<ServiceResult<InstructorWithDetails>> {
  const { data, error } = await supabase
    .from('instructor_profile')
    .select(
      `
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
    `
    )
    .eq('id', instructorId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as InstructorWithDetails };
}

/**
 * List instructors for an organization
 */
export async function listInstructors(
  supabase: SupabaseClient,
  organizationId: string,
  options?: {
    isActive?: boolean;
    isExternal?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PaginatedResult<InstructorWithDetails>> {
  let query = supabase
    .from('instructor_profile')
    .select(
      `
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
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .order('display_name', { ascending: true });

  if (options?.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  if (options?.isExternal !== undefined) {
    query = query.eq('is_external', options.isExternal);
  }

  if (options?.search) {
    query = query.or(`display_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], total: 0, limit, offset };
  }

  return {
    data: (data || []) as InstructorWithDetails[],
    total: count || 0,
    limit,
    offset,
  };
}

/**
 * Update an instructor profile
 */
export async function updateInstructor(
  supabase: SupabaseClient,
  instructorId: string,
  params: UpdateInstructorParams
): Promise<ServiceResult<InstructorProfile>> {
  const updateData: Record<string, unknown> = {};

  if (params.displayName !== undefined) updateData.display_name = params.displayName;
  if (params.bio !== undefined) updateData.bio = params.bio;
  if (params.avatarUrl !== undefined) updateData.avatar_url = params.avatarUrl;
  if (params.email !== undefined) updateData.email = params.email;
  if (params.phone !== undefined) updateData.phone = params.phone;
  if (params.hourlyRateCents !== undefined) updateData.hourly_rate_cents = params.hourlyRateCents;
  if (params.currency !== undefined) updateData.currency = params.currency;
  if (params.certifications !== undefined) updateData.certifications = params.certifications;
  if (params.specializations !== undefined) updateData.specializations = params.specializations;
  if (params.isActive !== undefined) updateData.is_active = params.isActive;

  const { data, error } = await supabase
    .from('instructor_profile')
    .update(updateData)
    .eq('id', instructorId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete an instructor profile
 */
export async function deleteInstructor(
  supabase: SupabaseClient,
  instructorId: string
): Promise<ServiceResult<void>> {
  // Check if instructor is assigned to any active programs
  // First, get the IDs of active programs
  const { data: activePrograms } = await supabase
    .from('program')
    .select('id')
    .in('status', ['draft', 'published']);

  const activeProgramIds = activePrograms?.map(p => p.id) || [];

  const { count } = await supabase
    .from('program_instructor')
    .select('*', { count: 'exact', head: true })
    .eq('instructor_id', instructorId)
    .in('program_id', activeProgramIds);

  if (count && count > 0) {
    return {
      success: false,
      error: 'Cannot delete instructor assigned to active programs',
    };
  }

  const { error } = await supabase.from('instructor_profile').delete().eq('id', instructorId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create instructor from organization member
 */
export async function createInstructorFromMember(
  supabase: SupabaseClient,
  organizationId: string,
  organizationMemberId: string
): Promise<ServiceResult<InstructorProfile>> {
  // Get member details
  const { data: member, error: memberError } = await supabase
    .from('organization_member')
    .select(
      `
      id,
      user_id,
      role,
      profile:user_id (
        first_name,
        last_name,
        display_name,
        profile_picture_url,
        email,
        phone
      )
    `
    )
    .eq('id', organizationMemberId)
    .eq('organization_id', organizationId)
    .single();

  if (memberError || !member) {
    return { success: false, error: 'Organization member not found' };
  }

  // Check if instructor profile already exists for this member
  const { data: existing } = await supabase
    .from('instructor_profile')
    .select('id')
    .eq('organization_member_id', organizationMemberId)
    .single();

  if (existing) {
    return { success: false, error: 'Instructor profile already exists for this member' };
  }

  // Handle profile relation (Supabase returns as array in types but object in runtime for .single())
  const profileData = Array.isArray(member.profile) ? member.profile[0] : member.profile;
  if (!profileData) {
    return { success: false, error: 'User profile not found' };
  }

  const profile = profileData as {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    profile_picture_url: string | null;
    email: string;
    phone: string | null;
  };

  const displayName =
    profile?.display_name ||
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.first_name) ||
    'Instructor';

  return createInstructor(supabase, {
    organizationId,
    organizationMemberId,
    displayName,
    avatarUrl: profile?.profile_picture_url || undefined,
    email: profile?.email,
    phone: profile?.phone || undefined,
    isExternal: false,
  });
}

/**
 * Get instructors available for a specific date/time
 */
export async function getAvailableInstructors(
  supabase: SupabaseClient,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<InstructorWithDetails[]> {
  // Get all active instructors
  const { data: instructors } = await supabase
    .from('instructor_profile')
    .select(
      `
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
    `
    )
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (!instructors || instructors.length === 0) {
    return [];
  }

  // Get instructor IDs that are already assigned to sessions at this time
  const { data: busyInstructors } = await supabase
    .from('program_instructor')
    .select(
      `
      instructor_id,
      program:program_id (
        sessions:program_session (
          date,
          start_time,
          end_time,
          is_cancelled
        )
      )
    `
    )
    .in(
      'instructor_id',
      instructors.map(i => i.id)
    );

  const busyInstructorIds = new Set<string>();

  for (const pi of busyInstructors || []) {
    // Handle program relation (Supabase returns as array in types but object in runtime)
    const programData = Array.isArray(pi.program) ? pi.program[0] : pi.program;
    const program = programData as {
      sessions: Array<{
        date: string;
        start_time: string;
        end_time: string;
        is_cancelled: boolean;
      }> | null;
    } | null;

    if (!program?.sessions) continue;

    for (const session of program.sessions) {
      if (session.is_cancelled) continue;
      if (session.date !== date) continue;

      // Check for time overlap
      if (startTime < session.end_time && endTime > session.start_time) {
        busyInstructorIds.add(pi.instructor_id);
        break;
      }
    }
  }

  return (instructors as InstructorWithDetails[]).filter(i => !busyInstructorIds.has(i.id));
}
