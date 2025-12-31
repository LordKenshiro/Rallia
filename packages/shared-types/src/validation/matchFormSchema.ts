/**
 * Match Form Validation Schema
 *
 * Zod schema for validating match creation form data.
 * Provides per-step and full form validation.
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

/**
 * Match duration options (in minutes)
 */
export const matchDurationSchema = z.enum(['30', '60', '90', '120', 'custom']);

/**
 * Match format (singles or doubles)
 */
export const matchFormatSchema = z.enum(['singles', 'doubles']);

/**
 * Player expectation / match type
 */
export const matchTypeSchema = z.enum(['casual', 'competitive', 'both']);

/**
 * Location type
 */
export const locationTypeSchema = z.enum(['facility', 'custom', 'tbd']);

/**
 * Court reservation status
 */
export const courtStatusSchema = z.enum(['booked', 'to_book', 'tbd']);

/**
 * Cost split type
 */
export const costSplitTypeSchema = z.enum(['equal', 'creator_pays', 'custom']);

/**
 * Match visibility
 */
export const matchVisibilitySchema = z.enum(['public', 'private']);

/**
 * Join mode
 */
export const matchJoinModeSchema = z.enum(['direct', 'request']);

// ============================================
// STEP SCHEMAS
// ============================================

/**
 * Step 1: When & Format
 * Fields for date, time, duration, format, and match type
 */
export const step1Schema = z
  .object({
    matchDate: z
      .string()
      .min(1, 'Please select a date')
      .refine(
        date => {
          // Parse date as local time, not UTC
          // new Date('YYYY-MM-DD') is interpreted as UTC, causing day shift issues
          const [year, month, day] = date.split('-').map(Number);
          const selected = new Date(year, month - 1, day); // month is 0-indexed
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selected >= today;
        },
        { message: 'Date must be today or in the future' }
      ),
    startTime: z.string().min(1, 'Please select a start time'),
    duration: matchDurationSchema,
    customDurationMinutes: z.number().min(15).max(480).optional(),
    format: matchFormatSchema,
    playerExpectation: matchTypeSchema,
  })
  .superRefine((data, ctx) => {
    // Custom duration validation
    if (data.duration === 'custom' && !data.customDurationMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a custom duration',
        path: ['customDurationMinutes'],
      });
    }
  });

/**
 * Step 2: Where
 * Fields for location selection
 */
export const step2Schema = z
  .object({
    locationType: locationTypeSchema,
    facilityId: z.string().optional(),
    courtId: z.string().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    customLatitude: z.number().optional(),
    customLongitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate based on location type
    if (data.locationType === 'facility') {
      if (!data.facilityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a facility',
          path: ['facilityId'],
        });
      }
    } else if (data.locationType === 'custom') {
      if (!data.locationName || data.locationName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a location name',
          path: ['locationName'],
        });
      }
    }
    // 'tbd' requires no additional validation
  });

/**
 * Step 3: Preferences
 * Fields for court cost, visibility, join mode, and notes
 */
export const step3Schema = z.object({
  courtStatus: courtStatusSchema.optional(),
  isCourtFree: z.boolean(),
  costSplitType: costSplitTypeSchema,
  estimatedCost: z.number().min(0).optional(),
  visibility: matchVisibilitySchema,
  joinMode: matchJoinModeSchema,
  notes: z.string().max(500).optional(),
});

// ============================================
// FULL FORM SCHEMA
// ============================================

/**
 * Complete match form schema
 * Combines all steps plus the sport ID (auto-filled from context)
 */
export const matchFormSchema = z
  .object({
    // Sport (auto-filled from context)
    sportId: z.string().min(1, 'No sport selected'),

    // Step 1: When & Format
    matchDate: z.string().min(1, 'Please select a date'),
    startTime: z.string().min(1, 'Please select a start time'),
    endTime: z.string().optional(), // Calculated from duration
    timezone: z.string().min(1, 'Timezone is required'), // IANA timezone (auto-detected)
    duration: matchDurationSchema,
    customDurationMinutes: z.number().min(15).max(480).optional(),
    format: matchFormatSchema,
    playerExpectation: matchTypeSchema,

    // Step 2: Where
    locationType: locationTypeSchema,
    facilityId: z.string().optional(),
    courtId: z.string().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    customLatitude: z.number().optional(),
    customLongitude: z.number().optional(),

    // Step 3: Preferences
    courtStatus: courtStatusSchema.optional(),
    isCourtFree: z.boolean(),
    costSplitType: costSplitTypeSchema,
    estimatedCost: z.number().min(0).optional(),
    minRatingScoreId: z.string().optional(),
    preferredOpponentGender: z.enum(['male', 'female', 'other', 'any']).optional(),
    visibility: matchVisibilitySchema,
    joinMode: matchJoinModeSchema,
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // Custom duration validation
    if (data.duration === 'custom' && !data.customDurationMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a custom duration',
        path: ['customDurationMinutes'],
      });
    }

    // Location validation
    if (data.locationType === 'facility' && !data.facilityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a facility',
        path: ['facilityId'],
      });
    }

    if (
      data.locationType === 'custom' &&
      (!data.locationName || data.locationName.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a location name',
        path: ['locationName'],
      });
    }

    // Cost validation
    if (!data.isCourtFree && data.estimatedCost === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter an estimated cost',
        path: ['estimatedCost'],
      });
    }

    // Date validation
    // Parse date as local time, not UTC
    // new Date('YYYY-MM-DD') is interpreted as UTC, causing day shift issues
    const [year, month, day] = data.matchDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date must be today or in the future',
        path: ['matchDate'],
      });
    }
  });

// ============================================
// INFERRED TYPES
// ============================================

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;
export type MatchFormSchemaData = z.infer<typeof matchFormSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the schema for a specific step
 */
export function getStepSchema(step: 1 | 2 | 3) {
  switch (step) {
    case 1:
      return step1Schema;
    case 2:
      return step2Schema;
    case 3:
      return step3Schema;
    default:
      return step1Schema;
  }
}

/**
 * Validate a specific step's data
 */
export function validateStep(step: 1 | 2 | 3, data: unknown) {
  const schema = getStepSchema(step);
  return schema.safeParse(data);
}

/**
 * Validate the entire form
 */
export function validateMatchForm(data: unknown) {
  return matchFormSchema.safeParse(data);
}
