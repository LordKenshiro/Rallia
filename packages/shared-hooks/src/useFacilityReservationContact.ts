/**
 * useFacilityReservationContact Hook
 *
 * Fetches reservation contact information for a facility.
 * Prioritizes contacts in the following order:
 * 1. Sport-specific reservation contact
 * 2. Facility-wide reservation contact
 * 3. Sport-specific general contact
 * 4. Facility-wide general contact (primary first)
 * 5. Organization contact (fallback if no facility contacts exist)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@rallia/shared-services';

// =============================================================================
// TYPES
// =============================================================================

export interface FacilityReservationContact {
  id: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  contactType: 'reservation' | 'general' | 'maintenance' | 'other';
  isPrimary: boolean;
}

interface UseFacilityReservationContactResult {
  /** The best matching contact for reservations */
  contact: FacilityReservationContact | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether a contact was found */
  hasContact: boolean;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const facilityContactKeys = {
  all: ['facilityContacts'] as const,
  reservation: (facilityId: string, sportId?: string) =>
    [...facilityContactKeys.all, 'reservation', facilityId, sportId] as const,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to fetch the best reservation contact for a facility.
 *
 * @param facilityId - The facility ID to fetch contacts for
 * @param sportId - Optional sport ID to prioritize sport-specific contacts
 * @returns The best matching contact, loading state, and error
 *
 * @example
 * ```tsx
 * const { contact, isLoading, hasContact } = useFacilityReservationContact(facilityId, sportId);
 *
 * if (hasContact && contact.phone) {
 *   // Show call button
 * }
 * ```
 */
export function useFacilityReservationContact(
  facilityId: string | undefined,
  sportId?: string
): UseFacilityReservationContactResult {
  const { data, isLoading, error } = useQuery({
    queryKey: facilityContactKeys.reservation(facilityId ?? '', sportId),
    queryFn: async (): Promise<FacilityReservationContact | null> => {
      if (!facilityId) {
        return null;
      }

      // Fetch all contacts for this facility
      const { data: contacts, error: fetchError } = await supabase
        .from('facility_contact')
        .select('id, phone, email, website, notes, contact_type, is_primary, sport_id')
        .eq('facility_id', facilityId)
        .in('contact_type', ['reservation', 'general'])
        .order('is_primary', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch facility contacts');
      }

      // Priority selection logic:
      // 1. Sport-specific reservation contact
      // 2. Facility-wide reservation contact (sport_id is null)
      // 3. Sport-specific general contact
      // 4. Facility-wide general contact (primary first)

      let selectedContact = null;

      if (contacts && contacts.length > 0) {
        // 1. Sport-specific reservation contact
        if (sportId) {
          selectedContact = contacts.find(
            c => c.contact_type === 'reservation' && c.sport_id === sportId
          );
        }

        // 2. Facility-wide reservation contact
        if (!selectedContact) {
          selectedContact = contacts.find(
            c => c.contact_type === 'reservation' && c.sport_id === null
          );
        }

        // 3. Sport-specific general contact
        if (!selectedContact && sportId) {
          selectedContact = contacts.find(
            c => c.contact_type === 'general' && c.sport_id === sportId
          );
        }

        // 4. Facility-wide general contact (already sorted by is_primary desc)
        if (!selectedContact) {
          selectedContact = contacts.find(c => c.contact_type === 'general' && c.sport_id === null);
        }

        // Fallback to any contact if none matched the priority
        if (!selectedContact && contacts.length > 0) {
          selectedContact = contacts[0];
        }
      }

      // Check if we found a facility contact with useful information
      if (selectedContact) {
        const hasContactInfo =
          selectedContact.phone || selectedContact.email || selectedContact.website;

        if (hasContactInfo) {
          return {
            id: selectedContact.id,
            phone: selectedContact.phone,
            email: selectedContact.email,
            website: selectedContact.website,
            notes: selectedContact.notes,
            contactType: selectedContact.contact_type as FacilityReservationContact['contactType'],
            isPrimary: selectedContact.is_primary,
          };
        }
      }

      // 5. Fallback: Get organization contact if no facility contacts found
      // First, get the facility's organization_id
      const { data: facility, error: facilityError } = await supabase
        .from('facility')
        .select('organization_id')
        .eq('id', facilityId)
        .maybeSingle();

      if (facilityError || !facility?.organization_id) {
        return null;
      }

      // Fetch organization contact info
      const { data: organization, error: orgError } = await supabase
        .from('organization')
        .select('id, phone, email, website')
        .eq('id', facility.organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (orgError || !organization) {
        return null;
      }

      // Check if organization has any useful contact info
      const hasOrgContactInfo = organization.phone || organization.email || organization.website;

      if (!hasOrgContactInfo) {
        return null;
      }

      // Return organization contact as fallback
      return {
        id: organization.id,
        phone: organization.phone,
        email: organization.email,
        website: organization.website,
        notes: null,
        contactType: 'general' as const,
        isPrimary: true,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 10, // 10 minutes - contact info doesn't change often
  });

  return {
    contact: data ?? null,
    isLoading,
    error: error as Error | null,
    hasContact: !!data,
  };
}

export default useFacilityReservationContact;
