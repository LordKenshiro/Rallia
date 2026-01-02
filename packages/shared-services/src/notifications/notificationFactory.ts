/**
 * Notification Factory
 * Provides type-safe builders for creating notifications.
 * Handles template generation, priority assignment, and i18n support.
 */

import { supabase } from '../supabase';
import { createTranslator, normalizeLocale, defaultLocale } from '@rallia/shared-translations';
import type { Locale } from '@rallia/shared-translations';
import type {
  ExtendedNotificationTypeEnum,
  NotificationPriorityEnum,
  Notification,
} from '@rallia/shared-types';

/**
 * Payload types for different notification categories
 */
export interface MatchNotificationPayload {
  matchId: string;
  matchDate?: string;
  startTime?: string;
  sportName?: string;
  locationName?: string;
  playerName?: string;
}

export interface PlayerNotificationPayload {
  playerId: string;
  playerName: string;
  profilePictureUrl?: string;
}

export interface MessageNotificationPayload {
  conversationId: string;
  senderName: string;
  messagePreview?: string;
}

export interface RatingNotificationPayload {
  sportName: string;
  ratingSystemName: string;
  ratingValue: string;
}

/**
 * Union type for all notification payloads
 */
export type NotificationPayload =
  | MatchNotificationPayload
  | PlayerNotificationPayload
  | MessageNotificationPayload
  | RatingNotificationPayload
  | Record<string, unknown>;

// Cache for user locales to avoid repeated DB calls
const userLocaleCache = new Map<string, { locale: Locale; timestamp: number }>();
const LOCALE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch user's preferred locale from the database
 * Uses a short-lived cache to avoid repeated DB calls
 */
async function getUserLocale(userId: string): Promise<Locale> {
  // Check cache first
  const cached = userLocaleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < LOCALE_CACHE_TTL) {
    return cached.locale;
  }

  try {
    const { data, error } = await supabase
      .from('profile')
      .select('preferred_locale')
      .eq('id', userId)
      .single();

    if (error || !data?.preferred_locale) {
      return defaultLocale;
    }

    const locale = normalizeLocale(data.preferred_locale);

    // Cache the result
    userLocaleCache.set(userId, { locale, timestamp: Date.now() });

    return locale;
  } catch {
    return defaultLocale;
  }
}

/**
 * Fetch locales for multiple users at once
 * Returns a map of userId -> locale
 */
async function getUserLocales(userIds: string[]): Promise<Map<string, Locale>> {
  const result = new Map<string, Locale>();
  const uncachedUserIds: string[] = [];

  // Check cache first
  for (const userId of userIds) {
    const cached = userLocaleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < LOCALE_CACHE_TTL) {
      result.set(userId, cached.locale);
    } else {
      uncachedUserIds.push(userId);
    }
  }

  // Fetch uncached locales from database
  if (uncachedUserIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('id, preferred_locale')
        .in('id', uncachedUserIds);

      if (!error && data) {
        for (const profile of data) {
          const locale = normalizeLocale(profile.preferred_locale);
          result.set(profile.id, locale);
          userLocaleCache.set(profile.id, { locale, timestamp: Date.now() });
        }
      }
    } catch {
      // Ignore errors, use default locale
    }
  }

  // Set default for any missing users
  for (const userId of userIds) {
    if (!result.has(userId)) {
      result.set(userId, defaultLocale);
    }
  }

  return result;
}

/**
 * Get translated title for a notification type
 */
function getTranslatedTitle(
  type: ExtendedNotificationTypeEnum,
  locale: Locale,
  payload?: NotificationPayload
): string {
  const t = createTranslator(locale);
  const translationKey = `notifications.messages.${type}.title`;
  const translated = t(translationKey, payload as Record<string, string | number>);

  // If translation key was returned (not found), fall back to hardcoded templates
  if (translated === translationKey) {
    return TITLE_TEMPLATES[type] ?? 'Notification';
  }

  return translated;
}

/**
 * Get translated body for a notification type
 */
function getTranslatedBody(
  type: ExtendedNotificationTypeEnum,
  locale: Locale,
  payload?: NotificationPayload
): string {
  const t = createTranslator(locale);
  const translationKey = `notifications.messages.${type}.body`;
  const translated = t(translationKey, payload as Record<string, string | number>);

  // If translation key was returned (not found), fall back to hardcoded templates
  if (translated === translationKey) {
    return interpolateTemplate(BODY_TEMPLATES[type] ?? '', payload);
  }

  return translated;
}

/**
 * Input for creating a notification
 */
export interface CreateNotificationInput {
  /** Type of notification */
  type: ExtendedNotificationTypeEnum;
  /** User ID to send notification to */
  userId: string;
  /** Optional target entity ID (match, player, conversation, etc.) */
  targetId?: string;
  /** Title override (uses template if not provided) */
  title?: string;
  /** Body override (uses template if not provided) */
  body?: string;
  /** Additional payload data */
  payload?: NotificationPayload;
  /** Priority override (uses default for type if not provided) */
  priority?: NotificationPriorityEnum;
  /** Schedule for later delivery */
  scheduledAt?: Date;
  /** Expiration time */
  expiresAt?: Date;
}

/**
 * Default priorities for notification types
 */
const DEFAULT_PRIORITIES: Record<ExtendedNotificationTypeEnum, NotificationPriorityEnum> = {
  // Urgent - immediate attention required
  match_starting_soon: 'urgent',
  match_cancelled: 'urgent',

  // High - important but not time-critical
  match_invitation: 'high',
  match_join_request: 'high',
  match_join_accepted: 'high',
  match_join_rejected: 'high',
  match_player_joined: 'high',
  player_kicked: 'high',
  player_left: 'high',

  // Normal - standard notifications
  match_updated: 'normal',
  match_completed: 'normal',
  new_message: 'normal',
  chat: 'normal',
  friend_request: 'normal',
  rating_verified: 'normal',
  payment: 'normal',
  support: 'normal',
  reminder: 'normal',

  // Low - informational
  system: 'low',
};

/**
 * Title templates for notification types
 * Use {variable} for interpolation
 */
const TITLE_TEMPLATES: Record<ExtendedNotificationTypeEnum, string> = {
  match_invitation: 'Match Invitation',
  match_join_request: 'New Join Request',
  match_join_accepted: 'Join Request Accepted',
  match_join_rejected: 'Join Request Declined',
  match_player_joined: '{playerName} Joined',
  match_cancelled: 'Match Cancelled',
  match_updated: 'Match Updated',
  match_starting_soon: 'Match Starting Soon',
  match_completed: 'Match Completed',
  player_kicked: 'Removed from Match',
  player_left: '{playerName} Left',
  new_message: 'New Message',
  chat: 'New Message',
  friend_request: 'Friend Request',
  rating_verified: 'Rating Verified',
  reminder: 'Reminder',
  payment: 'Payment Update',
  support: 'Support Message',
  system: 'System Notification',
};

/**
 * Body templates for notification types
 * Use {variable} for interpolation from payload
 */
const BODY_TEMPLATES: Record<ExtendedNotificationTypeEnum, string> = {
  match_invitation: '{playerName} invited you to a {sportName} match',
  match_join_request: '{playerName} wants to join your match',
  match_join_accepted: 'Your request to join the match was accepted',
  match_join_rejected: 'Your request to join the match was declined',
  match_player_joined: '{playerName} joined your {sportName} match',
  match_cancelled: 'The {sportName} match on {matchDate} has been cancelled',
  match_updated: 'Match details have been updated',
  match_starting_soon: 'Your {sportName} match starts in 15 minutes',
  match_completed: 'Your {sportName} match has been marked as completed',
  player_kicked: 'You have been removed from a match',
  player_left: '{playerName} left your {sportName} match',
  new_message: '{senderName}: {messagePreview}',
  chat: 'You have a new message',
  friend_request: '{playerName} wants to connect with you',
  rating_verified: 'Your {ratingSystemName} rating of {ratingValue} has been verified',
  reminder: 'You have a reminder',
  payment: 'Payment status update',
  support: 'You have a message from support',
  system: 'System notification',
};

/**
 * Interpolate template variables with payload values
 */
function interpolateTemplate(template: string, payload?: NotificationPayload): string {
  if (!payload) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = (payload as Record<string, unknown>)[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Create a notification in the database using RPC to bypass RLS
 * Fetches user's preferred locale to generate localized title and body
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const { type, userId, targetId, title, body, payload, priority, scheduledAt, expiresAt } = input;

  // Fetch user's preferred locale for translations
  const userLocale = await getUserLocale(userId);

  // Generate title and body from translations if not provided
  const finalTitle = title ?? getTranslatedTitle(type, userLocale, payload);
  const finalBody = body ?? getTranslatedBody(type, userLocale, payload);
  const finalPriority = priority ?? DEFAULT_PRIORITIES[type] ?? 'normal';

  // Use RPC function to bypass RLS (SECURITY DEFINER)
  const { data, error } = await supabase.rpc('insert_notification', {
    p_user_id: userId,
    p_type: type,
    p_target_id: targetId ?? null,
    p_title: finalTitle,
    p_body: finalBody ?? null,
    p_payload: payload ?? {},
    p_priority: finalPriority,
    p_scheduled_at: scheduledAt?.toISOString() ?? null,
    p_expires_at: expiresAt?.toISOString() ?? null,
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data as Notification;
}

/**
 * Create multiple notifications at once (for batch operations)
 * Uses RPC function to bypass RLS
 * Fetches all users' preferred locales to generate localized notifications
 */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<Notification[]> {
  // Fetch all user locales at once for efficiency
  const userIds = [...new Set(inputs.map(input => input.userId))];
  const userLocales = await getUserLocales(userIds);

  const insertData = inputs.map(input => {
    const { type, userId, targetId, title, body, payload, priority, scheduledAt, expiresAt } =
      input;

    const userLocale = userLocales.get(userId) ?? defaultLocale;
    const finalTitle = title ?? getTranslatedTitle(type, userLocale, payload);
    const finalBody = body ?? getTranslatedBody(type, userLocale, payload);
    const finalPriority = priority ?? DEFAULT_PRIORITIES[type] ?? 'normal';

    return {
      user_id: userId,
      type,
      target_id: targetId ?? null,
      title: finalTitle,
      body: finalBody,
      payload: payload ?? {},
      priority: finalPriority,
      scheduled_at: scheduledAt?.toISOString() ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
    };
  });

  // Use RPC function to bypass RLS (SECURITY DEFINER)
  const { data, error } = await supabase.rpc('insert_notifications', {
    p_notifications: insertData,
  });

  if (error) {
    throw new Error(`Failed to create notifications: ${error.message}`);
  }

  return (data ?? []) as Notification[];
}

// ============================================================================
// CONVENIENCE BUILDERS
// Type-safe helper functions for common notification types
// ============================================================================

/**
 * Notify a host that someone wants to join their match
 */
export async function notifyMatchJoinRequest(
  hostUserId: string,
  matchId: string,
  playerName: string
): Promise<Notification> {
  return createNotification({
    type: 'match_join_request',
    userId: hostUserId,
    targetId: matchId,
    payload: { matchId, playerName },
  });
}

/**
 * Notify a player that their join request was accepted
 */
export async function notifyJoinRequestAccepted(
  playerUserId: string,
  matchId: string,
  matchDate?: string,
  sportName?: string
): Promise<Notification> {
  return createNotification({
    type: 'match_join_accepted',
    userId: playerUserId,
    targetId: matchId,
    payload: { matchId, matchDate, sportName },
  });
}

/**
 * Notify a player that their join request was rejected
 */
export async function notifyJoinRequestRejected(
  playerUserId: string,
  matchId: string
): Promise<Notification> {
  return createNotification({
    type: 'match_join_rejected',
    userId: playerUserId,
    targetId: matchId,
    payload: { matchId },
  });
}

/**
 * Notify match host and participants that a new player has joined (for open access matches)
 * Uses user's preferred locale for translations
 */
export async function notifyPlayerJoined(
  recipientUserIds: string[],
  matchId: string,
  playerName: string,
  sportName?: string,
  matchDate?: string,
  locationName?: string
): Promise<Notification[]> {
  // Title and body will be generated from translations in createNotifications
  // based on each user's preferred locale
  return createNotifications(
    recipientUserIds.map(userId => ({
      type: 'match_player_joined' as const,
      userId,
      targetId: matchId,
      payload: { matchId, playerName, sportName, matchDate, locationName },
    }))
  );
}

/**
 * Notify all participants that a match was cancelled
 */
export async function notifyMatchCancelled(
  participantUserIds: string[],
  matchId: string,
  matchDate: string,
  sportName: string
): Promise<Notification[]> {
  return createNotifications(
    participantUserIds.map(userId => ({
      type: 'match_cancelled' as const,
      userId,
      targetId: matchId,
      payload: { matchId, matchDate, sportName },
    }))
  );
}

/**
 * Notify all participants that a match was updated
 */
export async function notifyMatchUpdated(
  participantUserIds: string[],
  matchId: string,
  updatedFields?: string[]
): Promise<Notification[]> {
  return createNotifications(
    participantUserIds.map(userId => ({
      type: 'match_updated' as const,
      userId,
      targetId: matchId,
      payload: { matchId, updatedFields },
    }))
  );
}

/**
 * Notify participants that a match is starting soon
 */
export async function notifyMatchStartingSoon(
  participantUserIds: string[],
  matchId: string,
  sportName: string,
  locationName?: string
): Promise<Notification[]> {
  return createNotifications(
    participantUserIds.map(userId => ({
      type: 'match_starting_soon' as const,
      userId,
      targetId: matchId,
      payload: { matchId, sportName, locationName },
    }))
  );
}

/**
 * Notify a player they were kicked from a match
 */
export async function notifyPlayerKicked(
  playerUserId: string,
  matchId: string
): Promise<Notification> {
  return createNotification({
    type: 'player_kicked',
    userId: playerUserId,
    targetId: matchId,
    payload: { matchId },
  });
}

/**
 * Notify match host and participants that a player has left the match
 * Uses user's preferred locale for translations
 */
export async function notifyPlayerLeft(
  recipientUserIds: string[],
  matchId: string,
  playerName: string,
  sportName?: string
): Promise<Notification[]> {
  // Title and body will be generated from translations in createNotifications
  // based on each user's preferred locale
  return createNotifications(
    recipientUserIds.map(userId => ({
      type: 'player_left' as const,
      userId,
      targetId: matchId,
      payload: { matchId, playerName, sportName },
    }))
  );
}

/**
 * Notify a player they received a match invitation
 */
export async function notifyMatchInvitation(
  playerUserId: string,
  matchId: string,
  inviterName: string,
  sportName: string,
  matchDate: string
): Promise<Notification> {
  return createNotification({
    type: 'match_invitation',
    userId: playerUserId,
    targetId: matchId,
    payload: { matchId, playerName: inviterName, sportName, matchDate },
  });
}

/**
 * Notify a player about a new message
 */
export async function notifyNewMessage(
  playerUserId: string,
  conversationId: string,
  senderName: string,
  messagePreview?: string
): Promise<Notification> {
  return createNotification({
    type: 'new_message',
    userId: playerUserId,
    targetId: conversationId,
    payload: { conversationId, senderName, messagePreview },
  });
}

/**
 * Notify a player that their rating was verified
 */
export async function notifyRatingVerified(
  playerUserId: string,
  sportName: string,
  ratingSystemName: string,
  ratingValue: string
): Promise<Notification> {
  return createNotification({
    type: 'rating_verified',
    userId: playerUserId,
    payload: { sportName, ratingSystemName, ratingValue },
  });
}

/**
 * Notification factory object for grouped exports
 */
export const notificationFactory = {
  // Core functions
  create: createNotification,
  createBatch: createNotifications,

  // Match lifecycle
  matchJoinRequest: notifyMatchJoinRequest,
  joinRequestAccepted: notifyJoinRequestAccepted,
  joinRequestRejected: notifyJoinRequestRejected,
  playerJoined: notifyPlayerJoined,
  playerLeft: notifyPlayerLeft,
  matchCancelled: notifyMatchCancelled,
  matchUpdated: notifyMatchUpdated,
  matchStartingSoon: notifyMatchStartingSoon,
  matchInvitation: notifyMatchInvitation,
  playerKicked: notifyPlayerKicked,

  // Social
  newMessage: notifyNewMessage,
  ratingVerified: notifyRatingVerified,
};

export default notificationFactory;
