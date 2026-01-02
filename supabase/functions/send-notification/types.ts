/**
 * Types for the send-notification Edge Function
 */

// Notification types (must match database enum)
export type NotificationType =
  | 'match_invitation'
  | 'match_join_request'
  | 'match_join_accepted'
  | 'match_join_rejected'
  | 'match_player_joined'
  | 'match_cancelled'
  | 'match_updated'
  | 'match_starting_soon'
  | 'match_completed'
  | 'player_kicked'
  | 'player_left'
  | 'new_message'
  | 'chat'
  | 'friend_request'
  | 'rating_verified'
  | 'reminder'
  | 'payment'
  | 'support'
  | 'system';

export type DeliveryChannel = 'email' | 'push' | 'sms';

export type DeliveryStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'skipped_preference'
  | 'skipped_missing_contact';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification record from database trigger
 */
export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  target_id: string | null;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  priority: NotificationPriority;
  scheduled_at: string | null;
  expires_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User contact info for delivery
 */
export interface UserContactInfo {
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  expo_push_token: string | null;
  push_notifications_enabled: boolean;
}

/**
 * Notification preference from database
 */
export interface NotificationPreference {
  notification_type: NotificationType;
  channel: DeliveryChannel;
  enabled: boolean;
}

/**
 * Delivery attempt record to insert
 */
export interface DeliveryAttemptInsert {
  notification_id: string;
  attempt_number: number;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  error_message?: string | null;
  provider_response?: Record<string, unknown> | null;
}

/**
 * Result of a delivery attempt
 */
export interface DeliveryResult {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  errorMessage?: string;
  providerResponse?: Record<string, unknown>;
}

/**
 * Default preferences for each notification type
 */
export const DEFAULT_PREFERENCES: Record<NotificationType, Record<DeliveryChannel, boolean>> = {
  match_invitation: { email: true, push: true, sms: false },
  match_join_request: { email: true, push: true, sms: false },
  match_join_accepted: { email: true, push: true, sms: false },
  match_join_rejected: { email: true, push: true, sms: false },
  match_player_joined: { email: false, push: true, sms: false },
  match_cancelled: { email: true, push: true, sms: true },
  match_updated: { email: false, push: true, sms: false },
  match_starting_soon: { email: false, push: true, sms: true },
  match_completed: { email: false, push: true, sms: false },
  player_kicked: { email: true, push: true, sms: false },
  player_left: { email: false, push: true, sms: false },
  chat: { email: false, push: true, sms: false },
  new_message: { email: false, push: true, sms: false },
  friend_request: { email: false, push: true, sms: false },
  rating_verified: { email: true, push: true, sms: false },
  reminder: { email: false, push: true, sms: false },
  payment: { email: true, push: true, sms: false },
  support: { email: true, push: false, sms: false },
  system: { email: true, push: false, sms: false },
};
