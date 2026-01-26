/**
 * useSharedLists Hook
 * React Query hooks for managing shared contact lists with real-time sync
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSharedContactLists,
  getSharedContactList,
  getSharedContacts,
  createSharedContactList,
  updateSharedContactList,
  deleteSharedContactList,
  createSharedContact,
  updateSharedContact,
  deleteSharedContact,
  bulkCreateSharedContacts,
  subscribeToSharedLists,
  subscribeToSharedContacts,
  unsubscribeFromSharedContactsChannel,
  type SharedContactList,
  type SharedContact,
  type CreateSharedContactListParams,
  type UpdateSharedContactListParams,
  type CreateSharedContactParams,
  type UpdateSharedContactParams,
  type BulkCreateSharedContactParams,
} from '@rallia/shared-services';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const sharedListsKeys = {
  all: ['sharedLists'] as const,
  lists: () => [...sharedListsKeys.all, 'lists'] as const,
  list: (listId: string) => [...sharedListsKeys.all, 'list', listId] as const,
  contacts: (listId: string) => [...sharedListsKeys.all, 'contacts', listId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get all shared contact lists for the current user
 */
export function useSharedLists() {
  return useQuery({
    queryKey: sharedListsKeys.lists(),
    queryFn: () => getSharedContactLists(),
  });
}

/**
 * Get a single shared contact list by ID
 */
export function useSharedList(listId: string | undefined) {
  return useQuery({
    queryKey: sharedListsKeys.list(listId || ''),
    queryFn: () => getSharedContactList(listId!),
    enabled: !!listId,
  });
}

/**
 * Get all contacts in a shared list
 */
export function useSharedContacts(listId: string | undefined) {
  return useQuery({
    queryKey: sharedListsKeys.contacts(listId || ''),
    queryFn: () => getSharedContacts(listId!),
    enabled: !!listId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new shared contact list
 */
export function useCreateSharedList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateSharedContactListParams) => createSharedContactList(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() });
    },
  });
}

/**
 * Update a shared contact list
 */
export function useUpdateSharedList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateSharedContactListParams) => updateSharedContactList(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.list(variables.id) });
    },
  });
}

/**
 * Delete a shared contact list
 */
export function useDeleteSharedList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deleteSharedContactList(listId),
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() });
      queryClient.removeQueries({ queryKey: sharedListsKeys.list(listId) });
      queryClient.removeQueries({ queryKey: sharedListsKeys.contacts(listId) });
    },
  });
}

/**
 * Create a new contact in a list
 */
export function useCreateSharedContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateSharedContactParams) => createSharedContact(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.contacts(variables.list_id) });
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() }); // Update contact count
    },
  });
}

/**
 * Update a contact
 */
export function useUpdateSharedContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateSharedContactParams & { listId: string }) =>
      updateSharedContact({
        id: params.id,
        name: params.name,
        phone: params.phone,
        email: params.email,
        notes: params.notes,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.contacts(variables.listId) });
    },
  });
}

/**
 * Delete a contact
 */
export function useDeleteSharedContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, listId: _listId }: { contactId: string; listId: string }) =>
      deleteSharedContact(contactId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.contacts(variables.listId) });
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() }); // Update contact count
    },
  });
}

/**
 * Bulk create contacts (e.g., from phone book import)
 */
export function useBulkCreateSharedContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkCreateSharedContactParams) => bulkCreateSharedContacts(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.contacts(variables.list_id) });
      queryClient.invalidateQueries({ queryKey: sharedListsKeys.lists() }); // Update contact count
    },
  });
}

// ============================================================================
// REALTIME HOOKS
// ============================================================================

/**
 * Subscribe to real-time updates for shared contact lists
 * Automatically refreshes when lists are created, updated, or deleted
 */
export function useSharedListsRealtime(playerId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playerId) return;

    const channel = subscribeToSharedLists(playerId, ({ eventType, list }) => {
      // Refresh the lists when any change occurs
      queryClient.invalidateQueries({
        queryKey: sharedListsKeys.lists(),
      });

      // If a specific list was updated, invalidate its detail query too
      if (
        (eventType === 'UPDATE' || eventType === 'DELETE') &&
        list &&
        typeof list === 'object' &&
        'id' in list
      ) {
        const listData = list as SharedContactList;
        if (eventType === 'DELETE') {
          queryClient.removeQueries({ queryKey: sharedListsKeys.list(listData.id) });
          queryClient.removeQueries({ queryKey: sharedListsKeys.contacts(listData.id) });
        } else {
          queryClient.invalidateQueries({ queryKey: sharedListsKeys.list(listData.id) });
        }
      }
    });

    return () => {
      unsubscribeFromSharedContactsChannel(channel);
    };
  }, [playerId, queryClient]);
}

/**
 * Subscribe to real-time updates for contacts in a specific list
 * Automatically refreshes when contacts are added, updated, or removed
 */
export function useSharedContactsRealtime(listId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listId) return;

    const channel = subscribeToSharedContacts(listId, () => {
      // Refresh the contacts list
      queryClient.invalidateQueries({
        queryKey: sharedListsKeys.contacts(listId),
      });
      // Also refresh the lists to update contact counts
      queryClient.invalidateQueries({
        queryKey: sharedListsKeys.lists(),
      });
    });

    return () => {
      unsubscribeFromSharedContactsChannel(channel);
    };
  }, [listId, queryClient]);
}

// Re-export types
export type {
  SharedContactList,
  SharedContact,
  CreateSharedContactListParams,
  UpdateSharedContactListParams,
  CreateSharedContactParams,
  UpdateSharedContactParams,
  BulkCreateSharedContactParams,
};
