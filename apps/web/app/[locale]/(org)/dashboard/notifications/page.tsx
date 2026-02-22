'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/components/organization-context';
import { useOrgNotificationsWithActions } from '@rallia/shared-hooks';
import { createClient } from '@/lib/supabase/client';
import type { Notification, ExtendedNotificationTypeEnum } from '@rallia/shared-types';
import { cn } from '@/lib/utils';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarX,
  Check,
  CheckCheck,
  DollarSign,
  FileText,
  Loader2,
  Megaphone,
  Users,
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useTranslations } from 'next-intl';

type NotificationFilter = 'all' | 'bookings' | 'members' | 'payments' | 'system';

/**
 * Get Lucide icon component for notification type
 */
function getNotificationIcon(type: ExtendedNotificationTypeEnum) {
  const iconMap: Record<string, React.ReactNode> = {
    booking_created: <CalendarCheck className="size-5 text-teal-500" />,
    booking_cancelled_by_player: <CalendarX className="size-5 text-red-500" />,
    booking_modified: <Calendar className="size-5 text-blue-500" />,
    booking_confirmed: <CalendarCheck className="size-5 text-green-500" />,
    booking_reminder: <Bell className="size-5 text-orange-500" />,
    booking_cancelled_by_org: <CalendarX className="size-5 text-red-500" />,
    new_member_joined: <Users className="size-5 text-green-500" />,
    member_left: <Users className="size-5 text-orange-500" />,
    member_role_changed: <Users className="size-5 text-blue-500" />,
    membership_approved: <Check className="size-5 text-green-500" />,
    payment_received: <DollarSign className="size-5 text-green-500" />,
    payment_failed: <DollarSign className="size-5 text-red-500" />,
    refund_processed: <DollarSign className="size-5 text-orange-500" />,
    daily_summary: <FileText className="size-5 text-gray-500" />,
    weekly_report: <FileText className="size-5 text-gray-500" />,
    org_announcement: <Megaphone className="size-5 text-blue-500" />,
  };

  return iconMap[type] ?? <Bell className="size-5 text-muted-foreground" />;
}

/**
 * Format date for grouping with translations
 */
function useFormatGroupDate() {
  const t = useTranslations('app.notifications');

  return (dateStr: string): string => {
    const date = parseISO(dateStr);
    if (isToday(date)) return t('today');
    if (isYesterday(date)) return t('yesterday');
    return format(date, 'MMMM d, yyyy');
  };
}

/**
 * Format time for display
 */
function formatNotificationTime(dateStr: string): string {
  return format(parseISO(dateStr), 'h:mm a');
}

/**
 * Group notifications by date
 */
function groupNotificationsByDate(
  notifications: Notification[],
  formatGroupDate: (dateStr: string) => string
): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();

  notifications.forEach(notification => {
    const dateKey = formatGroupDate(notification.created_at);
    const existing = groups.get(dateKey) ?? [];
    groups.set(dateKey, [...existing, notification]);
  });

  return groups;
}

/**
 * Single notification item
 */
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border transition-all cursor-pointer',
        isUnread
          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
          : 'bg-card border-border hover:bg-muted/50'
      )}
      onClick={() => isUnread && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'shrink-0 size-10 rounded-full flex items-center justify-center',
            isUnread ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          {getNotificationIcon(notification.type as ExtendedNotificationTypeEnum)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm',
                  isUnread
                    ? 'font-bold text-foreground mb-0'
                    : 'font-semibold text-muted-foreground mb-0'
                )}
              >
                {notification.title}
              </p>
              {notification.body && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-tight mb-0">
                  {notification.body}
                </p>
              )}
            </div>
            {isUnread && <div className="size-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1 mb-0">
            {formatNotificationTime(notification.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification group by date
 */
function NotificationGroup({
  dateLabel,
  notifications,
  onMarkAsRead,
}: {
  dateLabel: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground px-1">{dateLabel}</h3>
      <div className="space-y-2">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for notifications
 */
function NotificationSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(group => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <div className="flex gap-4">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState({ filter }: { filter: NotificationFilter }) {
  const t = useTranslations('app.notifications');

  return (
    <div className="py-16 text-center">
      <div className="size-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Bell className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{t('empty')}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {t('emptyDescription', { filter: t(`filters.${filter}`) })}
      </p>
    </div>
  );
}

/**
 * Notification Center Page
 */
export default function NotificationsPage() {
  const t = useTranslations('app.notifications');
  const { selectedOrganization } = useOrganization();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const formatGroupDate = useFormatGroupDate();

  // Use the authenticated browser client for proper RLS and realtime support
  const supabaseClient = useMemo(() => createClient(), []);

  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useOrgNotificationsWithActions(selectedOrganization?.id, {
    enabled: !!selectedOrganization,
    typeFilter: filter,
    pageSize: 20,
    supabaseClient,
  });

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(notifications, formatGroupDate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllAsRead}
            className="shrink-0"
          >
            {isMarkingAllAsRead ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="size-4 mr-2" />
            )}
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={v => setFilter(v as NotificationFilter)}>
        <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-grid">
          <TabsTrigger value="all" className="text-xs sm:text-sm gap-1.5">
            {t('tabs.all')}
            {filter === 'all' && unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs sm:text-sm">
            {t('tabs.bookings')}
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs sm:text-sm">
            {t('tabs.members')}
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">
            {t('tabs.payments')}
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm">
            {t('tabs.system')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-6">
              {Array.from(groupedNotifications.entries()).map(([dateLabel, items]) => (
                <NotificationGroup
                  key={dateLabel}
                  dateLabel={dateLabel}
                  notifications={items}
                  onMarkAsRead={markAsRead}
                />
              ))}

              {/* Load more trigger */}
              <div ref={loadMoreRef} className="py-4">
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading more...
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
