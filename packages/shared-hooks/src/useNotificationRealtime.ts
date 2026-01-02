/**
 * useNotificationRealtime Hook
 *
 * Subscribes to Supabase Realtime for notification changes and
 * invalidates the TanStack Query cache when notifications are inserted,
 * updated, or deleted.
 *
 * This provides instant updates to the notification badge without polling.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@rallia/shared-services';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { notificationKeys } from './useNotifications';

interface NotificationRealtimeOptions {
  /** Enable/disable the realtime subscription */
  enabled?: boolean;
  /** Callback when a new notification is received */
  onNewNotification?: (notification: unknown) => void;
}

/**
 * Hook that subscribes to realtime notification changes for a user.
 * Automatically invalidates the TanStack Query cache when changes occur.
 *
 * @param userId - The user ID to subscribe to notifications for
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * // In your app's authenticated provider or layout
 * function AuthenticatedProviders({ children }) {
 *   const { user } = useAuth();
 *
 *   // Subscribe to realtime notification updates
 *   useNotificationRealtime(user?.id, {
 *     onNewNotification: (notification) => {
 *       // Optionally trigger haptic/sound for new notifications
 *       console.log('New notification:', notification);
 *     },
 *   });
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export function useNotificationRealtime(
  userId: string | undefined,
  options: NotificationRealtimeOptions = {}
) {
  const { enabled = true, onNewNotification } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Store callback in ref to avoid re-subscribing when callback changes
  const onNewNotificationRef = useRef(onNewNotification);
  onNewNotificationRef.current = onNewNotification;

  useEffect(() => {
    // Don't subscribe if no user or disabled
    if (!userId || !enabled) {
      return;
    }

    // Create a unique channel name for this user
    const channelName = `notifications:${userId}`;

    // Subscribe to notification table changes for this user
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Invalidate notification queries to refetch
          queryClient.invalidateQueries({
            queryKey: notificationKeys.all,
          });

          // Call callback for new notifications
          if (payload.eventType === 'INSERT' && onNewNotificationRef.current) {
            onNewNotificationRef.current(payload.new);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup: unsubscribe when component unmounts or userId changes
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, queryClient]);

  // Return nothing - this hook is for side effects only
  return null;
}

export default useNotificationRealtime;
