/**
 * useNotificationPreferences Hook
 * Custom hook for managing notification preferences with TanStack Query.
 * Provides optimistic updates and easy state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getResolvedPreferences,
  setPreference,
  setPreferences,
  resetAllPreferences,
  setChannelEnabled,
  type UserPreferencesMap,
} from '@rallia/shared-services';
import type { ExtendedNotificationTypeEnum, DeliveryChannelEnum } from '@rallia/shared-types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@rallia/shared-types';

// Query keys for cache management
export const notificationPreferenceKeys = {
  all: ['notificationPreferences'] as const,
  user: (userId: string) => [...notificationPreferenceKeys.all, userId] as const,
};

/**
 * Hook for fetching resolved notification preferences
 * Returns a complete map of all notification types and channels with their enabled status
 */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery<UserPreferencesMap, Error>({
    queryKey: notificationPreferenceKeys.user(userId ?? ''),
    queryFn: async () => {
      if (!userId) {
        // Return default preferences if no user
        const result: UserPreferencesMap = {};
        for (const [notificationType, channelDefaults] of Object.entries(
          DEFAULT_NOTIFICATION_PREFERENCES
        )) {
          result[notificationType] = {};
          for (const [channel, defaultEnabled] of Object.entries(channelDefaults)) {
            result[notificationType][channel] = {
              notificationType: notificationType as ExtendedNotificationTypeEnum,
              channel: channel as DeliveryChannelEnum,
              enabled: defaultEnabled,
              source: 'default',
            };
          }
        }
        return result;
      }
      return getResolvedPreferences(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for updating a single preference
 */
export function useSetPreference(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    {
      notificationType: ExtendedNotificationTypeEnum;
      channel: DeliveryChannelEnum;
      enabled: boolean;
    },
    { previousPreferences: UserPreferencesMap | undefined }
  >({
    mutationFn: async ({ notificationType, channel, enabled }) => {
      if (!userId) throw new Error('User ID is required');
      await setPreference(userId, notificationType, channel, enabled);
    },
    onMutate: async ({ notificationType, channel, enabled }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: notificationPreferenceKeys.user(userId ?? ''),
      });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<UserPreferencesMap>(
        notificationPreferenceKeys.user(userId ?? '')
      );

      // Optimistically update
      if (previousPreferences) {
        const updated = { ...previousPreferences };
        if (updated[notificationType]) {
          updated[notificationType] = {
            ...updated[notificationType],
            [channel]: {
              notificationType,
              channel,
              enabled,
              source: 'explicit' as const,
            },
          };
        }
        queryClient.setQueryData(notificationPreferenceKeys.user(userId ?? ''), updated);
      }

      return { previousPreferences };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          notificationPreferenceKeys.user(userId ?? ''),
          context.previousPreferences
        );
      }
    },
    // No onSettled invalidation - optimistic update already has the correct value
    // Refetching would cause a visual "bounce" as the toggle updates twice
  });
}

/**
 * Hook for updating multiple preferences at once
 */
export function useSetPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    Array<{
      notificationType: ExtendedNotificationTypeEnum;
      channel: DeliveryChannelEnum;
      enabled: boolean;
    }>,
    { previousPreferences: UserPreferencesMap | undefined }
  >({
    mutationFn: async preferences => {
      if (!userId) throw new Error('User ID is required');
      await setPreferences(userId, preferences);
    },
    onMutate: async preferences => {
      await queryClient.cancelQueries({
        queryKey: notificationPreferenceKeys.user(userId ?? ''),
      });

      const previousPreferences = queryClient.getQueryData<UserPreferencesMap>(
        notificationPreferenceKeys.user(userId ?? '')
      );

      if (previousPreferences) {
        const updated = { ...previousPreferences };
        for (const pref of preferences) {
          if (updated[pref.notificationType]) {
            updated[pref.notificationType] = {
              ...updated[pref.notificationType],
              [pref.channel]: {
                notificationType: pref.notificationType,
                channel: pref.channel,
                enabled: pref.enabled,
                source: 'explicit' as const,
              },
            };
          }
        }
        queryClient.setQueryData(notificationPreferenceKeys.user(userId ?? ''), updated);
      }

      return { previousPreferences };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          notificationPreferenceKeys.user(userId ?? ''),
          context.previousPreferences
        );
      }
    },
    // No onSettled invalidation - optimistic update already has the correct value
  });
}

/**
 * Hook for resetting all preferences to defaults
 */
export function useResetAllPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('User ID is required');
      await resetAllPreferences(userId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationPreferenceKeys.user(userId ?? ''),
      });
    },
  });
}

/**
 * Hook for enabling/disabling an entire channel
 */
export function useSetChannelEnabled(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { channel: DeliveryChannelEnum; enabled: boolean },
    { previousPreferences: UserPreferencesMap | undefined }
  >({
    mutationFn: async ({ channel, enabled }) => {
      if (!userId) throw new Error('User ID is required');
      await setChannelEnabled(userId, channel, enabled);
    },
    onMutate: async ({ channel, enabled }) => {
      await queryClient.cancelQueries({
        queryKey: notificationPreferenceKeys.user(userId ?? ''),
      });

      const previousPreferences = queryClient.getQueryData<UserPreferencesMap>(
        notificationPreferenceKeys.user(userId ?? '')
      );

      if (previousPreferences) {
        const updated = { ...previousPreferences };
        for (const notificationType of Object.keys(updated)) {
          if (updated[notificationType][channel]) {
            updated[notificationType] = {
              ...updated[notificationType],
              [channel]: {
                ...updated[notificationType][channel],
                enabled,
                source: 'explicit' as const,
              },
            };
          }
        }
        queryClient.setQueryData(notificationPreferenceKeys.user(userId ?? ''), updated);
      }

      return { previousPreferences };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          notificationPreferenceKeys.user(userId ?? ''),
          context.previousPreferences
        );
      }
    },
    // No onSettled invalidation - optimistic update already has the correct value
  });
}

/**
 * Combined hook that provides all notification preference functionality
 */
export function useNotificationPreferencesWithActions(userId: string | undefined) {
  const preferences = useNotificationPreferences(userId);
  const setPreferenceMutation = useSetPreference(userId);
  const setPreferencesMutation = useSetPreferences(userId);
  const resetAllMutation = useResetAllPreferences(userId);
  const setChannelMutation = useSetChannelEnabled(userId);

  return {
    // Query state
    preferences: preferences.data,
    isLoading: preferences.isLoading,
    error: preferences.error,
    refetch: preferences.refetch,

    // Single preference mutation
    setPreference: setPreferenceMutation.mutate,
    isSettingPreference: setPreferenceMutation.isPending,

    // Bulk preference mutation
    setPreferences: setPreferencesMutation.mutate,
    isSettingPreferences: setPreferencesMutation.isPending,

    // Reset all
    resetAll: resetAllMutation.mutate,
    isResetting: resetAllMutation.isPending,

    // Channel-wide toggle
    setChannelEnabled: setChannelMutation.mutate,
    isSettingChannel: setChannelMutation.isPending,
  };
}
