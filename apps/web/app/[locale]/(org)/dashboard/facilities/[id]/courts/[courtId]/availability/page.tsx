'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, useRouter } from '@/i18n/navigation';
import {
  adjustEndTimeToValidMultiple,
  calculateSlotCount,
  formatDuration,
  validateSchedule,
  type ValidationError,
  type ValidationResult,
} from '@/lib/availability-validation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Enums, TablesInsert } from '@/types';

type DayOfWeek = Enums<'day_of_week'>;

interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeeklySchedule = Record<DayOfWeek, DaySchedule>;

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const SLOT_DURATIONS = [30, 60, 90, 120] as const;

const createEmptySchedule = (): WeeklySchedule => {
  const schedule: Partial<WeeklySchedule> = {};
  for (const day of DAYS_OF_WEEK) {
    schedule[day] = { enabled: false, slots: [] };
  }
  return schedule as WeeklySchedule;
};

// Get a default slot that's valid for the given duration
const getDefaultSlot = (slotDuration: number): TimeSlot => ({
  start_time: '09:00',
  end_time: slotDuration === 90 ? '18:00' : slotDuration === 120 ? '17:00' : '17:00',
  is_available: true,
});

// Validation feedback component for individual slots
function SlotValidationFeedback({
  day,
  slotIndex,
  errors,
  warnings,
}: {
  day: string;
  slotIndex: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}) {
  const slotErrors = errors.filter(e => e.day === day && e.slotIndex === slotIndex);
  const slotWarnings = warnings.filter(e => e.day === day && e.slotIndex === slotIndex);

  if (slotErrors.length === 0 && slotWarnings.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {slotErrors.map((err, i) => (
        <div
          key={`err-${i}`}
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{err.message}</span>
        </div>
      ))}
      {slotWarnings.map((warn, i) => (
        <div
          key={`warn-${i}`}
          className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400"
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{warn.message}</span>
        </div>
      ))}
    </div>
  );
}

// Slot preview showing how many bookable slots will be generated
function SlotPreview({
  startTime,
  endTime,
  slotDuration,
}: {
  startTime: string;
  endTime: string;
  slotDuration: number;
}) {
  const { complete, partial } = calculateSlotCount(startTime, endTime, slotDuration);

  if (complete === 0 && partial === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'ml-2 text-xs',
              partial > 0
                ? 'border-yellow-500/50 text-yellow-600'
                : 'border-green-500/50 text-green-600'
            )}
          >
            {complete} slot{complete !== 1 ? 's' : ''}
            {partial > 0 && ' + partial'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {complete} × {formatDuration(slotDuration)} slots
            {partial > 0 && ` (${formatDuration(partial)} unused)`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function CourtAvailabilityPage() {
  const t = useTranslations('availability');
  const tDays = useTranslations('availability.days');
  const tDurations = useTranslations('availability.durations');
  const tValidation = useTranslations('availability.validation');
  const params = useParams();
  const router = useRouter();
  const facilityId = params.id as string;
  const courtId = params.courtId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courtName, setCourtName] = useState('');
  const [facilityName, setFacilityName] = useState('');

  // Whether to use custom schedule or facility defaults
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [hasExistingCustom, setHasExistingCustom] = useState(false);

  // Schedule state
  const [schedule, setSchedule] = useState<WeeklySchedule>(createEmptySchedule);
  const [slotDuration, setSlotDuration] = useState<number>(60);
  const [defaultPriceCents, setDefaultPriceCents] = useState<number>(0);

  // Validation state (only validate if using custom schedule)
  const validation: ValidationResult = useMemo(() => {
    if (!useCustomSchedule) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateSchedule(schedule, slotDuration);
  }, [schedule, slotDuration, useCustomSchedule]);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch court and facility info
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select('name, court_number, facility:facility_id (name)')
      .eq('id', courtId)
      .single();

    if (courtError || !court) {
      setError('Court not found');
      setLoading(false);
      return;
    }

    const facilityData = court.facility as { name: string } | null;
    setCourtName(court.name || `Court ${court.court_number}`);
    setFacilityName(facilityData?.name || 'Facility');

    // Fetch existing court-specific templates
    type TemplateRow = {
      id: string;
      day_of_week: string;
      start_time: string;
      end_time: string;
      is_available: boolean | null;
      slot_duration_minutes?: number;
      price_cents?: number;
    };

    const { data: templates, error: templatesError } = (await supabase
      .from('court_slot')
      .select('*')
      .eq('court_id', courtId)
      .order('day_of_week')
      .order('start_time')) as { data: TemplateRow[] | null; error: unknown };

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      setError('Failed to load schedule');
      setLoading(false);
      return;
    }

    // Check if court has custom schedule
    const hasCustom = !!(templates && templates.length > 0);
    setHasExistingCustom(hasCustom);

    // Convert templates to schedule format
    const newSchedule = createEmptySchedule();
    let shouldShowSchedule = false;

    if (hasCustom) {
      // Court has custom schedule - toggle should be ON
      shouldShowSchedule = true;

      // Get slot duration and price from first template
      const firstTemplate = templates[0];
      setSlotDuration(firstTemplate.slot_duration_minutes || 60);
      setDefaultPriceCents(firstTemplate.price_cents || 0);

      // Group by day
      for (const template of templates) {
        const day = template.day_of_week as DayOfWeek;
        if (newSchedule[day]) {
          newSchedule[day].enabled = true;
          newSchedule[day].slots.push({
            id: template.id,
            start_time: template.start_time?.substring(0, 5) || '09:00',
            end_time: template.end_time?.substring(0, 5) || '17:00',
            is_available: template.is_available ?? true,
          });
        }
      }
    } else {
      // Court doesn't have custom schedule - it uses facility defaults
      // Load facility defaults to pre-populate and show them
      const { data: facilityTemplates, error: facilityTemplatesError } = (await supabase
        .from('court_slot')
        .select('*')
        .eq('facility_id', facilityId)
        .is('court_id', null)
        .order('day_of_week')
        .order('start_time')) as { data: TemplateRow[] | null; error: unknown };

      if (facilityTemplatesError) {
        console.error('Error fetching facility templates:', facilityTemplatesError);
      }

      if (facilityTemplates && facilityTemplates.length > 0) {
        // Court uses facility defaults - toggle should be OFF
        // But pre-load facility defaults into schedule state so they're ready
        // if user decides to enable custom schedule
        const firstTemplate = facilityTemplates[0];
        setSlotDuration(firstTemplate.slot_duration_minutes || 60);
        setDefaultPriceCents(firstTemplate.price_cents || 0);

        for (const template of facilityTemplates) {
          const day = template.day_of_week as DayOfWeek;
          if (newSchedule[day]) {
            newSchedule[day].enabled = true;
            newSchedule[day].slots.push({
              start_time: template.start_time?.substring(0, 5) || '09:00',
              end_time: template.end_time?.substring(0, 5) || '17:00',
              is_available: template.is_available ?? true,
            });
          }
        }
      }
      // Court uses facility defaults - shouldShowSchedule stays false
    }

    // Set the toggle state after all data is loaded
    setUseCustomSchedule(shouldShowSchedule);
    setSchedule(newSchedule);
    setLoading(false);
  }, [courtId, facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDayToggle = (day: DayOfWeek, enabled: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        enabled,
        slots:
          enabled && prev[day].slots.length === 0
            ? [getDefaultSlot(slotDuration)]
            : prev[day].slots,
      },
    }));
  };

  const handleAddSlot = (day: DayOfWeek) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, getDefaultSlot(slotDuration)],
      },
    }));
  };

  const handleRemoveSlot = (day: DayOfWeek, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSlotChange = (
    day: DayOfWeek,
    index: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
      },
    }));
  };

  // Auto-adjust end time to be a valid multiple
  const handleAutoAdjustEndTime = (day: DayOfWeek, index: number) => {
    const slot = schedule[day].slots[index];
    const adjustedEndTime = adjustEndTimeToValidMultiple(
      slot.start_time,
      slot.end_time,
      slotDuration
    );
    handleSlotChange(day, index, 'end_time', adjustedEndTime);
  };

  // When slot duration changes
  const handleSlotDurationChange = (newDuration: number) => {
    setSlotDuration(newDuration);
  };

  const handleSave = async () => {
    // Validate before saving (only if using custom schedule)
    if (useCustomSchedule && !validation.isValid) {
      setError(tValidation('fixErrorsBeforeSaving'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Delete all existing court-specific templates
      await supabase.from('court_slot').delete().eq('court_id', courtId);

      if (useCustomSchedule) {
        // Create new templates
        const newTemplates: TablesInsert<'court_slot'>[] = [];

        for (const day of DAYS_OF_WEEK) {
          const daySchedule = schedule[day];
          if (daySchedule.enabled) {
            for (const slot of daySchedule.slots) {
              newTemplates.push({
                facility_id: facilityId,
                court_id: courtId,
                day_of_week: day,
                start_time: slot.start_time + ':00',
                end_time: slot.end_time + ':00',
                is_available: true,
                slot_duration_minutes: slotDuration,
                price_cents: defaultPriceCents,
              });
            }
          }
        }

        if (newTemplates.length > 0) {
          const { error: insertError } = await supabase.from('court_slot').insert(newTemplates);
          if (insertError) throw insertError;
        }
      }

      router.push(`/dashboard/facilities/${facilityId}/courts/${courtId}`);
      router.refresh();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError(t('facilityTemplate.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasEnabledDays = DAYS_OF_WEEK.some(day => schedule[day].enabled);

  return (
    <div className="flex flex-col w-full gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/dashboard/facilities/${facilityId}/courts/${courtId}`}
          className="p-2 hover:bg-muted rounded-md transition-colors mt-1"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-sm text-muted-foreground mb-1">{facilityName}</p>
          <h1 className="text-3xl font-bold mb-0">{t('courtOverride.title')}</h1>
          <p className="text-muted-foreground">{courtName}</p>
        </div>
      </div>

      {/* Use Custom Schedule Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            {t('courtOverride.title')}
          </CardTitle>
          <CardDescription>{t('courtOverride.useFacilityDefaultsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${
                  useCustomSchedule ? 'bg-blue-500' : 'bg-green-500'
                }`}
              />
              <div>
                <p className="font-medium mb-0">
                  {useCustomSchedule
                    ? t('courtOverride.customSchedule')
                    : t('courtOverride.useFacilityDefaults')}
                </p>
                <p className="text-sm text-muted-foreground mb-0">
                  {useCustomSchedule
                    ? t('courtOverride.customScheduleDescription')
                    : t('courtOverride.noOverrides')}
                </p>
              </div>
            </div>
            <Switch checked={useCustomSchedule} onCheckedChange={setUseCustomSchedule} />
          </div>

          {hasExistingCustom && !useCustomSchedule && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Saving will remove the existing custom schedule for this court.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Schedule Editor */}
      {useCustomSchedule && (
        <>
          {/* Validation Summary */}
          {hasEnabledDays && (
            <Card
              className={cn(
                'border-l-4',
                validation.isValid && validation.warnings.length === 0 && 'border-l-green-500',
                validation.isValid && validation.warnings.length > 0 && 'border-l-yellow-500',
                !validation.isValid && 'border-l-red-500'
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {validation.isValid && validation.warnings.length === 0 && (
                    <>
                      <CheckCircle2 className="size-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {tValidation('allSlotsValid')}
                      </span>
                    </>
                  )}
                  {validation.isValid && validation.warnings.length > 0 && (
                    <>
                      <AlertTriangle className="size-5 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        {tValidation('validWithWarnings', { count: validation.warnings.length })}
                      </span>
                    </>
                  )}
                  {!validation.isValid && (
                    <>
                      <AlertCircle className="size-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        {tValidation('hasErrors', { count: validation.errors.length })}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Schedule Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('facilityTemplate.slotDuration')}
                  </label>
                  <Select
                    value={slotDuration.toString()}
                    onValueChange={v => handleSlotDurationChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_DURATIONS.map(duration => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {tDurations(duration.toString() as '30' | '60' | '90' | '120')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('facilityTemplate.defaultPrice')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      value={(defaultPriceCents / 100).toFixed(2)}
                      onChange={e =>
                        setDefaultPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))
                      }
                      className="pl-7"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              {/* Duration info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {tValidation('slotDurationInfo', { duration: formatDuration(slotDuration) })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                {t('weeklySchedule.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map(day => {
                const dayErrors = validation.errors.filter(e => e.day === day);
                const dayWarnings = validation.warnings.filter(e => e.day === day);
                const hasIssues = dayErrors.length > 0 || dayWarnings.length > 0;

                return (
                  <div
                    key={day}
                    className={cn(
                      'border rounded-lg p-4 transition-colors',
                      schedule[day].enabled &&
                        dayErrors.length > 0 &&
                        'border-red-300 dark:border-red-800',
                      schedule[day].enabled &&
                        dayErrors.length === 0 &&
                        dayWarnings.length > 0 &&
                        'border-yellow-300 dark:border-yellow-800'
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={schedule[day].enabled}
                          onCheckedChange={checked => handleDayToggle(day, checked)}
                        />
                        <span className="font-medium">{tDays(day)}</span>
                        {schedule[day].enabled && hasIssues && (
                          <Badge
                            variant="outline"
                            className={cn(
                              dayErrors.length > 0
                                ? 'border-red-500/50 text-red-600'
                                : 'border-yellow-500/50 text-yellow-600'
                            )}
                          >
                            {dayErrors.length > 0
                              ? `${dayErrors.length} error${dayErrors.length > 1 ? 's' : ''}`
                              : `${dayWarnings.length} warning${dayWarnings.length > 1 ? 's' : ''}`}
                          </Badge>
                        )}
                      </div>
                      {schedule[day].enabled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSlot(day)}
                        >
                          <Plus className="size-4 mr-1" />
                          {t('weeklySchedule.addTimeSlot')}
                        </Button>
                      )}
                    </div>

                    {schedule[day].enabled ? (
                      <div className="space-y-4">
                        {schedule[day].slots.map((slot, index) => {
                          const slotErrors = validation.errors.filter(
                            e => e.day === day && e.slotIndex === index
                          );
                          const slotWarnings = validation.warnings.filter(
                            e => e.day === day && e.slotIndex === index
                          );
                          const hasSlotIssues = slotErrors.length > 0 || slotWarnings.length > 0;

                          return (
                            <div key={index} className="pl-10">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-muted-foreground">
                                    {t('weeklySchedule.openTime')}
                                  </label>
                                  <Input
                                    type="time"
                                    value={slot.start_time}
                                    onChange={e =>
                                      handleSlotChange(day, index, 'start_time', e.target.value)
                                    }
                                    className={cn(
                                      'w-32',
                                      slotErrors.some(e => e.field === 'start_time') &&
                                        'border-red-500'
                                    )}
                                  />
                                </div>
                                <span className="text-muted-foreground">—</span>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-muted-foreground">
                                    {t('weeklySchedule.closeTime')}
                                  </label>
                                  <Input
                                    type="time"
                                    value={slot.end_time}
                                    onChange={e =>
                                      handleSlotChange(day, index, 'end_time', e.target.value)
                                    }
                                    className={cn(
                                      'w-32',
                                      slotErrors.some(
                                        e => e.field === 'end_time' || e.field === 'duration'
                                      ) && 'border-red-500'
                                    )}
                                  />
                                </div>

                                <SlotPreview
                                  startTime={slot.start_time}
                                  endTime={slot.end_time}
                                  slotDuration={slotDuration}
                                />

                                {hasSlotIssues &&
                                  slotWarnings.some(w => w.field === 'duration') && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleAutoAdjustEndTime(day, index)}
                                            className="text-yellow-600 hover:text-yellow-700"
                                          >
                                            {tValidation('autoAdjust')}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{tValidation('autoAdjustTooltip')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                {schedule[day].slots.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSlot(day, index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </div>

                              <SlotValidationFeedback
                                day={day}
                                slotIndex={index}
                                errors={validation.errors}
                                warnings={validation.warnings}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-10">
                        {t('weeklySchedule.closed')}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions - show when custom schedule is enabled OR when removing existing custom schedule */}
      {(useCustomSchedule || hasExistingCustom) && (
        <>
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              disabled={saving || (useCustomSchedule && !validation.isValid)}
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? t('facilityTemplate.saving') : t('facilityTemplate.saveButton')}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/facilities/${facilityId}/courts/${courtId}`}>Cancel</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
