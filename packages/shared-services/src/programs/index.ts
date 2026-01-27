/**
 * Programs & Lessons Services
 *
 * Barrel export for all program-related services.
 */

// Types
export * from './types';

// Instructor Service
export {
  createInstructor,
  getInstructor,
  listInstructors,
  updateInstructor,
  deleteInstructor,
  createInstructorFromMember,
  getAvailableInstructors,
} from './instructorService';

// Program Service
export {
  createProgram,
  getProgram,
  listPrograms,
  updateProgram,
  publishProgram,
  cancelProgram,
  deleteProgram,
  updateProgramStatus,
  assignInstructors,
  checkProgramCapacity,
} from './programService';

// Session Service
export {
  createSession,
  getSession,
  listSessions,
  updateSession,
  cancelSession,
  deleteSession,
  bulkCreateSessions,
  blockCourtForSession,
  blockCourtsForProgram,
  releaseSessionBookings,
  generateRecurringSessions,
} from './sessionService';

// Registration Service
export {
  createRegistration,
  getRegistration,
  listRegistrations,
  updateRegistrationStatus,
  confirmRegistration,
  calculateInstallmentSchedule,
  createInstallmentPayments,
  updatePaidAmount,
  getRegistrationByPlayer,
  getSessionsAttended,
} from './registrationService';

// Waitlist Service
export {
  addToWaitlist,
  getWaitlistEntry,
  listWaitlist,
  removeFromWaitlist,
  removePlayerFromWaitlist,
  getNextInWaitlist,
  promoteFromWaitlist,
  claimPromotedSpot,
  getExpiredPromotions,
  resetExpiredPromotion,
  processWaitlistAfterCancellation,
  getPlayerWaitlistPosition,
} from './waitlistService';

// Cancellation Service - client-safe exports (calculation, preview)
// For server-side functions (cancelRegistration, processInstallmentRefund), use web app's lib/programs
export { calculateProgramRefund, previewCancellationRefund } from './cancellationService';

// Notification Service
export {
  sendRegistrationConfirmationNotification,
  sendRegistrationCancellationNotification,
  sendSessionReminderNotification,
  sendSessionCancellationNotification,
  sendWaitlistPromotionNotification,
  sendPaymentDueNotification,
  sendPaymentReceivedNotification,
  notifyProgramParticipants,
} from './programNotifications';
