/**
 * Organization Notification Preferences Service
 * Handles CRUD operations for organization-level notification preferences.
 *
 * Organizations can configure:
 * - Which notification types are enabled per channel
 * - Which roles receive each notification type
 * - Specific user overrides for recipients
 */

import { supabase } from '../supabase';
import type {
  OrganizationNotificationPreference,
  OrganizationNotificationPreferenceInsert,
  OrganizationNotificationRecipient,
  OrganizationNotificationRecipientInsert,
  OrgNotificationTypeEnum,
  DeliveryChannelEnum,
  RoleEnum,
} from '@rallia/shared-types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@rallia/shared-types';

/**
 * Resolved preference with source information
 */
export interface ResolvedOrgPreference {
  notificationType: OrgNotificationTypeEnum;
  channel: DeliveryChannelEnum;
  enabled: boolean;
  recipientRoles: RoleEnum[] | null;
  source: 'explicit' | 'default';
}

/**
 * All preferences for an organization, organized by type and channel
 */
export interface OrgPreferencesMap {
  [notificationType: string]: {
    [channel: string]: ResolvedOrgPreference;
  };
}

// ============================================================================
// PREFERENCE CRUD OPERATIONS
// ============================================================================

/**
 * Get all explicit preferences for an organization
 */
export async function getOrgPreferences(
  organizationId: string
): Promise<OrganizationNotificationPreference[]> {
  const { data, error } = await supabase
    .from('organization_notification_preference')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to fetch org notification preferences: ${error.message}`);
  }

  return (data ?? []) as OrganizationNotificationPreference[];
}

/**
 * Get a single preference for an org/type/channel combination
 */
export async function getOrgPreference(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<OrganizationNotificationPreference | null> {
  const { data, error } = await supabase
    .from('organization_notification_preference')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch org preference: ${error.message}`);
  }

  return data as OrganizationNotificationPreference | null;
}

/**
 * Get resolved preferences for an organization, combining explicit settings with defaults
 */
export async function getResolvedOrgPreferences(
  organizationId: string
): Promise<OrgPreferencesMap> {
  // Fetch all explicit preferences
  const explicitPrefs = await getOrgPreferences(organizationId);

  // Build a lookup map for explicit preferences
  const explicitMap = new Map<string, OrganizationNotificationPreference>();
  for (const pref of explicitPrefs) {
    const key = `${pref.notification_type}:${pref.channel}`;
    explicitMap.set(key, pref);
  }

  // Build the complete preferences map
  const result: OrgPreferencesMap = {};

  // Only include organization notification types
  const orgNotificationTypes: OrgNotificationTypeEnum[] = [
    'booking_created',
    'booking_cancelled_by_player',
    'booking_modified',
    'new_member_joined',
    'member_left',
    'member_role_changed',
    'payment_received',
    'payment_failed',
    'refund_processed',
    'daily_summary',
    'weekly_report',
    'booking_confirmed',
    'booking_reminder',
    'booking_cancelled_by_org',
    'membership_approved',
    'org_announcement',
  ];

  for (const notificationType of orgNotificationTypes) {
    const channelDefaults = DEFAULT_NOTIFICATION_PREFERENCES[notificationType];
    if (!channelDefaults) continue;

    result[notificationType] = {};

    for (const [channel, defaultEnabled] of Object.entries(channelDefaults)) {
      const key = `${notificationType}:${channel}`;
      const explicit = explicitMap.get(key);

      result[notificationType][channel] = {
        notificationType,
        channel: channel as DeliveryChannelEnum,
        enabled: explicit ? explicit.enabled : defaultEnabled,
        recipientRoles: explicit?.recipient_roles ?? null,
        source: explicit ? 'explicit' : 'default',
      };
    }
  }

  return result;
}

/**
 * Check if a specific notification type + channel is enabled for an organization
 */
export async function isOrgChannelEnabled(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<boolean> {
  const explicit = await getOrgPreference(organizationId, notificationType, channel);

  if (explicit !== null) {
    return explicit.enabled;
  }

  // Fall back to default
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES[notificationType];
  if (defaults) {
    return defaults[channel] ?? false;
  }

  return false;
}

/**
 * Set a preference for an organization
 */
export async function setOrgPreference(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  channel: DeliveryChannelEnum,
  enabled: boolean,
  recipientRoles?: RoleEnum[] | null
): Promise<OrganizationNotificationPreference> {
  const insertData: OrganizationNotificationPreferenceInsert = {
    organization_id: organizationId,
    notification_type: notificationType,
    channel,
    enabled,
    recipient_roles: recipientRoles ?? null,
  };

  const { data, error } = await supabase
    .from('organization_notification_preference')
    .upsert(insertData, {
      onConflict: 'organization_id,notification_type,channel',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set org preference: ${error.message}`);
  }

  return data as OrganizationNotificationPreference;
}

/**
 * Set multiple preferences at once
 */
export async function setOrgPreferences(
  organizationId: string,
  preferences: Array<{
    notificationType: OrgNotificationTypeEnum;
    channel: DeliveryChannelEnum;
    enabled: boolean;
    recipientRoles?: RoleEnum[] | null;
  }>
): Promise<OrganizationNotificationPreference[]> {
  const insertData: OrganizationNotificationPreferenceInsert[] = preferences.map(pref => ({
    organization_id: organizationId,
    notification_type: pref.notificationType,
    channel: pref.channel,
    enabled: pref.enabled,
    recipient_roles: pref.recipientRoles ?? null,
  }));

  const { data, error } = await supabase
    .from('organization_notification_preference')
    .upsert(insertData, {
      onConflict: 'organization_id,notification_type,channel',
    })
    .select();

  if (error) {
    throw new Error(`Failed to set org preferences: ${error.message}`);
  }

  return (data ?? []) as OrganizationNotificationPreference[];
}

/**
 * Reset a preference to default (delete the explicit setting)
 */
export async function resetOrgPreference(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  channel: DeliveryChannelEnum
): Promise<void> {
  const { error } = await supabase
    .from('organization_notification_preference')
    .delete()
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('channel', channel);

  if (error) {
    throw new Error(`Failed to reset org preference: ${error.message}`);
  }
}

/**
 * Reset all preferences for an organization to defaults
 */
export async function resetAllOrgPreferences(organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('organization_notification_preference')
    .delete()
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to reset all org preferences: ${error.message}`);
  }
}

/**
 * Seed default preferences for a new organization
 */
export async function seedOrgDefaults(organizationId: string): Promise<void> {
  const { error } = await supabase.rpc('seed_org_notification_defaults', {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new Error(`Failed to seed org notification defaults: ${error.message}`);
  }
}

// ============================================================================
// RECIPIENT OVERRIDE OPERATIONS
// ============================================================================

/**
 * Get all recipient overrides for an organization
 */
export async function getOrgRecipients(
  organizationId: string
): Promise<OrganizationNotificationRecipient[]> {
  const { data, error } = await supabase
    .from('organization_notification_recipient')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to fetch org notification recipients: ${error.message}`);
  }

  return (data ?? []) as OrganizationNotificationRecipient[];
}

/**
 * Get recipient overrides for a specific notification type
 */
export async function getOrgRecipientsForType(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum
): Promise<OrganizationNotificationRecipient[]> {
  const { data, error } = await supabase
    .from('organization_notification_recipient')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('enabled', true);

  if (error) {
    throw new Error(`Failed to fetch org recipients for type: ${error.message}`);
  }

  return (data ?? []) as OrganizationNotificationRecipient[];
}

/**
 * Add a recipient override
 */
export async function addOrgRecipient(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  userId: string
): Promise<OrganizationNotificationRecipient> {
  const insertData: OrganizationNotificationRecipientInsert = {
    organization_id: organizationId,
    notification_type: notificationType,
    user_id: userId,
    enabled: true,
  };

  const { data, error } = await supabase
    .from('organization_notification_recipient')
    .upsert(insertData, {
      onConflict: 'organization_id,notification_type,user_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add org recipient: ${error.message}`);
  }

  return data as OrganizationNotificationRecipient;
}

/**
 * Remove a recipient override
 */
export async function removeOrgRecipient(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('organization_notification_recipient')
    .delete()
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove org recipient: ${error.message}`);
  }
}

/**
 * Toggle a recipient override enabled status
 */
export async function toggleOrgRecipient(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum,
  userId: string,
  enabled: boolean
): Promise<OrganizationNotificationRecipient> {
  const { data, error } = await supabase
    .from('organization_notification_recipient')
    .update({ enabled })
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle org recipient: ${error.message}`);
  }

  return data as OrganizationNotificationRecipient;
}

/**
 * Clear all recipient overrides for a notification type
 */
export async function clearOrgRecipientsForType(
  organizationId: string,
  notificationType: OrgNotificationTypeEnum
): Promise<void> {
  const { error } = await supabase
    .from('organization_notification_recipient')
    .delete()
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType);

  if (error) {
    throw new Error(`Failed to clear org recipients for type: ${error.message}`);
  }
}

/**
 * Organization preferences service object for grouped exports
 */
export const organizationPreferencesService = {
  // Preference CRUD
  getPreferences: getOrgPreferences,
  getPreference: getOrgPreference,
  getResolvedPreferences: getResolvedOrgPreferences,
  isChannelEnabled: isOrgChannelEnabled,
  setPreference: setOrgPreference,
  setPreferences: setOrgPreferences,
  resetPreference: resetOrgPreference,
  resetAllPreferences: resetAllOrgPreferences,
  seedDefaults: seedOrgDefaults,

  // Recipient overrides
  getRecipients: getOrgRecipients,
  getRecipientsForType: getOrgRecipientsForType,
  addRecipient: addOrgRecipient,
  removeRecipient: removeOrgRecipient,
  toggleRecipient: toggleOrgRecipient,
  clearRecipientsForType: clearOrgRecipientsForType,
};

export default organizationPreferencesService;
