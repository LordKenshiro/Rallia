/**
 * Notification Preferences Service
 * Handles CRUD operations for user notification preferences.
 *
 * Uses sparse storage: only explicit user customizations are stored in the database.
 * Missing preferences fall back to application-level defaults defined in constants.
 */

import { supabase } from '../supabase';
import type {
  NotificationPreference,
  NotificationPreferenceInsert,
  ExtendedNotificationTypeEnum,
  DeliveryChannelEnum,
} from '@rallia/shared-types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@rallia/shared-types';

/**
 * Preference value with source information
 */
export interface ResolvedPreference {
  notificationType: ExtendedNotificationTypeEnum;
  channel: DeliveryChannelEnum;
  enabled: boolean;
  /** Whether this is from user's explicit setting or default */
  source: 'explicit' | 'default';
}

/**
 * All preferences for a user, organized by type and channel
 */
export interface UserPreferencesMap {
  [notificationType: string]: {
    [channel: string]: ResolvedPreference;
  };
}

/**
 * Get all explicit preferences for a user
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from('notification_preference')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch notification preferences: ${error.message}`);
  }

  return (data ?? []) as NotificationPreference[];
}

/**
 * Get a single preference for a user/type/channel combination
 * Returns null if no explicit preference exists (use default)
 */
export async function getPreference(
  userId: string,
  notificationType: ExtendedNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<NotificationPreference | null> {
  const { data, error } = await supabase
    .from('notification_preference')
    .select('*')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch preference: ${error.message}`);
  }

  return data as NotificationPreference | null;
}

/**
 * Get resolved preferences for a user, combining explicit settings with defaults
 * Returns a complete map of all notification types and channels with their enabled status
 */
export async function getResolvedPreferences(userId: string): Promise<UserPreferencesMap> {
  // Fetch all explicit preferences
  const explicitPrefs = await getUserPreferences(userId);

  // Build a lookup map for explicit preferences
  const explicitMap = new Map<string, NotificationPreference>();
  for (const pref of explicitPrefs) {
    const key = `${pref.notification_type}:${pref.channel}`;
    explicitMap.set(key, pref);
  }

  // Build the complete preferences map
  const result: UserPreferencesMap = {};

  for (const [notificationType, channelDefaults] of Object.entries(
    DEFAULT_NOTIFICATION_PREFERENCES
  )) {
    result[notificationType] = {};

    for (const [channel, defaultEnabled] of Object.entries(channelDefaults)) {
      const key = `${notificationType}:${channel}`;
      const explicit = explicitMap.get(key);

      result[notificationType][channel] = {
        notificationType: notificationType as ExtendedNotificationTypeEnum,
        channel: channel as DeliveryChannelEnum,
        enabled: explicit ? explicit.enabled : defaultEnabled,
        source: explicit ? 'explicit' : 'default',
      };
    }
  }

  return result;
}

/**
 * Check if a specific notification type + channel is enabled for a user
 * This is the key function used by the delivery system
 */
export async function isChannelEnabled(
  userId: string,
  notificationType: ExtendedNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<boolean> {
  // First check for explicit preference
  const explicit = await getPreference(userId, notificationType, channel);

  if (explicit !== null) {
    return explicit.enabled;
  }

  // Fall back to default
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES[notificationType];
  if (defaults) {
    return defaults[channel] ?? false;
  }

  // Unknown notification type - default to disabled
  return false;
}

/**
 * Get all enabled channels for a notification type
 * Used by the delivery system to determine which channels to use
 */
export async function getEnabledChannels(
  userId: string,
  notificationType: ExtendedNotificationTypeEnum
): Promise<DeliveryChannelEnum[]> {
  const channels: DeliveryChannelEnum[] = ['email', 'push', 'sms'];
  const enabled: DeliveryChannelEnum[] = [];

  for (const channel of channels) {
    if (await isChannelEnabled(userId, notificationType, channel)) {
      enabled.push(channel);
    }
  }

  return enabled;
}

/**
 * Set a preference for a user
 * Uses upsert to create or update the preference
 */
export async function setPreference(
  userId: string,
  notificationType: ExtendedNotificationTypeEnum,
  channel: DeliveryChannelEnum,
  enabled: boolean
): Promise<NotificationPreference> {
  const insertData: NotificationPreferenceInsert = {
    user_id: userId,
    notification_type: notificationType,
    channel,
    enabled,
  };

  const { data, error } = await supabase
    .from('notification_preference')
    .upsert(insertData, {
      onConflict: 'user_id,notification_type,channel',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set preference: ${error.message}`);
  }

  return data as NotificationPreference;
}

/**
 * Set multiple preferences at once
 * Useful for bulk updates from the preferences UI
 */
export async function setPreferences(
  userId: string,
  preferences: Array<{
    notificationType: ExtendedNotificationTypeEnum;
    channel: DeliveryChannelEnum;
    enabled: boolean;
  }>
): Promise<NotificationPreference[]> {
  const insertData: NotificationPreferenceInsert[] = preferences.map(pref => ({
    user_id: userId,
    notification_type: pref.notificationType,
    channel: pref.channel,
    enabled: pref.enabled,
  }));

  const { data, error } = await supabase
    .from('notification_preference')
    .upsert(insertData, {
      onConflict: 'user_id,notification_type,channel',
    })
    .select();

  if (error) {
    throw new Error(`Failed to set preferences: ${error.message}`);
  }

  return (data ?? []) as NotificationPreference[];
}

/**
 * Reset a preference to default (delete the explicit setting)
 */
export async function resetPreference(
  userId: string,
  notificationType: ExtendedNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<void> {
  const { error } = await supabase
    .from('notification_preference')
    .delete()
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('channel', channel);

  if (error) {
    throw new Error(`Failed to reset preference: ${error.message}`);
  }
}

/**
 * Reset all preferences for a user to defaults
 */
export async function resetAllPreferences(userId: string): Promise<void> {
  const { error } = await supabase.from('notification_preference').delete().eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to reset all preferences: ${error.message}`);
  }
}

/**
 * Enable or disable an entire channel for all notification types
 * Useful for "turn off all push notifications" type features
 */
export async function setChannelEnabled(
  userId: string,
  channel: DeliveryChannelEnum,
  enabled: boolean
): Promise<void> {
  // Get all notification types
  const notificationTypes = Object.keys(
    DEFAULT_NOTIFICATION_PREFERENCES
  ) as ExtendedNotificationTypeEnum[];

  const preferences = notificationTypes.map(notificationType => ({
    notificationType,
    channel,
    enabled,
  }));

  await setPreferences(userId, preferences);
}

/**
 * Preferences service object for grouped exports
 */
export const preferencesService = {
  getUserPreferences,
  getPreference,
  getResolvedPreferences,
  isChannelEnabled,
  getEnabledChannels,
  setPreference,
  setPreferences,
  resetPreference,
  resetAllPreferences,
  setChannelEnabled,
};

export default preferencesService;
