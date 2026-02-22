'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link, useRouter } from '@/i18n/navigation';
import { BackButton } from '@/components/back-button';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface OneTimeSlot {
  id?: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  price_cents: number | null;
  reason: string | null;
}

const SLOT_DURATIONS = [30, 60, 90, 120] as const;

export default function OneTimeAvailabilityPage() {
  const t = useTranslations('availability');
  const tOneTime = useTranslations('availability.oneTime');
  const tDurations = useTranslations('availability.durations');
  const params = useParams();
  const router = useRouter();
  const facilityId = params.id as string;
  const courtId = params.courtId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courtName, setCourtName] = useState('');
  const [facilityName, setFacilityName] = useState('');

  // Existing one-time slots
  const [existingSlots, setExistingSlots] = useState<OneTimeSlot[]>([]);

  // New slot form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newSlot, setNewSlot] = useState<Omit<OneTimeSlot, 'id' | 'availability_date'>>({
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 60,
    price_cents: null,
    reason: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch court and facility info
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select('name, court_number, facility_id, facility:facility_id (id, name)')
      .eq('id', courtId)
      .single();

    if (courtError || !court) {
      setError('Court not found');
      setLoading(false);
      return;
    }

    const facilityData = court.facility as { id: string; name: string } | null;
    setCourtName(court.name || `Court ${court.court_number}`);
    setFacilityName(facilityData?.name || 'Facility');

    // Fetch existing one-time availabilities
    // Get both court-specific and facility-wide slots
    const today = new Date().toISOString().split('T')[0];

    // Fetch court-specific slots
    const { data: courtSlots, error: courtSlotsError } = await supabase
      .from('court_one_time_availability')
      .select('*')
      .eq('court_id', courtId)
      .eq('is_available', true)
      .gte('availability_date', today)
      .order('availability_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Fetch facility-wide slots
    const { data: facilitySlots, error: facilitySlotsError } = await supabase
      .from('court_one_time_availability')
      .select('*')
      .eq('facility_id', court.facility_id)
      .is('court_id', null)
      .eq('is_available', true)
      .gte('availability_date', today)
      .order('availability_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (courtSlotsError || facilitySlotsError) {
      console.error('Error fetching one-time slots:', courtSlotsError || facilitySlotsError);
      setError('Failed to load one-time availability');
      setLoading(false);
      return;
    }

    // Combine and deduplicate (court-specific takes precedence)
    const allSlots = [...(facilitySlots || []), ...(courtSlots || [])];
    const slotsMap = new Map();
    for (const slot of allSlots) {
      const key = `${slot.availability_date}-${slot.start_time}-${slot.end_time}`;
      // Court-specific slots override facility-wide for same date/time
      if (!slotsMap.has(key) || slot.court_id) {
        slotsMap.set(key, slot);
      }
    }
    const slots = Array.from(slotsMap.values());

    setExistingSlots(
      (slots || []).map(s => ({
        id: s.id,
        availability_date: s.availability_date,
        start_time: s.start_time?.substring(0, 5) || '09:00',
        end_time: s.end_time?.substring(0, 5) || '17:00',
        slot_duration_minutes: s.slot_duration_minutes || 60,
        price_cents: s.price_cents,
        reason: s.reason,
      }))
    );
    setLoading(false);
  }, [courtId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSlot = async () => {
    if (!selectedDate) {
      setError(tOneTime('selectDateFirst'));
      return;
    }

    // Validate that end_time is after start_time
    if (newSlot.end_time <= newSlot.start_time) {
      setError(tOneTime('endTimeMustBeAfterStartTime'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get facility_id from court
      const { data: court } = await supabase
        .from('court')
        .select('facility_id')
        .eq('id', courtId)
        .single();

      if (!court) {
        throw new Error('Court not found');
      }

      const { error: insertError } = await supabase.from('court_one_time_availability').insert({
        court_id: courtId,
        facility_id: court.facility_id,
        availability_date: selectedDate,
        start_time: newSlot.start_time + ':00',
        end_time: newSlot.end_time + ':00',
        slot_duration_minutes: newSlot.slot_duration_minutes,
        price_cents: newSlot.price_cents,
        reason: newSlot.reason,
      });

      if (insertError) throw insertError;

      // Refresh data
      await fetchData();
      setIsModalOpen(false);
      setSelectedDate('');
      setNewSlot({
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 60,
        price_cents: null,
        reason: null,
      });
    } catch (err) {
      console.error('Error adding one-time slot:', err);
      setError(tOneTime('addError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    setDeleting(slotId);
    setError(null);

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('court_one_time_availability')
        .delete()
        .eq('id', slotId);

      if (deleteError) throw deleteError;

      setExistingSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Error deleting one-time slot:', err);
      setError(tOneTime('deleteError'));
    } finally {
      setDeleting(null);
    }
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      // Reset form when modal closes
      setSelectedDate('');
      setNewSlot({
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 60,
        price_cents: null,
        reason: null,
      });
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <BackButton className="p-2 hover:bg-muted rounded-md transition-colors mt-1 inline-flex items-center">
            <span className="sr-only">Back</span>
          </BackButton>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{facilityName}</p>
            <h1 className="text-3xl font-bold mb-0">{tOneTime('title')}</h1>
            <p className="text-muted-foreground mb-0">{courtName}</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="default">
          <Plus className="size-4 mr-2" />
          {tOneTime('addNewSlot')}
        </Button>
      </div>

      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            {tOneTime('title')}
          </CardTitle>
          <CardDescription>{tOneTime('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-0">{tOneTime('hint')}</p>
        </CardContent>
      </Card>

      {/* Add Slot Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              {tOneTime('addSlot')}
            </DialogTitle>
            <DialogDescription>{tOneTime('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{tOneTime('selectDate')}</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                min={(() => {
                  const d = new Date();
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })()}
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('weeklySchedule.openTime')}</label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={e => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('weeklySchedule.closeTime')}</label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={e => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Slot Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('facilityTemplate.slotDuration')}</label>
              <Select
                value={newSlot.slot_duration_minutes.toString()}
                onValueChange={v =>
                  setNewSlot(prev => ({ ...prev, slot_duration_minutes: parseInt(v) }))
                }
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

            {/* Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('facilityTemplate.defaultPrice')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={newSlot.price_cents ? (newSlot.price_cents / 100).toFixed(2) : ''}
                  onChange={e =>
                    setNewSlot(prev => ({
                      ...prev,
                      price_cents: e.target.value
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : null,
                    }))
                  }
                  className="pl-7"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reason/Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{tOneTime('reason')}</label>
              <Input
                value={newSlot.reason || ''}
                onChange={e => setNewSlot(prev => ({ ...prev, reason: e.target.value || null }))}
                placeholder={tOneTime('reasonPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleModalClose(false)}>
              {tOneTime('cancel')}
            </Button>
            <Button onClick={handleAddSlot} disabled={saving || !selectedDate}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {tOneTime('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Slots Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            {tOneTime('existingSlots')}
          </CardTitle>
          <CardDescription>{tOneTime('existingSlotsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {existingSlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="size-12 mx-auto mb-3 opacity-50" />
              <p>{tOneTime('noSlots')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tOneTime('date')}</TableHead>
                  <TableHead>{tOneTime('time')}</TableHead>
                  <TableHead>{tOneTime('duration')}</TableHead>
                  <TableHead>{tOneTime('price')}</TableHead>
                  <TableHead>{tOneTime('reason')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingSlots.map(slot => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {new Date(slot.availability_date + 'T00:00:00').toLocaleDateString(
                          undefined,
                          {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {slot.start_time} - {slot.end_time}
                    </TableCell>
                    <TableCell>
                      {tDurations(
                        slot.slot_duration_minutes.toString() as '30' | '60' | '90' | '120'
                      )}
                    </TableCell>
                    <TableCell>
                      {slot.price_cents ? `$${(slot.price_cents / 100).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{slot.reason || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => slot.id && handleDeleteSlot(slot.id)}
                        disabled={deleting === slot.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === slot.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
