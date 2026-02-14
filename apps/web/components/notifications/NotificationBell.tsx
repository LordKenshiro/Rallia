'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
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
  ChevronRight,
  DollarSign,
  Users,
  Megaphone,
  FileText,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';

interface NotificationBellProps {
  isCollapsed?: boolean;
}

/**
 * Get Lucide icon component for notification type
 */
function getNotificationIcon(type: ExtendedNotificationTypeEnum) {
  const iconMap: Record<string, React.ReactNode> = {
    booking_created: <CalendarCheck className="size-4 text-teal-500" />,
    booking_cancelled_by_player: <CalendarX className="size-4 text-red-500" />,
    booking_modified: <Calendar className="size-4 text-blue-500" />,
    booking_confirmed: <CalendarCheck className="size-4 text-green-500" />,
    booking_reminder: <Bell className="size-4 text-orange-500" />,
    booking_cancelled_by_org: <CalendarX className="size-4 text-red-500" />,
    new_member_joined: <Users className="size-4 text-green-500" />,
    member_left: <Users className="size-4 text-orange-500" />,
    member_role_changed: <Users className="size-4 text-blue-500" />,
    membership_approved: <Check className="size-4 text-green-500" />,
    payment_received: <DollarSign className="size-4 text-green-500" />,
    payment_failed: <DollarSign className="size-4 text-red-500" />,
    refund_processed: <DollarSign className="size-4 text-orange-500" />,
    daily_summary: <FileText className="size-4 text-gray-500" />,
    weekly_report: <FileText className="size-4 text-gray-500" />,
    org_announcement: <Megaphone className="size-4 text-blue-500" />,
  };

  return iconMap[type] ?? <Bell className="size-4 text-muted-foreground" />;
}

/**
 * Format relative time for notification
 */
function formatNotificationTime(createdAt: string): string {
  try {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Single notification item in the dropdown
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
        'px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer',
        isUnread && 'bg-primary/5'
      )}
      onClick={() => isUnread && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'shrink-0 size-8 rounded-full flex items-center justify-center',
            isUnread ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          {getNotificationIcon(notification.type as ExtendedNotificationTypeEnum)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm leading-tight',
                isUnread ? 'font-medium text-foreground mb-0' : 'text-muted-foreground mb-0'
              )}
            >
              {notification.title}
            </p>
            {isUnread && <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
          </div>
          {notification.body && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-tight mb-0">
              {notification.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-0.5 mb-0">
            {formatNotificationTime(notification.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Notification Bell component for the organization dashboard sidebar
 */
export function NotificationBell({ isCollapsed = false }: NotificationBellProps) {
  const t = useTranslations('app.notifications');
  const tNav = useTranslations('app.nav');
  const { selectedOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  // Use the authenticated browser client for proper RLS and realtime support
  const supabaseClient = useMemo(() => createClient(), []);

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingUnreadCount,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useOrgNotificationsWithActions(selectedOrganization?.id, {
    enabled: !!selectedOrganization,
    pageSize: 10,
    supabaseClient,
  });

  // Show only recent notifications in the dropdown
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={cn('border-b border-border p-3', isCollapsed && 'flex justify-center')}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'default'}
                className={cn('relative', isCollapsed ? 'size-9' : 'w-full justify-start gap-2')}
              >
                <Bell className="size-4" />
                {!isCollapsed && <span>{tNav('notifications')}</span>}
                {isLoadingUnreadCount ? (
                  <Skeleton
                    className={cn(
                      'absolute h-[18px] w-[18px] rounded-full',
                      isCollapsed ? '-top-0.5 -right-0.5' : 'right-3'
                    )}
                  />
                ) : (
                  unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        'absolute text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center',
                        isCollapsed ? '-top-0.5 -right-0.5' : 'right-3'
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              {tNav('notifications')} {unreadCount > 0 && `(${unreadCount})`}
            </TooltipContent>
          )}
        </Tooltip>
        <PopoverContent
          side={isCollapsed ? 'right' : 'bottom'}
          align="start"
          className="w-80 p-0"
          sideOffset={isCollapsed ? 12 : 8}
        >
          {/* Header */}
          <div className="p-3 flex items-center justify-between">
            <h4 className="font-semibold text-sm">{t('title')}</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
              >
                {t('markAllRead')}
              </Button>
            )}
          </div>

          <Separator />

          {/* Content */}
          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="size-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t('empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNotifications.map(notif => (
                  <NotificationItem key={notif.id} notification={notif} onMarkAsRead={markAsRead} />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Always show View All link */}
          <Separator />
          <div className="p-2">
            <Link
              href="/dashboard/notifications"
              className="flex items-center justify-center gap-1 w-full py-2 text-sm text-primary hover:text-primary/80 hover:bg-muted/50 rounded-md transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {t('viewAll')}
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default NotificationBell;
