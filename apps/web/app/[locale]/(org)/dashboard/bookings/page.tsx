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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/components/organization-context';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  X,
  XCircle,
  UserX,
  CheckCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface Facility {
  id: string;
  name: string;
}

interface Court {
  id: string;
  name: string | null;
  court_number: number | null;
  facility_id: string;
}

interface Booking {
  id: string;
  court_id: string;
  player_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  price_cents: number | null;
  currency: string | null;
  cancelled_at: string | null;
  refund_amount_cents: number | null;
  refund_status: string | null;
  created_at: string;
  court: {
    id: string;
    name: string | null;
    court_number: number | null;
    facility: {
      id: string;
      name: string;
    };
  } | null;
}

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'awaiting_approval';

const ITEMS_PER_PAGE = 10;

export default function BookingsPage() {
  const t = useTranslations('bookings');
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Selection for bulk operations
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());

  // Action dialogs
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  });
  const [noShowDialog, setNoShowDialog] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  });
  const [bulkCancelDialog, setBulkCancelDialog] = useState(false);
  const [bulkCompleteDialog, setBulkCompleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!selectedOrganization) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Fetch facilities
    const { data: facilitiesData } = await supabase
      .from('facility')
      .select('id, name')
      .eq('organization_id', selectedOrganization.id)
      .is('archived_at', null)
      .order('name');

    setFacilities(facilitiesData || []);

    // Fetch all courts for this org
    if (facilitiesData && facilitiesData.length > 0) {
      const facilityIds = facilitiesData.map(f => f.id);
      const { data: courtsData } = await supabase
        .from('court')
        .select('id, name, court_number, facility_id')
        .in('facility_id', facilityIds)
        .eq('is_active', true)
        .order('court_number');

      setCourts(courtsData || []);
    }

    setLoading(false);
  }, [selectedOrganization]);

  const fetchBookings = useCallback(async () => {
    if (!selectedOrganization || courts.length === 0) return;

    const supabase = createClient();
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    // Get court IDs for the organization
    const courtIds = courts.map(c => c.id);

    // Build query - filter by court_id instead of organization_id for compatibility
    // (organization_id column may not exist if migrations haven't run)
    let query = supabase
      .from('booking')
      .select(
        `
        id,
        court_id,
        player_id,
        booking_date,
        start_time,
        end_time,
        status,
        price_cents,
        currency,
        cancelled_at,
        refund_amount_cents,
        refund_status,
        created_at,
        court:court_id (
          id,
          name,
          court_number,
          facility:facility_id (
            id,
            name
          )
        )
      `,
        { count: 'exact' }
      )
      .in('court_id', courtIds)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    // Apply filters
    if (statusFilter !== 'all') {
      query = query.eq(
        'status',
        statusFilter as
          | 'pending'
          | 'confirmed'
          | 'cancelled'
          | 'completed'
          | 'no_show'
          | 'awaiting_approval'
      );
    }

    if (courtFilter !== 'all') {
      query = query.eq('court_id', courtFilter);
    } else if (facilityFilter !== 'all') {
      // Filter by facility (get courts for that facility)
      const facilityCourts = courts.filter(c => c.facility_id === facilityFilter);
      if (facilityCourts.length > 0) {
        query = query.in(
          'court_id',
          facilityCourts.map(c => c.id)
        );
      }
    }

    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    // Apply payment status filter
    if (paymentFilter === 'paid') {
      query = query.not('price_cents', 'is', null).gt('price_cents', 0);
    } else if (paymentFilter === 'unpaid') {
      query = query.or('price_cents.is.null,price_cents.eq.0');
    } else if (paymentFilter === 'refunded') {
      query = query.eq('refund_status', 'completed');
    }

    const { data, count, error } = await query;

    if (error) {
      console.error(
        'Error fetching bookings:',
        error.message || error.code || JSON.stringify(error)
      );
      return;
    }

    let filteredData = (data || []) as unknown as Booking[];

    // Client-side search filtering (for booking ID search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter(
        booking =>
          booking.id.toLowerCase().includes(query) ||
          booking.player_id?.toLowerCase().includes(query)
      );
    }

    setBookings(filteredData);
    setTotalCount(searchQuery.trim() ? filteredData.length : count || 0);
  }, [
    selectedOrganization,
    currentPage,
    statusFilter,
    facilityFilter,
    courtFilter,
    paymentFilter,
    dateFrom,
    dateTo,
    courts,
    searchQuery,
  ]);

  useEffect(() => {
    if (!orgLoading) {
      fetchInitialData();
    }
  }, [fetchInitialData, orgLoading]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchBookings();
    }
  }, [selectedOrganization, fetchBookings]);

  // Reset court filter when facility filter changes
  useEffect(() => {
    setCourtFilter('all');
  }, [facilityFilter]);

  const getPlayerName = (booking: Booking): string => {
    // Player info not loaded in simplified query - show player ID or placeholder
    if (booking.player_id) {
      return `Player ${booking.player_id.slice(0, 8)}...`;
    }
    return 'Guest';
  };

  const getCourtName = (booking: Booking): string => {
    if (!booking.court) return 'Unknown';
    return booking.court.name || `Court ${booking.court.court_number}`;
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatPrice = (cents: number | null, currency: string | null): string => {
    if (!cents) return '-';
    const amount = cents / 100;
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency || 'CAD',
    }).format(amount);
  };

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'no_show':
        return 'destructive';
      case 'pending':
      case 'awaiting_approval':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelDialog.booking) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${cancelDialog.booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      await fetchBookings();
      setCancelDialog({ open: false, booking: null });
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!noShowDialog.booking) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${noShowDialog.booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_show' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking');
      }

      await fetchBookings();
      setNoShowDialog({ open: false, booking: null });
    } catch (error) {
      console.error('Error updating booking:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkComplete = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking');
      }

      await fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  // Bulk action handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'pending')
        .map(b => b.id);
      setSelectedBookings(new Set(selectableIds));
    } else {
      setSelectedBookings(new Set());
    }
  };

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedBookings);
    if (checked) {
      newSelected.add(bookingId);
    } else {
      newSelected.delete(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleBulkCancel = async () => {
    setActionLoading(true);
    try {
      const promises = Array.from(selectedBookings).map(id =>
        fetch(`/api/bookings/${id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason }),
        })
      );
      await Promise.all(promises);
      await fetchBookings();
      setSelectedBookings(new Set());
      setBulkCancelDialog(false);
      setCancelReason('');
    } catch (error) {
      console.error('Error bulk cancelling bookings:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkComplete = async () => {
    setActionLoading(true);
    try {
      const promises = Array.from(selectedBookings).map(id =>
        fetch(`/api/bookings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      );
      await Promise.all(promises);
      await fetchBookings();
      setSelectedBookings(new Set());
      setBulkCompleteDialog(false);
    } catch (error) {
      console.error('Error bulk completing bookings:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Get selectable bookings (only confirmed or pending can be bulk actioned)
  const selectableBookings = bookings.filter(
    b => b.status === 'confirmed' || b.status === 'pending'
  );
  const allSelectableSelected =
    selectableBookings.length > 0 && selectableBookings.every(b => selectedBookings.has(b.id));
  const someSelected = selectedBookings.size > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFacilityFilter('all');
    setCourtFilter('all');
    setPaymentFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    facilityFilter !== 'all' ||
    courtFilter !== 'all' ||
    paymentFilter !== 'all' ||
    dateFrom ||
    dateTo;

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
          <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/bookings/new">
            <Plus className="mr-2 size-4" />
            {t('actions.createManual')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              {t('filters.title')}
            </CardTitle>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1.5 size-3.5" />
                {t('filters.clear')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Search Row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('filters.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('status.pending')}</SelectItem>
                  <SelectItem value="confirmed">{t('status.confirmed')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                  <SelectItem value="no_show">{t('status.no_show')}</SelectItem>
                  <SelectItem value="awaiting_approval">{t('status.awaiting_approval')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Facility Filter */}
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allFacilities')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allFacilities')}</SelectItem>
                  {facilities.map(facility => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Court Filter */}
              <Select
                value={courtFilter}
                onValueChange={setCourtFilter}
                disabled={facilityFilter === 'all'}
              >
                <SelectTrigger disabled={facilityFilter === 'all'}>
                  <SelectValue placeholder={t('filters.allCourts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allCourts')}</SelectItem>
                  {courts
                    .filter(c => facilityFilter === 'all' || c.facility_id === facilityFilter)
                    .map(court => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.name || `Court ${court.court_number}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Payment Status Filter */}
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allPayments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allPayments')}</SelectItem>
                  <SelectItem value="paid">{t('filters.paid')}</SelectItem>
                  <SelectItem value="unpaid">{t('filters.unpaid')}</SelectItem>
                  <SelectItem value="refunded">{t('filters.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">
                {t('filters.dateRange')}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1"
                  placeholder={t('filters.dateFrom')}
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1"
                  placeholder={t('filters.dateTo')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                <CalendarCheck className="size-10 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('emptyState.title')}</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              {t('emptyState.description')}
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/bookings/new">
                <Plus className="mr-2 size-4" />
                {t('emptyState.createButton')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                  {t('pagination.showing', {
                    start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    end: Math.min(currentPage * ITEMS_PER_PAGE, totalCount),
                    total: totalCount,
                  })}
                </CardDescription>
              </div>

              {/* Bulk Actions Toolbar */}
              {someSelected && (
                <div className="flex items-center gap-3 p-2 bg-muted rounded-lg animate-in slide-in-from-right-2">
                  <span className="text-sm font-medium px-2">
                    {t('bulk.selected', { count: selectedBookings.size })}
                  </span>
                  <div className="h-4 w-px bg-border" />
                  <Button size="sm" variant="outline" onClick={() => setBulkCompleteDialog(true)}>
                    <CheckCircle2 className="size-4 mr-1.5" />
                    {t('bulk.complete')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkCancelDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="size-4 mr-1.5" />
                    {t('bulk.cancel')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedBookings(new Set())}>
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelectableSelected && selectableBookings.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all bookings"
                    />
                  </TableHead>
                  <TableHead>{t('table.date')}</TableHead>
                  <TableHead>{t('table.time')}</TableHead>
                  <TableHead>{t('table.court')}</TableHead>
                  <TableHead>{t('table.player')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.amount')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(booking => {
                  const isSelectable =
                    booking.status === 'confirmed' || booking.status === 'pending';
                  const isSelected = selectedBookings.has(booking.id);

                  return (
                    <TableRow key={booking.id} className={cn(isSelected && 'bg-muted/50')}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            handleSelectBooking(booking.id, checked === true)
                          }
                          disabled={!isSelectable}
                          aria-label={`Select booking ${booking.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(booking.booking_date + 'T00:00:00').toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getCourtName(booking)}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.court?.facility?.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlayerName(booking)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {t(`status.${booking.status as BookingStatus}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(booking.price_cents, booking.currency)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/bookings/${booking.id}`}>
                                <Eye className="mr-2 size-4" />
                                {t('actions.view')}
                              </Link>
                            </DropdownMenuItem>
                            {booking.status === 'confirmed' && (
                              <>
                                <DropdownMenuItem onClick={() => handleMarkComplete(booking)}>
                                  <CheckCircle className="mr-2 size-4" />
                                  {t('actions.markComplete')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setNoShowDialog({ open: true, booking })}
                                >
                                  <UserX className="mr-2 size-4" />
                                  {t('actions.markNoShow')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setCancelDialog({ open: true, booking })}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 size-4" />
                                  {t('actions.cancel')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {booking.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => setCancelDialog({ open: true, booking })}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 size-4" />
                                {t('actions.cancel')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('pagination.page', { current: currentPage, total: totalPages })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    {t('pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('pagination.next')}
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Booking Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={open => setCancelDialog({ open, booking: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancel.title')}</DialogTitle>
            <DialogDescription>{t('cancel.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">{t('cancel.reasonLabel')}</Label>
              <Textarea
                id="cancel-reason"
                placeholder={t('cancel.reasonPlaceholder')}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, booking: null })}
            >
              {t('cancel.cancelButton')}
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('cancel.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Show Dialog */}
      <Dialog
        open={noShowDialog.open}
        onOpenChange={open => setNoShowDialog({ open, booking: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('noShow.title')}</DialogTitle>
            <DialogDescription>{t('noShow.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoShowDialog({ open: false, booking: null })}
            >
              {t('noShow.cancelButton')}
            </Button>
            <Button variant="destructive" onClick={handleMarkNoShow} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('noShow.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Dialog */}
      <Dialog open={bulkCancelDialog} onOpenChange={setBulkCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk.cancelTitle')}</DialogTitle>
            <DialogDescription>
              {t('bulk.cancelDescription', { count: selectedBookings.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-cancel-reason">{t('cancel.reasonLabel')}</Label>
              <Textarea
                id="bulk-cancel-reason"
                placeholder={t('cancel.reasonPlaceholder')}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCancelDialog(false)}>
              {t('bulk.cancelButton')}
            </Button>
            <Button variant="destructive" onClick={handleBulkCancel} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('bulk.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Complete Dialog */}
      <Dialog open={bulkCompleteDialog} onOpenChange={setBulkCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk.completeTitle')}</DialogTitle>
            <DialogDescription>
              {t('bulk.completeDescription', { count: selectedBookings.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCompleteDialog(false)}>
              {t('cancel.cancelButton')}
            </Button>
            <Button onClick={handleBulkComplete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('bulk.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
