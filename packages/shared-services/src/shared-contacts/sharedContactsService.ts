/**
 * Shared Contacts Service
 * Handles CRUD operations for shared contact lists and contacts
 */

import { supabase } from '../supabase';
import { Logger } from '../logger';

// =============================================================================
// TYPES
// =============================================================================

export interface SharedContactList {
  id: string;
  player_id: string;
  name: string;
  description: string | null;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface SharedContact {
  id: string;
  list_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  source: 'phone_book' | 'manual';
  device_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSharedContactListParams {
  name: string;
  description?: string;
}

export interface UpdateSharedContactListParams {
  id: string;
  name?: string;
  description?: string;
}

export interface CreateSharedContactParams {
  list_id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  source?: 'phone_book' | 'manual';
  device_contact_id?: string;
}

export interface UpdateSharedContactParams {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface BulkCreateSharedContactParams {
  list_id: string;
  contacts: Omit<CreateSharedContactParams, 'list_id'>[];
}

// =============================================================================
// SHARED CONTACT LIST OPERATIONS
// =============================================================================

/**
 * Get all shared contact lists for the current user
 */
export async function getSharedContactLists(): Promise<SharedContactList[]> {
  const { data, error } = await supabase
    .from('shared_contact_list')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    Logger.error('Failed to fetch shared contact lists', error);
    throw new Error(`Failed to fetch shared contact lists: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single shared contact list by ID
 */
export async function getSharedContactList(listId: string): Promise<SharedContactList | null> {
  const { data, error } = await supabase
    .from('shared_contact_list')
    .select('*')
    .eq('id', listId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    Logger.error('Failed to fetch shared contact list', error);
    throw new Error(`Failed to fetch shared contact list: ${error.message}`);
  }

  return data;
}

/**
 * Create a new shared contact list
 */
export async function createSharedContactList(
  params: CreateSharedContactListParams
): Promise<SharedContactList> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('shared_contact_list')
    .insert({
      player_id: user.user.id,
      name: params.name,
      description: params.description || null,
    })
    .select()
    .single();

  if (error) {
    Logger.error('Failed to create shared contact list', error);
    throw new Error(`Failed to create shared contact list: ${error.message}`);
  }

  return data;
}

/**
 * Update a shared contact list
 */
export async function updateSharedContactList(
  params: UpdateSharedContactListParams
): Promise<SharedContactList> {
  const updates: Partial<SharedContactList> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;

  const { data, error } = await supabase
    .from('shared_contact_list')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    Logger.error('Failed to update shared contact list', error);
    throw new Error(`Failed to update shared contact list: ${error.message}`);
  }

  return data;
}

/**
 * Delete a shared contact list (cascades to contacts)
 */
export async function deleteSharedContactList(listId: string): Promise<void> {
  const { error } = await supabase.from('shared_contact_list').delete().eq('id', listId);

  if (error) {
    Logger.error('Failed to delete shared contact list', error);
    throw new Error(`Failed to delete shared contact list: ${error.message}`);
  }
}

// =============================================================================
// SHARED CONTACT OPERATIONS
// =============================================================================

/**
 * Get all contacts in a shared contact list
 */
export async function getSharedContacts(listId: string): Promise<SharedContact[]> {
  const { data, error } = await supabase
    .from('shared_contact')
    .select('*')
    .eq('list_id', listId)
    .order('name', { ascending: true });

  if (error) {
    Logger.error('Failed to fetch shared contacts', error);
    throw new Error(`Failed to fetch shared contacts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single shared contact by ID
 */
export async function getSharedContact(contactId: string): Promise<SharedContact | null> {
  const { data, error } = await supabase
    .from('shared_contact')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    Logger.error('Failed to fetch shared contact', error);
    throw new Error(`Failed to fetch shared contact: ${error.message}`);
  }

  return data;
}

/**
 * Create a new shared contact
 */
export async function createSharedContact(
  params: CreateSharedContactParams
): Promise<SharedContact> {
  // Validate at least one contact method
  if (!params.phone && !params.email) {
    throw new Error('At least one contact method (phone or email) is required');
  }

  const { data, error } = await supabase
    .from('shared_contact')
    .insert({
      list_id: params.list_id,
      name: params.name,
      phone: params.phone || null,
      email: params.email || null,
      notes: params.notes || null,
      source: params.source || 'manual',
      device_contact_id: params.device_contact_id || null,
    })
    .select()
    .single();

  if (error) {
    Logger.error('Failed to create shared contact', error);
    throw new Error(`Failed to create shared contact: ${error.message}`);
  }

  return data;
}

/**
 * Create multiple shared contacts at once (bulk import)
 */
export async function bulkCreateSharedContacts(
  params: BulkCreateSharedContactParams
): Promise<SharedContact[]> {
  // Filter contacts that have at least one contact method
  const validContacts = params.contacts.filter(c => c.phone || c.email);

  if (validContacts.length === 0) {
    return [];
  }

  const contactsToInsert = validContacts.map(contact => ({
    list_id: params.list_id,
    name: contact.name,
    phone: contact.phone || null,
    email: contact.email || null,
    notes: contact.notes || null,
    source: contact.source || 'phone_book',
    device_contact_id: contact.device_contact_id || null,
  }));

  const { data, error } = await supabase.from('shared_contact').insert(contactsToInsert).select();

  if (error) {
    Logger.error('Failed to bulk create shared contacts', error);
    throw new Error(`Failed to bulk create shared contacts: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a shared contact
 */
export async function updateSharedContact(
  params: UpdateSharedContactParams
): Promise<SharedContact> {
  const updates: Partial<SharedContact> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.phone !== undefined) updates.phone = params.phone || null;
  if (params.email !== undefined) updates.email = params.email || null;
  if (params.notes !== undefined) updates.notes = params.notes || null;

  const { data, error } = await supabase
    .from('shared_contact')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    Logger.error('Failed to update shared contact', error);
    throw new Error(`Failed to update shared contact: ${error.message}`);
  }

  return data;
}

/**
 * Delete a shared contact
 */
export async function deleteSharedContact(contactId: string): Promise<void> {
  const { error } = await supabase.from('shared_contact').delete().eq('id', contactId);

  if (error) {
    Logger.error('Failed to delete shared contact', error);
    throw new Error(`Failed to delete shared contact: ${error.message}`);
  }
}

/**
 * Delete multiple shared contacts at once
 */
export async function bulkDeleteSharedContacts(contactIds: string[]): Promise<void> {
  if (contactIds.length === 0) return;

  const { error } = await supabase.from('shared_contact').delete().in('id', contactIds);

  if (error) {
    Logger.error('Failed to bulk delete shared contacts', error);
    throw new Error(`Failed to bulk delete shared contacts: ${error.message}`);
  }
}

/**
 * Get shared contact list with all contacts
 */
export async function getSharedContactListWithContacts(
  listId: string
): Promise<(SharedContactList & { contacts: SharedContact[] }) | null> {
  const list = await getSharedContactList(listId);
  if (!list) return null;

  const contacts = await getSharedContacts(listId);

  return {
    ...list,
    contacts,
  };
}
