'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CalendarCheck,
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  avgBookingsPerDay: number;
  utilizationRate: number;
  bookingsByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  bookingsByDay: Array<{ date: string; count: number }>;
  previousPeriod: {
    totalBookings: number;
    totalRevenue: number;
  };
}

type DateRange = 'last7Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth';

function getDateRange(range: DateRange): { from: string; to: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const toStr = formatDate(today);

  let from = new Date();

  switch (range) {
    case 'last7Days':
      from.setDate(from.getDate() - 7);
      break;
    case 'last30Days':
      from.setDate(from.getDate() - 30);
      break;
    case 'last90Days':
      from.setDate(from.getDate() - 90);
      break;
    case 'thisMonth':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'lastMonth': {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatDate(from), to: formatDate(lastDayOfLastMonth) };
    }
  }

  return { from: formatDate(from), to: toStr };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: typeof DollarSign;
  trend?: number;
  trendLabel?: string;
  iconColor: string;
}) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                {isPositive && <ArrowUpRight className="size-4 text-green-500" />}
                {isNegative && <ArrowDownRight className="size-4 text-red-500" />}
                <span
                  className={cn(
                    'text-sm font-medium',
                    isPositive && 'text-green-500',
                    isNegative && 'text-red-500',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                >
                  {Math.abs(trend).toFixed(1)}%
                </span>
                {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', iconColor)}>
            <Icon className="size-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({
  data,
  label,
}: {
  data: Array<{ date: string; value: number }>;
  label: string;
}) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t min-h-[4px]"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
              title={`${item.date}: ${item.value} ${label}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('last30Days');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
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

    // Get facility and court IDs
    const { data: facilities } = await supabase
      .from('facility')
      .select('id')
      .eq('organization_id', membership.organization_id)
      .is('archived_at', null);

    const facilityIds = facilities?.map(f => f.id) || [];

    if (facilityIds.length === 0) {
      setData({
        totalBookings: 0,
        totalRevenue: 0,
        avgBookingsPerDay: 0,
        utilizationRate: 0,
        bookingsByStatus: {},
        revenueByDay: [],
        bookingsByDay: [],
        previousPeriod: { totalBookings: 0, totalRevenue: 0 },
      });
      setLoading(false);
      return;
    }

    const { data: courts } = await supabase
      .from('court')
      .select('id')
      .in('facility_id', facilityIds)
      .eq('is_active', true);

    const courtIds = courts?.map(c => c.id) || [];

    if (courtIds.length === 0) {
      setData({
        totalBookings: 0,
        totalRevenue: 0,
        avgBookingsPerDay: 0,
        utilizationRate: 0,
        bookingsByStatus: {},
        revenueByDay: [],
        bookingsByDay: [],
        previousPeriod: { totalBookings: 0, totalRevenue: 0 },
      });
      setLoading(false);
      return;
    }

    const { from, to } = getDateRange(dateRange);
    const daysDiff =
      Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate previous period for comparison
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - daysDiff + 1);

    // Fetch current period bookings
    const { data: bookings } = await supabase
      .from('booking')
      .select('id, status, price_cents, booking_date')
      .in('court_id', courtIds)
      .gte('booking_date', from)
      .lte('booking_date', to);

    // Fetch previous period bookings for comparison
    const { data: prevBookings } = await supabase
      .from('booking')
      .select('id, status, price_cents')
      .in('court_id', courtIds)
      .gte('booking_date', formatDate(prevFrom))
      .lte('booking_date', formatDate(prevTo));

    const currentBookings = bookings || [];
    const previousBookings = prevBookings || [];

    // Calculate metrics
    const totalBookings = currentBookings.filter(b => b.status !== 'cancelled').length;
    const totalRevenue =
      currentBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100;
    const avgBookingsPerDay = daysDiff > 0 ? totalBookings / daysDiff : 0;

    // Utilization (simple calculation based on 14 hours/day for each court)
    const totalPossibleSlots = courtIds.length * 14 * daysDiff;
    const utilizationRate = totalPossibleSlots > 0 ? (totalBookings / totalPossibleSlots) * 100 : 0;

    // Previous period metrics
    const prevTotalBookings = previousBookings.filter(b => b.status !== 'cancelled').length;
    const prevTotalRevenue =
      previousBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100;

    // Bookings by status
    const bookingsByStatus: Record<string, number> = {};
    currentBookings.forEach(b => {
      if (b.status) {
        bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;
      }
    });

    // Revenue and bookings by day (aggregated)
    const revenueByDayMap: Record<string, number> = {};
    const bookingsByDayMap: Record<string, number> = {};

    currentBookings.forEach(b => {
      if (b.status !== 'cancelled') {
        bookingsByDayMap[b.booking_date] = (bookingsByDayMap[b.booking_date] || 0) + 1;
      }
      if (b.status === 'confirmed' || b.status === 'completed') {
        revenueByDayMap[b.booking_date] =
          (revenueByDayMap[b.booking_date] || 0) + (b.price_cents || 0) / 100;
      }
    });

    // Convert to arrays and sort
    const revenueByDay = Object.entries(revenueByDayMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const bookingsByDay = Object.entries(bookingsByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setData({
      totalBookings,
      totalRevenue,
      avgBookingsPerDay,
      utilizationRate,
      bookingsByStatus,
      revenueByDay,
      bookingsByDay,
      previousPeriod: {
        totalBookings: prevTotalBookings,
        totalRevenue: prevTotalRevenue,
      },
    });
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExportCSV = () => {
    if (!data) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Bookings', data.totalBookings],
      ['Total Revenue', data.totalRevenue],
      ['Average Bookings/Day', data.avgBookingsPerDay.toFixed(1)],
      ['Utilization Rate', `${data.utilizationRate.toFixed(1)}%`],
      [''],
      ['Status', 'Count'],
      ...Object.entries(data.bookingsByStatus).map(([status, count]) => [status, count]),
      [''],
      ['Date', 'Bookings', 'Revenue'],
      ...data.revenueByDay.map(r => {
        const booking = data.bookingsByDay.find(b => b.date === r.date);
        return [r.date, booking?.count || 0, r.revenue];
      }),
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${dateRange}-${formatDate(new Date())}.csv`;
    link.click();
  };

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7Days">{t('filters.last7Days')}</SelectItem>
              <SelectItem value="last30Days">{t('filters.last30Days')}</SelectItem>
              <SelectItem value="last90Days">{t('filters.last90Days')}</SelectItem>
              <SelectItem value="thisMonth">{t('filters.thisMonth')}</SelectItem>
              <SelectItem value="lastMonth">{t('filters.lastMonth')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="size-4 mr-2" />
            {t('export.exportCSV')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('overview.totalBookings')}
          value={data?.totalBookings || 0}
          icon={CalendarCheck}
          trend={
            data ? calculateTrend(data.totalBookings, data.previousPeriod.totalBookings) : undefined
          }
          trendLabel={t('overview.vsLastMonth')}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title={t('overview.totalRevenue')}
          value={formatCurrency(data?.totalRevenue || 0)}
          icon={DollarSign}
          trend={
            data ? calculateTrend(data.totalRevenue, data.previousPeriod.totalRevenue) : undefined
          }
          trendLabel={t('overview.vsLastMonth')}
          iconColor="bg-green-500/10 text-green-500"
        />
        <StatCard
          title={t('overview.avgBookingsPerDay')}
          value={(data?.avgBookingsPerDay || 0).toFixed(1)}
          icon={BarChart3}
          iconColor="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title={t('overview.utilizationRate')}
          value={`${(data?.utilizationRate || 0).toFixed(0)}%`}
          icon={TrendingUp}
          iconColor="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList>
          <TabsTrigger value="bookings">{t('charts.bookingsTrend')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('charts.revenueOverTime')}</TabsTrigger>
          <TabsTrigger value="status">{t('charts.bookingsByStatus')}</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('charts.bookingsTrend')}</CardTitle>
              <CardDescription>{t('filters.' + dateRange)}</CardDescription>
            </CardHeader>
            <CardContent>
              {data && data.bookingsByDay.length > 0 ? (
                <SimpleBarChart
                  data={data.bookingsByDay.map(d => ({ date: d.date, value: d.count }))}
                  label="bookings"
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {t('charts.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('charts.revenueOverTime')}</CardTitle>
              <CardDescription>{t('filters.' + dateRange)}</CardDescription>
            </CardHeader>
            <CardContent>
              {data && data.revenueByDay.length > 0 ? (
                <SimpleBarChart
                  data={data.revenueByDay.map(d => ({ date: d.date, value: d.revenue }))}
                  label="CAD"
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {t('charts.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('charts.bookingsByStatus')}</CardTitle>
              <CardDescription>{t('filters.' + dateRange)}</CardDescription>
            </CardHeader>
            <CardContent>
              {data && Object.keys(data.bookingsByStatus).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(data.bookingsByStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex flex-col items-center p-4 rounded-lg bg-muted/50"
                    >
                      <span className="text-2xl font-bold">{count}</span>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {t('charts.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
