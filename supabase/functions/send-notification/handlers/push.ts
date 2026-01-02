/**
 * Push Handler for Notification Delivery
 * Uses Expo Push Notification API to send push notifications
 */

import type { NotificationRecord, DeliveryResult } from '../types.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification via Expo
 */
export async function sendPush(
  notification: NotificationRecord,
  expoPushToken: string
): Promise<DeliveryResult> {
  try {
    // Validate token format
    if (
      !expoPushToken.startsWith('ExponentPushToken[') &&
      !expoPushToken.startsWith('ExpoPushToken[')
    ) {
      return {
        channel: 'push',
        status: 'failed',
        errorMessage: 'Invalid Expo push token format',
      };
    }

    const pushPayload = buildPushPayload(notification, expoPushToken);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        channel: 'push',
        status: 'failed',
        errorMessage: data?.errors?.[0]?.message || 'Failed to send push notification',
        providerResponse: data,
      };
    }

    // Check for ticket errors
    const ticket = data?.data?.[0];
    if (ticket?.status === 'error') {
      return {
        channel: 'push',
        status: 'failed',
        errorMessage: ticket.message || 'Push ticket error',
        providerResponse: ticket,
      };
    }

    return {
      channel: 'push',
      status: 'success',
      providerResponse: { ticketId: ticket?.id },
    };
  } catch (error) {
    return {
      channel: 'push',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build the Expo push notification payload
 */
function buildPushPayload(notification: NotificationRecord, expoPushToken: string) {
  const { title, body, type, target_id, payload, priority } = notification;

  // Map priority to Expo priority
  const expoPriority = priority === 'urgent' || priority === 'high' ? 'high' : 'normal';

  // Build data payload for deep linking
  const data: Record<string, unknown> = {
    notificationId: notification.id,
    type,
    targetId: target_id,
    ...payload,
  };

  // Determine channel ID for Android
  const channelId = type.startsWith('match_') ? 'match' : 'default';

  return {
    to: expoPushToken,
    title,
    body: body || undefined,
    data,
    sound: 'default',
    priority: expoPriority,
    channelId,
    // Badge count could be managed here if needed
    // badge: 1,
    // TTL for message expiry (24 hours for normal, 1 hour for urgent)
    ttl: priority === 'urgent' ? 3600 : 86400,
    // Collapse key for grouping similar notifications
    _contentAvailable: true,
  };
}

/**
 * Send push notifications to multiple tokens
 * Uses Expo's batch API for efficiency
 */
export async function sendPushBatch(
  notification: NotificationRecord,
  expoPushTokens: string[]
): Promise<DeliveryResult[]> {
  if (expoPushTokens.length === 0) {
    return [];
  }

  try {
    // Build payloads for all tokens
    const payloads = expoPushTokens
      .filter(token => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
      .map(token => buildPushPayload(notification, token));

    if (payloads.length === 0) {
      return expoPushTokens.map(() => ({
        channel: 'push' as const,
        status: 'failed' as const,
        errorMessage: 'Invalid Expo push token format',
      }));
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloads),
    });

    const data = await response.json();

    if (!response.ok) {
      return expoPushTokens.map(() => ({
        channel: 'push' as const,
        status: 'failed' as const,
        errorMessage: data?.errors?.[0]?.message || 'Failed to send push notification',
        providerResponse: data,
      }));
    }

    // Map tickets to results
    return (data?.data || []).map((ticket: { status: string; message?: string; id?: string }) => {
      if (ticket.status === 'error') {
        return {
          channel: 'push' as const,
          status: 'failed' as const,
          errorMessage: ticket.message || 'Push ticket error',
          providerResponse: ticket,
        };
      }
      return {
        channel: 'push' as const,
        status: 'success' as const,
        providerResponse: { ticketId: ticket.id },
      };
    });
  } catch (error) {
    return expoPushTokens.map(() => ({
      channel: 'push' as const,
      status: 'failed' as const,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}
