/**
 * useOrgNotifications Hook
 * Custom hook for managing organization notifications with TanStack Query.
 * Provides infinite scrolling, real-time updates, and notification management.
 */

import { useEffect, useRef } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { supabase as sharedSupabase } from '@rallia/shared-services';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { Notification, NotificationsPage } from '@rallia/shared-types';

// Query keys for organization notification cache management
export const orgNotificationKeys = {
  all: ['org-notifications'] as const,
  lists: () => [...orgNotificationKeys.all, 'list'] as const,
  list: (organizationId: string, filter?: string) =>
    [...orgNotificationKeys.lists(), organizationId, filter] as const,
  unreadCount: (organizationId: string) =>
    [...orgNotificationKeys.all, 'unreadCount', organizationId] as const,
};

interface UseOrgNotificationsOptions {
  /** Page size for pagination */
  pageSize?: number;
  /** Filter by notification type category */
  typeFilter?: 'all' | 'bookings' | 'members' | 'payments' | 'system';
  /** Enable/disable the query */
  enabled?: boolean;
  /** Optional authenticated Supabase client (for proper RLS/realtime support) */
  supabaseClient?: SupabaseClient;
}

/**
 * Map type filter to notification type prefixes
 */
function getTypeFilterCondition(filter?: string): string[] {
  switch (filter) {
    case 'bookings':
      return [
        'booking_created',
        'booking_cancelled_by_player',
        'booking_modified',
        'booking_confirmed',
        'booking_reminder',
        'booking_cancelled_by_org',
      ];
    case 'members':
      return ['new_member_joined', 'member_left', 'member_role_changed', 'membership_approved'];
    case 'payments':
      return ['payment_received', 'payment_failed', 'refund_processed'];
    case 'system':
      return ['daily_summary', 'weekly_report', 'org_announcement'];
    default:
      return [];
  }
}

/**
 * Fetch organization notifications from the database
 */
async function getOrgNotifications(
  organizationId: string,
  options: { pageSize?: number; cursor?: string; typeFilter?: string; client?: SupabaseClient }
): Promise<NotificationsPage> {
  const { pageSize = 20, cursor, typeFilter, client = sharedSupabase } = options;

  let query = client
    .from('notification')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1); // Fetch one extra to check if there are more

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // Apply type filter if specified
  const typeConditions = getTypeFilterCondition(typeFilter);
  if (typeConditions.length > 0) {
    query = query.in('type', typeConditions);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch org notifications: ${error.message}`);
  }

  const notifications = (data ?? []) as Notification[];
  const hasMore = notifications.length > pageSize;

  // Remove the extra notification used to check for more
  if (hasMore) {
    notifications.pop();
  }

  const nextCursor =
    hasMore && notifications.length > 0 ? notifications[notifications.length - 1].created_at : null;

  return { notifications, nextCursor, hasMore };
}

/**
 * Get unread count for organization notifications
 */
async function getOrgUnreadCount(
  organizationId: string,
  client: SupabaseClient = sharedSupabase
): Promise<number> {
  const { count, error } = await client
    .from('notification')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Failed to fetch org unread count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Mark a notification as read
 */
async function markOrgNotificationAsRead(
  notificationId: string,
  client: SupabaseClient = sharedSupabase
): Promise<Notification> {
  const { data, error } = await client
    .from('notification')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  return data as Notification;
}

/**
 * Mark all organization notifications as read
 */
async function markAllOrgNotificationsAsRead(
  organizationId: string,
  client: SupabaseClient = sharedSupabase
): Promise<void> {
  const { error } = await client
    .from('notification')
    .update({ read_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

/**
 * Hook for fetching paginated organization notifications with infinite scrolling
 */
export function useOrgNotifications(
  organizationId: string | undefined,
  options: UseOrgNotificationsOptions = {}
) {
  const { enabled = true, pageSize = 20, typeFilter = 'all', supabaseClient } = options;

  return useInfiniteQuery<NotificationsPage, Error>({
    queryKey: orgNotificationKeys.list(organizationId ?? '', typeFilter),
    queryFn: async ({ pageParam }) => {
      if (!organizationId) {
        return { notifications: [], nextCursor: null, hasMore: false };
      }
      return getOrgNotifications(organizationId, {
        pageSize,
        cursor: pageParam as string | undefined,
        typeFilter,
        client: supabaseClient,
      });
    },
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && !!organizationId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook for fetching unread organization notification count
 */
export function useOrgUnreadNotificationCount(
  organizationId: string | undefined,
  options: { supabaseClient?: SupabaseClient } = {}
) {
  const { supabaseClient } = options;

  return useQuery<number, Error>({
    queryKey: orgNotificationKeys.unreadCount(organizationId ?? ''),
    queryFn: async () => {
      if (!organizationId) return 0;
      return getOrgUnreadCount(organizationId, supabaseClient);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook for marking an organization notification as read
 */
export function useMarkOrgNotificationAsRead(
  organizationId: string | undefined,
  options: { supabaseClient?: SupabaseClient } = {}
) {
  const { supabaseClient } = options;
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: (notificationId: string) =>
      markOrgNotificationAsRead(notificationId, supabaseClient),
    onMutate: async notificationId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: orgNotificationKeys.lists(),
      });

      // Optimistically update
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({
        queryKey: orgNotificationKeys.lists(),
      });

      let wasUnread = false;
      queries.forEach(query => {
        const data = query.state.data as InfiniteData<NotificationsPage> | undefined;
        if (data) {
          data.pages.forEach(page => {
            const notification = page.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read_at) {
              wasUnread = true;
            }
          });

          queryClient.setQueryData<InfiniteData<NotificationsPage>>(query.queryKey, {
            ...data,
            pages: data.pages.map(page => ({
              ...page,
              notifications: page.notifications.map(n =>
                n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
              ),
            })),
          });
        }
      });

      // Decrement unread count
      if (wasUnread) {
        queryClient.setQueryData<number>(
          orgNotificationKeys.unreadCount(organizationId ?? ''),
          old => Math.max(0, (old ?? 0) - 1)
        );
      }
    },
    onError: () => {
      // Refetch on error
      queryClient.invalidateQueries({ queryKey: orgNotificationKeys.all });
    },
  });
}

/**
 * Hook for marking all organization notifications as read
 */
export function useMarkAllOrgNotificationsAsRead(
  organizationId: string | undefined,
  options: { supabaseClient?: SupabaseClient } = {}
) {
  const { supabaseClient } = options;
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return markAllOrgNotificationsAsRead(organizationId, supabaseClient);
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: orgNotificationKeys.lists(),
      });

      const now = new Date().toISOString();

      // Optimistically mark all as read
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({
        queryKey: orgNotificationKeys.lists(),
      });

      queries.forEach(query => {
        const data = query.state.data as InfiniteData<NotificationsPage> | undefined;
        if (data) {
          queryClient.setQueryData<InfiniteData<NotificationsPage>>(query.queryKey, {
            ...data,
            pages: data.pages.map(page => ({
              ...page,
              notifications: page.notifications.map(n => ({
                ...n,
                read_at: n.read_at ?? now,
              })),
            })),
          });
        }
      });

      // Set unread count to 0
      queryClient.setQueryData<number>(orgNotificationKeys.unreadCount(organizationId ?? ''), 0);
    },
    onError: () => {
      // Refetch on error
      queryClient.invalidateQueries({ queryKey: orgNotificationKeys.all });
    },
  });
}

/**
 * Hook for real-time organization notification updates
 */
export function useOrgNotificationRealtime(
  organizationId: string | undefined,
  options: {
    enabled?: boolean;
    onNewNotification?: (notification: unknown) => void;
    supabaseClient?: SupabaseClient;
  } = {}
) {
  const { enabled = true, onNewNotification, supabaseClient } = options;
  const client = supabaseClient ?? sharedSupabase;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewNotificationRef = useRef(onNewNotification);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    if (!organizationId || !enabled) {
      return;
    }

    const channelName = `org-notifications:${organizationId}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Invalidate notification queries
          queryClient.invalidateQueries({
            queryKey: orgNotificationKeys.all,
          });

          // Call callback for new notifications
          if (onNewNotificationRef.current) {
            onNewNotificationRef.current(payload.new);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, enabled, queryClient, client]);

  return null;
}

/**
 * Combined hook providing all organization notification functionality
 */
export function useOrgNotificationsWithActions(
  organizationId: string | undefined,
  options: UseOrgNotificationsOptions = {}
) {
  const { supabaseClient } = options;
  const notifications = useOrgNotifications(organizationId, options);
  const unreadCount = useOrgUnreadNotificationCount(organizationId, { supabaseClient });
  const markAsReadMutation = useMarkOrgNotificationAsRead(organizationId, { supabaseClient });
  const markAllAsReadMutation = useMarkAllOrgNotificationsAsRead(organizationId, {
    supabaseClient,
  });

  // Enable real-time updates with the authenticated client
  useOrgNotificationRealtime(organizationId, {
    enabled: options.enabled,
    supabaseClient,
  });

  // Flatten pages
  const allNotifications = notifications.data?.pages.flatMap(page => page.notifications) ?? [];

  return {
    // Query states
    notifications: allNotifications,
    isLoading: notifications.isLoading,
    isFetching: notifications.isFetching,
    isFetchingNextPage: notifications.isFetchingNextPage,
    hasNextPage: notifications.hasNextPage,
    error: notifications.error,

    // Pagination
    fetchNextPage: notifications.fetchNextPage,
    refetch: notifications.refetch,

    // Unread count
    unreadCount: unreadCount.data ?? 0,
    isLoadingUnreadCount: unreadCount.isLoading,

    // Mutations
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,

    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

export default useOrgNotificationsWithActions;
