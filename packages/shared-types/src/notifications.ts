/**
 * Notification Types
 * Types for the notification system, derived from Supabase generated types.
 */

import { Database } from './supabase';

// ============================================
// DATABASE TYPES (derived from Supabase)
// ============================================

/**
 * Notification row type from database
 */
export type Notification = Database['public']['Tables']['notification']['Row'];

/**
 * Type for creating a new notification
 */
export type NotificationCreate = Database['public']['Tables']['notification']['Insert'];

/**
 * Type for updating a notification
 */
export type NotificationUpdate = Database['public']['Tables']['notification']['Update'];

/**
 * Notification type enum values
 */
export type NotificationType = Database['public']['Enums']['notification_type_enum'];

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Options for fetching paginated notifications
 */
export interface NotificationQueryOptions {
  /** Number of notifications to fetch per page */
  pageSize?: number;
  /** Cursor for pagination (created_at of last item) */
  cursor?: string;
  /** Filter by read status */
  unreadOnly?: boolean;
  /** Filter by notification type */
  type?: NotificationType;
}

/**
 * Paginated notifications response
 */
export interface NotificationsPage {
  /** List of notifications */
  notifications: Notification[];
  /** Cursor for next page (created_at of last item) */
  nextCursor: string | null;
  /** Whether there are more notifications */
  hasMore: boolean;
}

// ============================================
// UI HELPER TYPES
// ============================================

/**
 * Notification with UI-specific computed properties
 */
export interface NotificationWithMeta extends Notification {
  /** Whether the notification is unread */
  isUnread: boolean;
  /** Relative time string (e.g., "2 min ago") */
  relativeTime?: string;
}

/**
 * Icon mapping for notification types
 */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  match_invitation: 'calendar-outline',
  reminder: 'alarm-outline',
  payment: 'card-outline',
  support: 'help-circle-outline',
  chat: 'chatbubble-outline',
  system: 'information-circle-outline',
};

/**
 * Color mapping for notification types
 */
export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  match_invitation: '#4DB8A8', // Teal
  reminder: '#FF9800', // Orange
  payment: '#4CAF50', // Green
  support: '#2196F3', // Blue
  chat: '#9C27B0', // Purple
  system: '#607D8B', // Blue Grey
};
