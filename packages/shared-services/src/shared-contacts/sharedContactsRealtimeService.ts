/**
 * Shared Contacts Realtime Service
 * Real-time subscriptions for shared contact lists and contacts
 */

import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// SHARED CONTACT LIST SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to changes in player's shared contact lists
 */
export function subscribeToSharedLists(
  playerId: string,
  onListChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; list: unknown }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`shared_lists:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shared_contact_list',
        filter: `player_id=eq.${playerId}`,
      },
      payload => {
        onListChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          list: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// SHARED CONTACT SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to changes in contacts within a specific list
 */
export function subscribeToSharedContacts(
  listId: string,
  onContactChange: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    contact: unknown;
  }) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`shared_contacts:${listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shared_contact',
        filter: `list_id=eq.${listId}`,
      },
      payload => {
        onContactChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          contact: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Unsubscribe from a realtime channel
 */
export function unsubscribeFromSharedContactsChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
