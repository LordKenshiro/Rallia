/**
 * Community Realtime Service
 * Real-time subscriptions for community members, activity, and matches
 * Mirrors groupRealtimeService but for communities
 */

import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// COMMUNITY MEMBER SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to member changes in a community (joins, leaves, role changes)
 */
export function subscribeToCommunityMembers(
  communityId: string,
  onMemberChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; member: unknown }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`community_members:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'network_member',
        filter: `network_id=eq.${communityId}`,
      },
      payload => {
        onMemberChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          member: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// COMMUNITY ACTIVITY SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to activity feed for a community
 */
export function subscribeToCommunityActivity(
  communityId: string,
  onActivity: (payload: { eventType: 'INSERT'; activity: unknown }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`community_activity:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'network_activity',
        filter: `network_id=eq.${communityId}`,
      },
      payload => {
        onActivity({
          eventType: 'INSERT',
          activity: payload.new,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// COMMUNITY MATCH SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to match changes for a community (new matches, score updates)
 */
export function subscribeToCommunityMatches(
  communityId: string,
  onMatchChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; match: unknown }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`community_matches:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_network',
        filter: `network_id=eq.${communityId}`,
      },
      payload => {
        onMatchChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          match: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// COMMUNITY SETTINGS SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to community settings changes (name, description, cover image, visibility)
 */
export function subscribeToCommunitySettings(
  communityId: string,
  onCommunityChange: (payload: { eventType: 'UPDATE' | 'DELETE'; community: unknown }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`community_settings:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'network',
        filter: `id=eq.${communityId}`,
      },
      payload => {
        onCommunityChange({
          eventType: payload.eventType as 'UPDATE' | 'DELETE',
          community: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// PLAYER'S COMMUNITIES LIST SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to changes in player's community memberships
 * Useful for updating the communities list screen
 */
export function subscribeToPlayerCommunities(
  playerId: string,
  onMembershipChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    membership: unknown;
  }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`player_communities:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'network_member',
        filter: `player_id=eq.${playerId}`,
      },
      payload => {
        onMembershipChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          membership: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// PUBLIC COMMUNITIES SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to changes in public communities (new communities, member count changes)
 * Useful for discovery/explore screen
 */
export function subscribeToPublicCommunities(
  onCommunityChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    community: unknown;
  }) => void
): RealtimeChannel {
  const channel = supabase
    .channel('public_communities')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'network',
        // We'll filter for communities with is_private=false on the client side
        // since Supabase filters don't support JOINs
      },
      payload => {
        const data = (payload.new || payload.old) as Record<string, unknown> | null;
        // Only emit if it's a public network (not private)
        if (data && !data.is_private) {
          onCommunityChange({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            community: data,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// PENDING REQUESTS SUBSCRIPTION (for moderators)
// ============================================================================

/**
 * Subscribe to pending membership requests for a community
 * Useful for moderators to see new join requests in real-time
 */
export function subscribeToPendingRequests(
  communityId: string,
  onRequestChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    request: unknown;
  }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`pending_requests:${communityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'network_member',
        filter: `network_id=eq.${communityId}`,
      },
      payload => {
        const data = (payload.new || payload.old) as Record<string, unknown> | null;
        const oldData = payload.old as Record<string, unknown> | null;
        // Only emit for pending status changes
        if (data && (data.status === 'pending' || oldData?.status === 'pending')) {
          onRequestChange({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            request: data,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Unsubscribe from a community channel
 */
export function unsubscribeFromCommunityChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
