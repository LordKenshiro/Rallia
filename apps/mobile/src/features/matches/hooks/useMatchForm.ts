/**
 * useMatchForm Hook
 * Manages match creation form state with react-hook-form and zod validation.
 * Provides smart defaults, per-step validation, and form persistence.
 */

import { useCallback, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  matchFormSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  type MatchFormSchemaData,
  type Step1FormData,
  type Step2FormData,
  type Step3FormData,
} from '@rallia/shared-types';

/**
 * Format a date as YYYY-MM-DD in local time (not UTC)
 */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get smart default values for the form
 */
function getDefaultValues(sportId: string, timezone: string): MatchFormSchemaData {
  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);

  // Get next rounded hour
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  const startTimeStr = now.toTimeString().slice(0, 5);

  // Calculate end time (1 hour later)
  now.setHours(now.getHours() + 1);
  const endTimeStr = now.toTimeString().slice(0, 5);

  return {
    // Sport (from context)
    sportId,

    // Step 1: When & Format
    matchDate: tomorrowStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    timezone, // IANA timezone (auto-detected)
    duration: '60',
    customDurationMinutes: undefined,
    format: 'singles',
    playerExpectation: 'both',

    // Step 2: Where
    locationType: 'tbd',
    facilityId: undefined,
    courtId: undefined,
    locationName: undefined,
    locationAddress: undefined,

    // Step 3: Preferences
    courtStatus: undefined,
    isCourtFree: true,
    costSplitType: 'equal',
    estimatedCost: undefined,
    minRatingScoreId: undefined,
    preferredOpponentGender: undefined,
    visibility: 'public',
    joinMode: 'direct',
    notes: undefined,
  };
}

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(
  startTime: string,
  duration: string,
  customMinutes?: number
): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const durationMinutes = duration === 'custom' ? (customMinutes ?? 60) : parseInt(duration, 10);

  const endDate = new Date();
  endDate.setHours(hours);
  endDate.setMinutes(minutes + durationMinutes);

  return endDate.toTimeString().slice(0, 5);
}

interface UseMatchFormOptions {
  /** Sport ID from context */
  sportId: string;
  /** IANA timezone identifier (e.g., "America/New_York") */
  timezone: string;
  /** Initial values (e.g., from draft) */
  initialValues?: Partial<MatchFormSchemaData>;
}

interface UseMatchFormReturn {
  /** The react-hook-form instance */
  form: UseFormReturn<MatchFormSchemaData>;
  /** Current form values */
  values: MatchFormSchemaData;
  /** Whether the form is dirty (has changes) */
  isDirty: boolean;
  /** Validate a specific step */
  validateStep: (step: 1 | 2 | 3) => Promise<boolean>;
  /** Get step-specific errors */
  getStepErrors: (step: 1 | 2 | 3) => Record<string, string>;
  /** Reset form to defaults */
  resetForm: () => void;
  /** Update form with draft data */
  loadFromDraft: (data: Partial<MatchFormSchemaData>) => void;
  /** Get data for a specific step */
  getStepData: (step: 1 | 2 | 3) => Step1FormData | Step2FormData | Step3FormData;
}

/**
 * Hook for managing match creation form state
 *
 * @example
 * ```tsx
 * const { form, validateStep, getStepErrors } = useMatchForm({
 *   sportId: selectedSport.id,
 * });
 *
 * // In step component
 * const { register, formState: { errors } } = form;
 *
 * // On next button click
 * const handleNext = async () => {
 *   const isValid = await validateStep(currentStep);
 *   if (isValid) {
 *     goToNextStep();
 *   }
 * };
 * ```
 */
export function useMatchForm(options: UseMatchFormOptions): UseMatchFormReturn {
  const { sportId, timezone, initialValues } = options;

  // Merge defaults with initial values
  const defaultValues = useMemo(() => {
    const defaults = getDefaultValues(sportId, timezone);
    if (initialValues) {
      return { ...defaults, ...initialValues, sportId, timezone };
    }
    return defaults;
  }, [sportId, timezone, initialValues]);

  // Initialize react-hook-form with zod resolver
  const form = useForm<MatchFormSchemaData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { watch, trigger, formState, reset, setValue } = form;
  const values = watch();

  // Validate a specific step
  const validateStep = useCallback(
    async (step: 1 | 2 | 3): Promise<boolean> => {
      const stepFields = getStepFields(step);
      const result = await trigger(stepFields);
      return result;
    },
    [trigger]
  );

  // Get errors for a specific step
  const getStepErrors = useCallback(
    (step: 1 | 2 | 3): Record<string, string> => {
      const stepFields = getStepFields(step);
      const errors: Record<string, string> = {};

      stepFields.forEach(field => {
        const error = formState.errors[field];
        if (error?.message) {
          errors[field] = error.message as string;
        }
      });

      return errors;
    },
    [formState.errors]
  );

  // Reset form to defaults
  const resetForm = useCallback(() => {
    reset(getDefaultValues(sportId, timezone));
  }, [reset, sportId, timezone]);

  // Load data from draft
  const loadFromDraft = useCallback(
    (data: Partial<MatchFormSchemaData>) => {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(
            key as keyof MatchFormSchemaData,
            value as MatchFormSchemaData[keyof MatchFormSchemaData]
          );
        }
      });
    },
    [setValue]
  );

  // Get data for a specific step
  const getStepData = useCallback(
    (step: 1 | 2 | 3): Step1FormData | Step2FormData | Step3FormData => {
      switch (step) {
        case 1:
          return {
            matchDate: values.matchDate,
            startTime: values.startTime,
            duration: values.duration,
            customDurationMinutes: values.customDurationMinutes,
            format: values.format,
            playerExpectation: values.playerExpectation,
          };
        case 2:
          return {
            locationType: values.locationType,
            facilityId: values.facilityId,
            courtId: values.courtId,
            locationName: values.locationName,
            locationAddress: values.locationAddress,
          };
        case 3:
          return {
            courtStatus: values.courtStatus,
            isCourtFree: values.isCourtFree,
            costSplitType: values.costSplitType,
            estimatedCost: values.estimatedCost,
            visibility: values.visibility,
            joinMode: values.joinMode,
            notes: values.notes,
          };
        default:
          return {} as Step1FormData;
      }
    },
    [values]
  );

  return {
    form,
    values,
    isDirty: formState.isDirty,
    validateStep,
    getStepErrors,
    resetForm,
    loadFromDraft,
    getStepData,
  };
}

/**
 * Get the field names for a specific step
 */
function getStepFields(step: 1 | 2 | 3): (keyof MatchFormSchemaData)[] {
  switch (step) {
    case 1:
      return [
        'matchDate',
        'startTime',
        'duration',
        'customDurationMinutes',
        'format',
        'playerExpectation',
      ];
    case 2:
      return ['locationType', 'facilityId', 'courtId', 'locationName', 'locationAddress'];
    case 3:
      return [
        'courtStatus',
        'isCourtFree',
        'costSplitType',
        'estimatedCost',
        'visibility',
        'joinMode',
        'notes',
      ];
    default:
      return [];
  }
}

export default useMatchForm;
