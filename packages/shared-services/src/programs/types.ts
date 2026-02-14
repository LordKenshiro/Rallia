/**
 * Programs & Lessons Service Types
 */

import type {
  InstructorProfile,
  Program,
  ProgramSession,
  ProgramRegistration,
  ProgramWaitlist,
  RegistrationPayment,
  ProgramCancellationPolicy,
  ProgramTypeEnum,
  ProgramStatusEnum,
  RegistrationStatusEnum,
  PaymentPlanEnum,
} from '@rallia/shared-types';

// =============================================================================
// INSTRUCTOR TYPES
// =============================================================================

export interface CreateInstructorParams {
  organizationId: string;
  organizationMemberId?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  hourlyRateCents?: number;
  currency?: string;
  certifications?: InstructorCertification[];
  specializations?: string[];
  isExternal?: boolean;
}

export interface UpdateInstructorParams {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  hourlyRateCents?: number;
  currency?: string;
  certifications?: InstructorCertification[];
  specializations?: string[];
  isActive?: boolean;
}

export interface InstructorCertification {
  name: string;
  issuer?: string;
  date?: string;
  expires?: string;
}

export interface InstructorWithDetails extends InstructorProfile {
  organization_member?: {
    id: string;
    user_id: string;
    role: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
    } | null;
  } | null;
}

// =============================================================================
// PROGRAM TYPES
// =============================================================================

export interface CreateProgramParams {
  organizationId: string;
  facilityId?: string;
  sportId?: string;
  type: ProgramTypeEnum;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;
  minParticipants?: number;
  maxParticipants?: number;
  priceCents: number;
  currency?: string;
  allowInstallments?: boolean;
  installmentCount?: number;
  depositCents?: number;
  autoBlockCourts?: boolean;
  waitlistEnabled?: boolean;
  waitlistLimit?: number;
  ageMin?: number;
  ageMax?: number;
  skillLevelMin?: string;
  skillLevelMax?: string;
  cancellationPolicy?: Partial<ProgramCancellationPolicy>;
  coverImageUrl?: string;
  instructorIds?: string[];
  sessions?: CreateSessionParams[];
}

export interface UpdateProgramParams {
  facilityId?: string;
  sportId?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;
  minParticipants?: number;
  maxParticipants?: number;
  priceCents?: number;
  currency?: string;
  allowInstallments?: boolean;
  installmentCount?: number;
  depositCents?: number;
  autoBlockCourts?: boolean;
  waitlistEnabled?: boolean;
  waitlistLimit?: number;
  ageMin?: number;
  ageMax?: number;
  skillLevelMin?: string;
  skillLevelMax?: string;
  cancellationPolicy?: Partial<ProgramCancellationPolicy>;
  coverImageUrl?: string;
}

export interface ProgramWithDetails extends Program {
  facility?: {
    id: string;
    name: string;
  } | null;
  sport?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  sessions?: ProgramSession[];
  instructors?: InstructorWithDetails[];
  registrations_count?: number;
  waitlist_count?: number;
}

export interface ProgramListFilters {
  organizationId: string;
  type?: ProgramTypeEnum;
  status?: ProgramStatusEnum;
  facilityId?: string;
  sportId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// SESSION TYPES
// =============================================================================

export interface CreateSessionParams {
  programId?: string; // Optional if creating with program
  date: string;
  startTime: string;
  endTime: string;
  courtIds?: string[]; // Multiple courts per session
  locationOverride?: string;
  notes?: string;
}

export interface UpdateSessionParams {
  date?: string;
  startTime?: string;
  endTime?: string;
  courtIds?: string[]; // Replace all court assignments
  locationOverride?: string;
  notes?: string;
}

export interface SessionCourtWithDetails {
  id: string;
  court_id: string;
  booking_id: string | null;
  court: {
    id: string;
    name: string | null;
    court_number: number | null;
  };
}

export interface SessionWithDetails extends ProgramSession {
  courts?: SessionCourtWithDetails[];
  facility?: {
    id: string;
    name: string;
  } | null;
  attendance?: {
    confirmed: number;
    attended: number;
    absent: number;
  };
}

// =============================================================================
// REGISTRATION TYPES
// =============================================================================

export interface CreateRegistrationParams {
  programId: string;
  playerId: string;
  registeredBy: string;
  paymentPlan?: PaymentPlanEnum;
  stripeCustomerId?: string;
  notes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RegistrationWithDetails extends ProgramRegistration {
  player?: {
    id: string;
    username: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
      email: string;
      phone: string | null;
    } | null;
  } | null;
  program?: Program;
  payments?: RegistrationPayment[];
}

export interface RegistrationListFilters {
  programId: string;
  status?: RegistrationStatusEnum;
  search?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// WAITLIST TYPES
// =============================================================================

export interface AddToWaitlistParams {
  programId: string;
  playerId: string;
  addedBy: string;
  notes?: string;
}

export interface WaitlistEntryWithDetails extends ProgramWaitlist {
  player?: {
    id: string;
    username: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
      email: string;
      phone: string | null;
    } | null;
  } | null;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export interface InstallmentSchedule {
  installmentNumber: number;
  amountCents: number;
  dueDate: Date;
}

export interface CreatePaymentParams {
  registrationId: string;
  amountCents: number;
  currency?: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  stripeCustomerId?: string;
}

// =============================================================================
// CANCELLATION TYPES
// =============================================================================

export interface RefundCalculation {
  eligibleForRefund: boolean;
  refundAmountCents: number;
  refundPercent: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  reason: string;
}

export interface CancelRegistrationParams {
  registrationId: string;
  cancelledBy: string;
  reason?: string;
  forceRefund?: boolean;
}

export interface CancelRegistrationResult {
  success: boolean;
  refundAmountCents: number;
  refundsProcessed: number;
  message: string;
}

// =============================================================================
// COURT BLOCKING TYPES
// =============================================================================

export interface BlockCourtParams {
  programId: string;
  sessionId: string;
  sessionCourtId: string; // program_session_court.id
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  organizationId: string;
}

export interface BlockCourtsResult {
  success: number;
  failed: number;
  errors: string[];
}

// =============================================================================
// SERVICE RESULT TYPES
// =============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
