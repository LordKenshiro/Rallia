'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Ban,
  Calendar,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  LayoutGrid,
  Loader2,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Facility {
  id: string;
  name: string;
}

interface Court {
  id: string;
  name: string | null;
  court_number: number | null;
  facility_id: string;
  slot_duration_minutes: number; // Duration from court or facility settings
  availability_status: string | null;
}

interface SlotData {
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  price_cents: number;
  status: 'available' | 'booked' | 'blocked';
  booking_id?: string;
  player_name?: string;
  player_email?: string;
}

// Format a Date to YYYY-MM-DD in local timezone (not UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert time string (HH:MM:SS) to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to time string (HH:MM)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Format time for display (e.g., "9:00 AM")
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Operating hours
const START_HOUR = 7; // 7am
const END_HOUR = 21; // 9pm
const OPERATING_MINUTES = (END_HOUR - START_HOUR) * 60; // 840 minutes

// Skeleton for calendar grid
function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="p-3">
                  <Skeleton className="h-4 w-16" />
                </th>
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="p-3 text-center">
                    <Skeleton className="h-4 w-20 mx-auto" />
                    <Skeleton className="h-3 w-14 mx-auto mt-1" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b">
                  <td className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  {Array.from({ length: 7 }).map((_, colIdx) => (
                    <td key={colIdx} className="p-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 8 }).map((_, slotIdx) => (
                          <Skeleton
                            key={slotIdx}
                            className="h-6 flex-1 rounded-sm"
                            style={{
                              animationDelay: `${(rowIdx * 7 + colIdx) * 50 + slotIdx * 20}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Slot popover content for quick actions
function SlotPopover({
  status,
  startTime,
  endTime,
  date,
  courtName,
  priceCents,
  playerName,
  playerEmail,
  bookingId,
  onCreateBooking,
  onViewBooking,
}: {
  status: 'available' | 'booked' | 'blocked' | 'none';
  startTime: string;
  endTime: string;
  date: string;
  courtName: string;
  priceCents?: number;
  playerName?: string;
  playerEmail?: string;
  bookingId?: string;
  onCreateBooking: () => void;
  onViewBooking: () => void;
}) {
  const t = useTranslations('availability.calendar');
  const tStatus = useTranslations('availability.calendar.legend');

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{courtName}</span>
          <Badge
            variant={
              status === 'available' ? 'default' : status === 'booked' ? 'secondary' : 'outline'
            }
            className={cn(
              status === 'available' &&
                'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50',
              status === 'booked' &&
                'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50',
              status === 'blocked' &&
                'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/50'
            )}
          >
            {tStatus(status === 'none' ? 'blocked' : status)}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3.5" />
            <span>{timeRange}</span>
          </div>
        </div>
      </div>

      {/* Price for available slots */}
      {status === 'available' && priceCents !== undefined && (
        <div className="text-sm">
          <span className="text-muted-foreground">Price: </span>
          <span className="font-medium">${(priceCents / 100).toFixed(2)}</span>
        </div>
      )}

      {/* Booking info for booked slots */}
      {status === 'booked' && (playerName || playerEmail) && (
        <div className="space-y-1 p-2 rounded-md bg-muted/50">
          {playerName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="size-3.5 text-muted-foreground" />
              <span>{playerName}</span>
            </div>
          )}
          {playerEmail && (
            <div className="text-xs text-muted-foreground truncate">{playerEmail}</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {status === 'available' && (
          <Button size="sm" className="flex-1 gap-1.5" onClick={onCreateBooking}>
            <CalendarPlus className="size-3.5" />
            {t('clickToBook')}
          </Button>
        )}
        {status === 'booked' && bookingId && (
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={onViewBooking}>
            <ExternalLink className="size-3.5" />
            {t('clickToView')}
          </Button>
        )}
        {status === 'blocked' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ban className="size-3.5" />
            <span>{t('slotBlocked')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type ViewMode = 'day' | 'week' | 'month';

export default function AvailabilityCalendarPage() {
  const t = useTranslations('availability');
  const tDays = useTranslations('availability.days');
  const tCourtStatus = useTranslations('courts.status');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [courts, setCourts] = useState<Court[]>([]);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.setDate(diff));
  });
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for the "now" indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeekDates = useCallback(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStart]);

  // Get dates to fetch based on view mode
  const getDatesToFetch = useCallback((): Date[] => {
    if (viewMode === 'day') {
      return [selectedDate];
    } else if (viewMode === 'month') {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const dates: Date[] = [];
      for (let d = 1; d <= lastDay.getDate(); d++) {
        dates.push(new Date(year, month, d));
      }
      return dates;
    } else {
      // Week view
      return getWeekDates();
    }
  }, [viewMode, selectedDate, getWeekDates]);

  // Calculate if a date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Check if a date is in the past
  const isPastDate = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }, []);

  // Check if a specific slot time has passed (for today only)
  const isSlotExpired = useCallback(
    (date: Date, endTime: string) => {
      // If date is in the past, slot is expired
      if (isPastDate(date)) return true;

      // If date is today, check if the slot end time has passed
      if (isToday(date)) {
        const [hours, minutes] = endTime.split(':').map(Number);
        const slotEndMinutes = hours * 60 + minutes;
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        return slotEndMinutes <= currentMinutes;
      }

      return false;
    },
    [isPastDate, isToday, currentTime]
  );

  // Calculate the "now" position as a percentage
  const getNowPosition = useMemo(() => {
    const hour = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    // Only show if within operating hours
    if (hour < START_HOUR || hour >= END_HOUR) return null;

    // Calculate position as percentage of the operating window
    const currentMinutes = (hour - START_HOUR) * 60 + minutes;
    const position = (currentMinutes / OPERATING_MINUTES) * 100;

    return position;
  }, [currentTime]);

  const fetchFacilities = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: membership } = await supabase
      .from('organization_member')
      .select('organization_id')
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (!membership) {
      setLoading(false);
      return;
    }

    const { data: facilitiesData } = await supabase
      .from('facility')
      .select('id, name')
      .eq('organization_id', membership.organization_id)
      .is('archived_at', null)
      .order('name');

    setFacilities(facilitiesData || []);
    if (facilitiesData && facilitiesData.length > 0) {
      setSelectedFacility(facilitiesData[0].id);
    }
    setLoading(false);
  }, []);

  const fetchCourtsAndSlots = useCallback(async () => {
    if (!selectedFacility) return;

    setSlotsLoading(true);
    const supabase = createClient();

    // First, fetch the facility's default slot duration
    type SlotTemplate = {
      slot_duration_minutes: number | null;
      court_id: string | null;
    };

    const { data: facilitySlotConfig } = (await supabase
      .from('court_slot')
      .select('slot_duration_minutes')
      .eq('facility_id', selectedFacility)
      .is('court_id', null)
      .limit(1)) as {
      data: Array<{ slot_duration_minutes: number | null }> | null;
      error: unknown;
    };

    const facilityDefaultDuration = facilitySlotConfig?.[0]?.slot_duration_minutes || 60;

    // Fetch courts for selected facility
    const { data: courtsData } = await supabase
      .from('court')
      .select('id, name, court_number, facility_id, availability_status')
      .eq('facility_id', selectedFacility)
      .eq('is_active', true)
      .order('court_number');

    if (!courtsData || courtsData.length === 0) {
      setCourts([]);
      setSlots([]);
      setSlotsLoading(false);
      return;
    }

    // Fetch court-specific slot configurations
    const courtIds = courtsData.map(c => c.id);
    const { data: courtSlotConfigs } = (await supabase
      .from('court_slot')
      .select('court_id, slot_duration_minutes')
      .in('court_id', courtIds)) as { data: SlotTemplate[] | null; error: unknown };

    // Create a map of court_id -> slot_duration
    const courtDurationMap = new Map<string, number>();
    if (courtSlotConfigs) {
      for (const config of courtSlotConfigs) {
        if (config.court_id && config.slot_duration_minutes) {
          courtDurationMap.set(config.court_id, config.slot_duration_minutes);
        }
      }
    }

    // Build courts with their slot durations
    const courtsWithDuration: Court[] = courtsData.map(court => ({
      ...court,
      slot_duration_minutes: courtDurationMap.get(court.id) || facilityDefaultDuration,
      availability_status: court.availability_status,
    }));

    setCourts(courtsWithDuration);

    // Fetch availability for each court based on view mode
    const datesToFetch = getDatesToFetch();
    const allSlots: SlotData[] = [];

    for (const court of courtsWithDuration) {
      for (const date of datesToFetch) {
        const dateStr = formatDateLocal(date);

        // Call the get_available_slots function
        const { data: slotsData, error } = await supabase.rpc('get_available_slots', {
          p_court_id: court.id,
          p_date: dateStr,
        });

        if (error) {
          console.error('Error fetching slots:', error);
          continue;
        }

        if (slotsData) {
          for (const slot of slotsData) {
            allSlots.push({
              court_id: court.id,
              date: dateStr,
              start_time: slot.start_time,
              end_time: slot.end_time,
              price_cents: slot.price_cents || 0,
              status: 'available',
            });
          }
        }

        // Fetch bookings for this court and date with player info
        const { data: bookings } = (await supabase
          .from('booking')
          .select(
            `
            id, 
            start_time, 
            end_time,
            player:player_id (
              first_name,
              last_name,
              email
            ),
            guest_name,
            guest_email
          `
          )
          .eq('court_id', court.id)
          .eq('booking_date', dateStr)
          .not('status', 'eq', 'cancelled')) as {
          data: Array<{
            id: string;
            start_time: string;
            end_time: string;
            player: { first_name: string; last_name: string; email: string } | null;
            guest_name: string | null;
            guest_email: string | null;
          }> | null;
          error: unknown;
        };

        if (bookings) {
          for (const booking of bookings) {
            const playerName =
              booking.player?.first_name && booking.player?.last_name
                ? `${booking.player.first_name} ${booking.player.last_name}`
                : booking.guest_name || undefined;
            const playerEmail = booking.player?.email || booking.guest_email || undefined;

            allSlots.push({
              court_id: court.id,
              date: dateStr,
              start_time: booking.start_time,
              end_time: booking.end_time,
              price_cents: 0,
              status: 'booked',
              booking_id: booking.id,
              player_name: playerName,
              player_email: playerEmail,
            });
          }
        }

        // Fetch blocks for this court and date
        const { data: blocks } = await supabase
          .from('availability_block')
          .select('start_time, end_time')
          .eq('block_date', dateStr)
          .or(`court_id.eq.${court.id},and(facility_id.eq.${selectedFacility},court_id.is.null)`);

        if (blocks) {
          for (const block of blocks) {
            allSlots.push({
              court_id: court.id,
              date: dateStr,
              start_time: block.start_time || '00:00:00',
              end_time: block.end_time || '23:59:59',
              price_cents: 0,
              status: 'blocked',
            });
          }
        }
      }
    }

    setSlots(allSlots);
    setSlotsLoading(false);
  }, [selectedFacility, getDatesToFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchFacilities();
  }, [fetchFacilities]);

  useEffect(() => {
    if (selectedFacility) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchCourtsAndSlots();
    }
  }, [selectedFacility, fetchCourtsAndSlots]);

  const goToPrevious = () => {
    if (viewMode === 'day') {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      const newDate = new Date(weekStart);
      newDate.setDate(newDate.getDate() - 7);
      setWeekStart(newDate);
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setSelectedDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      const newDate = new Date(weekStart);
      newDate.setDate(newDate.getDate() + 7);
      setWeekStart(newDate);
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(new Date().setDate(diff)));
  };

  // Generate time slots for a court based on its slot duration
  const generateTimeSlots = useCallback((slotDurationMinutes: number) => {
    const slots: { startTime: string; endTime: string; startMinutes: number }[] = [];
    const startMinutes = START_HOUR * 60;
    const endMinutes = END_HOUR * 60;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDurationMinutes) {
      const endSlotMinutes = Math.min(minutes + slotDurationMinutes, endMinutes);
      slots.push({
        startTime: minutesToTime(minutes) + ':00',
        endTime: minutesToTime(endSlotMinutes) + ':00',
        startMinutes: minutes,
      });
    }

    return slots;
  }, []);

  // Get slot data for a specific time range
  const getSlotDataForTime = useCallback(
    (
      courtId: string,
      date: string,
      startTime: string,
      endTime: string
    ): { status: 'available' | 'booked' | 'blocked' | 'none'; slot?: SlotData } => {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Check for blocks first (highest priority)
      const blockedSlot = slots.find(s => {
        if (s.court_id !== courtId || s.date !== date || s.status !== 'blocked') return false;
        const slotStart = timeToMinutes(s.start_time);
        const slotEnd = timeToMinutes(s.end_time);
        // Check if there's any overlap
        return slotStart < endMinutes && slotEnd > startMinutes;
      });
      if (blockedSlot) return { status: 'blocked', slot: blockedSlot };

      // Check for bookings
      const bookedSlot = slots.find(s => {
        if (s.court_id !== courtId || s.date !== date || s.status !== 'booked') return false;
        const slotStart = timeToMinutes(s.start_time);
        const slotEnd = timeToMinutes(s.end_time);
        // Check if there's any overlap
        return slotStart < endMinutes && slotEnd > startMinutes;
      });
      if (bookedSlot) return { status: 'booked', slot: bookedSlot };

      // Check for available slots - need exact match or containment
      const availableSlot = slots.find(s => {
        if (s.court_id !== courtId || s.date !== date || s.status !== 'available') return false;
        const slotStart = timeToMinutes(s.start_time);
        const slotEnd = timeToMinutes(s.end_time);
        // The display slot should be fully contained within an available slot
        return slotStart <= startMinutes && slotEnd >= endMinutes;
      });
      if (availableSlot) return { status: 'available', slot: availableSlot };

      return { status: 'none' };
    },
    [slots]
  );

  const getStatusColor = (
    status: 'available' | 'booked' | 'blocked' | 'none',
    isExpired: boolean = false,
    isHovered: boolean = false
  ) => {
    // Expired slots are muted
    if (isExpired) {
      const expiredBase = {
        available: 'bg-gray-200/30 dark:bg-gray-800/30 border-gray-300/30 dark:border-gray-700/30',
        booked: 'bg-blue-500/10 border-blue-500/20',
        blocked: 'bg-gray-500/10 border-gray-500/20',
        none: 'bg-muted/20 border-transparent',
      }[status];
      return cn(expiredBase, 'opacity-50 cursor-not-allowed');
    }

    const base = {
      available: 'bg-green-500/20 border-green-500/50',
      booked: 'bg-blue-500/20 border-blue-500/50',
      blocked: 'bg-gray-500/20 border-gray-500/50',
      none: 'bg-muted/30 border-transparent',
    }[status];

    const hover = {
      available: 'hover:bg-green-500/40 hover:border-green-500/70 hover:scale-105',
      booked: 'hover:bg-blue-500/40 hover:border-blue-500/70 hover:scale-105',
      blocked: 'hover:bg-gray-500/30',
      none: '',
    }[status];

    return cn(base, hover, isHovered && 'ring-2 ring-offset-1 ring-primary/50');
  };

  const handleCreateBooking = (courtId: string, date: string, startTime: string) => {
    const params = new URLSearchParams({
      courtId,
      date,
      startTime,
    });
    router.push(`/dashboard/bookings/new?${params.toString()}`);
    setOpenPopover(null);
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`);
    setOpenPopover(null);
  };

  const weekDates = getWeekDates();
  const dayNames: Array<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  > = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-0">{t('calendar.title')}</h1>
          <p className="text-muted-foreground">{t('calendar.description')}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedFacility} onValueChange={setSelectedFacility}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder={t('calendar.selectFacility')} />
            </SelectTrigger>
            <SelectContent>
              {facilities.map(facility => (
                <SelectItem key={facility.id} value={facility.id}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-none h-9 px-3"
            >
              <Calendar className="size-4 mr-1.5" />
              {t('calendar.viewMode.day')}
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-none border-l h-9 px-3"
            >
              <CalendarDays className="size-4 mr-1.5" />
              {t('calendar.viewMode.week')}
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-none border-l h-9 px-3"
            >
              <LayoutGrid className="size-4 mr-1.5" />
              {t('calendar.viewMode.month')}
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              {t('calendar.today')}
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-green-500/40 border border-green-500/50" />
          <span>{t('calendar.legend.available')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-blue-500/40 border border-blue-500/50" />
          <span>{t('calendar.legend.booked')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-gray-500/40 border border-gray-500/50" />
          <span>{t('calendar.legend.blocked')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/30 dark:border-gray-700/30 opacity-50" />
          <span className="text-muted-foreground">{t('calendar.legend.past')}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
          <div className="w-0.5 h-4 bg-red-500 rounded-full" />
          <span>{t('calendar.currentTime')}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {slotsLoading ? (
        <CalendarSkeleton />
      ) : courts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {facilities.length === 0
                ? 'No facilities found. Create a facility first.'
                : 'No courts found at this facility.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'day' ? (
        /* Day View */
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </CardTitle>
            <CardDescription>
              {isToday(selectedDate) ? t('calendar.today') : selectedDate.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courts.map((court, courtIndex) => {
                const timeSlots = generateTimeSlots(court.slot_duration_minutes);
                const dateStr = formatDateLocal(selectedDate);

                return (
                  <div
                    key={court.id}
                    className="border rounded-lg p-4"
                    style={{
                      animationDelay: `${courtIndex * 50}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold">
                        {court.name || `Court ${court.court_number}`}
                      </span>
                      {court.availability_status && court.availability_status !== 'available' && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            court.availability_status === 'maintenance' &&
                              'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50',
                            court.availability_status === 'closed' &&
                              'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/50'
                          )}
                        >
                          {tCourtStatus(court.availability_status)}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {timeSlots.map(timeSlot => {
                        const { status, slot } = getSlotDataForTime(
                          court.id,
                          dateStr,
                          timeSlot.startTime,
                          timeSlot.endTime
                        );
                        const expired = isSlotExpired(selectedDate, timeSlot.endTime);
                        const isClickable =
                          !expired && (status === 'available' || status === 'booked');
                        const popoverId = `${court.id}-${dateStr}-${timeSlot.startTime}`;
                        const courtName = court.name || `Court ${court.court_number}`;

                        return (
                          <Popover
                            key={timeSlot.startTime}
                            open={openPopover === popoverId}
                            onOpenChange={open => setOpenPopover(open ? popoverId : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  'p-2 rounded-md border text-center transition-all duration-150',
                                  getStatusColor(status, expired),
                                  isClickable ? 'cursor-pointer' : 'cursor-default',
                                  'focus:outline-none focus:ring-2 focus:ring-primary/50'
                                )}
                                disabled={!isClickable}
                              >
                                <div className="text-xs font-medium">
                                  {formatTime(timeSlot.startTime)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatTime(timeSlot.endTime)}
                                </div>
                              </button>
                            </PopoverTrigger>
                            {isClickable && (
                              <PopoverContent
                                align="center"
                                side="top"
                                className="w-72"
                                sideOffset={8}
                              >
                                <SlotPopover
                                  status={status}
                                  startTime={slot?.start_time || timeSlot.startTime}
                                  endTime={slot?.end_time || timeSlot.endTime}
                                  date={dateStr}
                                  courtName={courtName}
                                  priceCents={slot?.price_cents}
                                  playerName={slot?.player_name}
                                  playerEmail={slot?.player_email}
                                  bookingId={slot?.booking_id}
                                  onCreateBooking={() =>
                                    handleCreateBooking(court.id, dateStr, timeSlot.startTime)
                                  }
                                  onViewBooking={() =>
                                    slot?.booking_id && handleViewBooking(slot.booking_id)
                                  }
                                />
                              </PopoverContent>
                            )}
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'month' ? (
        /* Month View - Enhanced */
        <div className="space-y-4">
          {/* Month Summary Stats */}
          {(() => {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const lastDay = new Date(year, month + 1, 0);

            let totalBookings = 0;
            let totalAvailable = 0;
            let totalBlocked = 0;

            for (let d = 1; d <= lastDay.getDate(); d++) {
              const dateStr = formatDateLocal(new Date(year, month, d));
              const daySlots = slots.filter(s => s.date === dateStr);
              totalBookings += daySlots.filter(s => s.status === 'booked').length;
              totalAvailable += daySlots.filter(s => s.status === 'available').length;
              totalBlocked += daySlots.filter(s => s.status === 'blocked').length;
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500/20">
                        <CalendarDays className="size-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-0">
                          {totalBookings}
                        </p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-0">
                          {t('calendar.monthView.totalBookings')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/20">
                        <Clock className="size-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-0">
                          {totalAvailable}
                        </p>
                        <p className="text-xs text-green-600/80 dark:text-green-400/80 mb-0">
                          {t('calendar.monthView.availableSlots')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-500/10 border-gray-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gray-500/20">
                        <Ban className="size-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-0">
                          {totalBlocked}
                        </p>
                        <p className="text-xs text-gray-600/80 dark:text-gray-400/80 mb-0">
                          {t('calendar.monthView.blockedSlots')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-purple-500/20">
                        <Calendar className="size-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-0">
                          {totalBookings > 0 && totalAvailable + totalBookings > 0
                            ? Math.round((totalBookings / (totalAvailable + totalBookings)) * 100)
                            : 0}
                          %
                        </p>
                        <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mb-0">
                          {t('calendar.monthView.occupancyRate')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Calendar Grid */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">
                {selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription>{t('calendar.monthView.clickToViewDay')}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-muted-foreground py-3 border-b"
                  >
                    {tDays(day).slice(0, 3)}
                  </div>
                ))}
                {/* Calendar days */}
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
                  const days: Array<Date | null> = [];

                  // Add padding for days before the first of the month
                  for (let i = 0; i < startPadding; i++) {
                    days.push(null);
                  }

                  // Add all days of the month
                  for (let d = 1; d <= lastDay.getDate(); d++) {
                    days.push(new Date(year, month, d));
                  }

                  return days.map((date, idx) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[100px] bg-muted/20 rounded-lg"
                        />
                      );
                    }

                    const dateStr = formatDateLocal(date);
                    const isTodayDate = isToday(date);
                    const isPast = isPastDate(date);

                    // Get detailed stats for this day
                    const daySlots = slots.filter(s => s.date === dateStr);
                    const dayBookings = daySlots.filter(s => s.status === 'booked');
                    const dayAvailable = daySlots.filter(s => s.status === 'available');
                    const dayBlocked = daySlots.filter(s => s.status === 'blocked');

                    const bookingsCount = dayBookings.length;
                    const availableCount = dayAvailable.length;
                    const blockedCount = dayBlocked.length;
                    const totalSlots = bookingsCount + availableCount;

                    // Calculate fill percentage for visual bar
                    const fillPercentage = totalSlots > 0 ? (bookingsCount / totalSlots) * 100 : 0;

                    // Get unique courts with bookings
                    const courtsWithBookings = new Set(dayBookings.map(s => s.court_id)).size;

                    return (
                      <Popover key={dateStr}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => {
                              setSelectedDate(date);
                              setViewMode('day');
                            }}
                            className={cn(
                              'min-h-[100px] p-2 rounded-lg text-left transition-all flex flex-col group relative overflow-hidden',
                              'border border-transparent hover:border-primary/30 hover:shadow-md hover:scale-[1.02]',
                              isTodayDate && 'ring-2 ring-primary bg-primary/5 border-primary/20',
                              isPast ? 'bg-muted/30 opacity-60' : 'bg-card hover:bg-accent/30',
                              !isPast && totalSlots > 0 && 'cursor-pointer'
                            )}
                          >
                            {/* Date number */}
                            <div className="flex items-start justify-between">
                              <span
                                className={cn(
                                  'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                                  isTodayDate
                                    ? 'bg-primary text-primary-foreground'
                                    : 'group-hover:bg-muted'
                                )}
                              >
                                {date.getDate()}
                              </span>
                              {isTodayDate && (
                                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                                  {t('calendar.today')}
                                </Badge>
                              )}
                            </div>

                            {/* Stats content */}
                            <div className="flex-1 flex flex-col justify-end gap-1.5 mt-2">
                              {!isPast && totalSlots > 0 && (
                                <>
                                  {/* Occupancy bar */}
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                      style={{ width: `${fillPercentage}%` }}
                                    />
                                  </div>

                                  {/* Stats badges */}
                                  <div className="flex flex-wrap gap-1">
                                    {bookingsCount > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full px-1.5 py-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {bookingsCount}
                                      </div>
                                    )}
                                    {availableCount > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 rounded-full px-1.5 py-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        {availableCount}
                                      </div>
                                    )}
                                    {blockedCount > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] bg-gray-500/20 text-gray-700 dark:text-gray-400 rounded-full px-1.5 py-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                        {blockedCount}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {isPast && bookingsCount > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  {bookingsCount} {t('calendar.monthView.bookings')}
                                </div>
                              )}

                              {!isPast && totalSlots === 0 && !slotsLoading && (
                                <div className="text-[10px] text-muted-foreground italic">
                                  {t('calendar.monthView.noSlots')}
                                </div>
                              )}
                            </div>

                            {/* Hover indicator */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          </button>
                        </PopoverTrigger>
                        {!isPast && totalSlots > 0 && (
                          <PopoverContent
                            align="center"
                            side="bottom"
                            className="w-64 p-3"
                            sideOffset={4}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b pb-2">
                                <span className="font-semibold">
                                  {date.toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    setSelectedDate(date);
                                    setViewMode('day');
                                  }}
                                >
                                  <ExternalLink className="size-3" />
                                  {t('calendar.monthView.viewDay')}
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500" />
                                  <span>
                                    {bookingsCount} {t('calendar.legend.booked')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
                                  <span>
                                    {availableCount} {t('calendar.legend.available')}
                                  </span>
                                </div>
                                {blockedCount > 0 && (
                                  <div className="flex items-center gap-2 col-span-2">
                                    <div className="w-3 h-3 rounded bg-gray-500/30 border border-gray-500" />
                                    <span>
                                      {blockedCount} {t('calendar.legend.blocked')}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {courtsWithBookings > 0 && (
                                <div className="text-xs text-muted-foreground border-t pt-2">
                                  {courtsWithBookings}{' '}
                                  {courtsWithBookings === 1
                                    ? t('calendar.monthView.courtActive')
                                    : t('calendar.monthView.courtsActive')}
                                </div>
                              )}

                              {/* Mini court breakdown */}
                              {courts.length > 0 && bookingsCount > 0 && (
                                <div className="border-t pt-2 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    {t('calendar.monthView.courtBreakdown')}
                                  </p>
                                  {courts.slice(0, 4).map(court => {
                                    const courtBookings = dayBookings.filter(
                                      s => s.court_id === court.id
                                    ).length;
                                    const courtAvailable = dayAvailable.filter(
                                      s => s.court_id === court.id
                                    ).length;
                                    const courtTotal = courtBookings + courtAvailable;
                                    if (courtTotal === 0) return null;

                                    return (
                                      <div
                                        key={court.id}
                                        className="flex items-center justify-between text-xs"
                                      >
                                        <span className="truncate flex-1">
                                          {court.name || `Court ${court.court_number}`}
                                        </span>
                                        <div className="flex items-center gap-1 ml-2">
                                          <span className="text-blue-600 dark:text-blue-400">
                                            {courtBookings}
                                          </span>
                                          <span className="text-muted-foreground">/</span>
                                          <span className="text-green-600 dark:text-green-400">
                                            {courtAvailable}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {courts.length > 4 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      +{courts.length - 4} more courts
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Week View (default) */
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {weekDates[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </CardTitle>
            <CardDescription>
              {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-medium text-muted-foreground min-w-[120px]">
                      Court
                    </th>
                    {weekDates.map((date, index) => {
                      const isTodayDate = isToday(date);
                      const isPast = isPastDate(date);
                      return (
                        <th
                          key={date.toISOString()}
                          className={cn(
                            'p-3 text-center transition-colors min-w-[100px]',
                            // Day separator - left border for all except first
                            index > 0 && 'border-l-2 border-l-border',
                            isTodayDate && 'bg-primary/5',
                            isPast && 'bg-muted/30'
                          )}
                        >
                          <div
                            className={cn(
                              'font-medium',
                              isTodayDate && 'text-primary font-semibold',
                              isPast && 'text-muted-foreground'
                            )}
                          >
                            {tDays(dayNames[index])}
                          </div>
                          <div
                            className={cn(
                              'text-sm',
                              isTodayDate
                                ? 'text-primary/80 font-medium'
                                : isPast
                                  ? 'text-muted-foreground/70'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {date.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          {isTodayDate && (
                            <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0">
                              Today
                            </Badge>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court, courtIndex) => {
                    const timeSlots = generateTimeSlots(court.slot_duration_minutes);

                    return (
                      <tr
                        key={court.id}
                        className={cn(
                          'border-b transition-opacity',
                          'animate-in fade-in-0 slide-in-from-left-2'
                        )}
                        style={{
                          animationDelay: `${courtIndex * 50}ms`,
                          animationFillMode: 'backwards',
                        }}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {court.name || `Court ${court.court_number}`}
                            </span>
                            {court.availability_status &&
                              court.availability_status !== 'available' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1.5 py-0',
                                    court.availability_status === 'maintenance' &&
                                      'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50',
                                    court.availability_status === 'closed' &&
                                      'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/50',
                                    court.availability_status === 'reserved' &&
                                      'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/50'
                                  )}
                                >
                                  {tCourtStatus(court.availability_status)}
                                </Badge>
                              )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {court.slot_duration_minutes} min slots
                          </div>
                        </td>
                        {weekDates.map((date, dateIndex) => {
                          const dateStr = formatDateLocal(date);
                          const isTodayDate = isToday(date);
                          const isPast = isPastDate(date);

                          return (
                            <td
                              key={dateStr}
                              className={cn(
                                'p-2 relative overflow-hidden',
                                // Day separator - left border for all except first
                                dateIndex > 0 && 'border-l-2 border-l-border',
                                isTodayDate && 'bg-primary/5',
                                isPast && 'bg-muted/30'
                              )}
                            >
                              {/* Now indicator line */}
                              {isTodayDate && getNowPosition !== null && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none rounded-full shadow-sm shadow-red-500/50"
                                  style={{
                                    left: `calc(${getNowPosition}% + 0.5rem)`,
                                  }}
                                />
                              )}

                              <div className="flex gap-px w-full">
                                {timeSlots.map((timeSlot, slotIndex) => {
                                  const { status, slot } = getSlotDataForTime(
                                    court.id,
                                    dateStr,
                                    timeSlot.startTime,
                                    timeSlot.endTime
                                  );

                                  // Check if slot is expired (in the past)
                                  const expired = isSlotExpired(date, timeSlot.endTime);

                                  // Only clickable if not expired and status allows
                                  const isClickable =
                                    !expired && (status === 'available' || status === 'booked');
                                  const popoverId = `${court.id}-${dateStr}-${timeSlot.startTime}`;
                                  const courtName = court.name || `Court ${court.court_number}`;

                                  return (
                                    <Popover
                                      key={timeSlot.startTime}
                                      open={openPopover === popoverId}
                                      onOpenChange={open => setOpenPopover(open ? popoverId : null)}
                                    >
                                      <PopoverTrigger asChild>
                                        <div
                                          className={cn(
                                            'h-7 rounded-sm border transition-all duration-150 flex-1 min-w-0',
                                            getStatusColor(status, expired),
                                            'animate-in fade-in-0 zoom-in-95',
                                            isClickable ? 'cursor-pointer' : 'cursor-default'
                                          )}
                                          style={{
                                            animationDelay: `${courtIndex * 50 + slotIndex * 15}ms`,
                                            animationFillMode: 'backwards',
                                          }}
                                          role={isClickable ? 'button' : undefined}
                                          tabIndex={isClickable ? 0 : undefined}
                                          onKeyDown={e => {
                                            if (
                                              isClickable &&
                                              (e.key === 'Enter' || e.key === ' ')
                                            ) {
                                              setOpenPopover(popoverId);
                                            }
                                          }}
                                          aria-label={`${courtName}, ${formatTime(timeSlot.startTime)}, ${expired ? 'expired' : status}`}
                                          title={`${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}${expired ? ' (Past)' : ''}`}
                                        />
                                      </PopoverTrigger>
                                      {isClickable && (
                                        <PopoverContent
                                          align="center"
                                          side="top"
                                          className="w-72"
                                          sideOffset={8}
                                        >
                                          <SlotPopover
                                            status={status}
                                            startTime={slot?.start_time || timeSlot.startTime}
                                            endTime={slot?.end_time || timeSlot.endTime}
                                            date={dateStr}
                                            courtName={courtName}
                                            priceCents={slot?.price_cents}
                                            playerName={slot?.player_name}
                                            playerEmail={slot?.player_email}
                                            bookingId={slot?.booking_id}
                                            onCreateBooking={() =>
                                              handleCreateBooking(
                                                court.id,
                                                dateStr,
                                                timeSlot.startTime
                                              )
                                            }
                                            onViewBooking={() =>
                                              slot?.booking_id && handleViewBooking(slot.booking_id)
                                            }
                                          />
                                        </PopoverContent>
                                      )}
                                    </Popover>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
