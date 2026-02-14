'use client';

import { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const ORG_COOKIE_NAME = 'selected-org-id';
const ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  selectOrganization: (org: Organization) => void;
  isLoading: boolean;
  hasMultipleOrgs: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Helper to set cookie
function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Load organizations on mount
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch all organization memberships
        const { data: memberships } = await supabase
          .from('organization_member')
          .select(
            `
            organization (
              id,
              name,
              slug
            )
          `
          )
          .eq('user_id', user.id)
          .is('left_at', null);

        const orgs: Organization[] = (memberships || [])
          .map(m => m.organization as Organization | null)
          .filter((org): org is Organization => org !== null);

        setOrganizations(orgs);

        // Try to load saved org from cookie
        const savedOrgId = getCookie(ORG_COOKIE_NAME);
        const savedOrg = orgs.find(o => o.id === savedOrgId);

        if (savedOrg) {
          setSelectedOrganization(savedOrg);
        } else if (orgs.length > 0) {
          // Default to first org
          setSelectedOrganization(orgs[0]);
          setCookie(ORG_COOKIE_NAME, orgs[0].id, ORG_COOKIE_MAX_AGE);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [supabase]);

  // Persist selection to cookie and reload
  const selectOrganization = useCallback((org: Organization) => {
    setSelectedOrganization(org);
    setCookie(ORG_COOKIE_NAME, org.id, ORG_COOKIE_MAX_AGE);
    // Reload the page to refresh data for the new organization
    window.location.reload();
  }, []);

  const hasMultipleOrgs = organizations.length > 1;

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganization,
        selectOrganization,
        isLoading,
        hasMultipleOrgs,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// Export cookie name for server-side usage
export const SELECTED_ORG_COOKIE_NAME = ORG_COOKIE_NAME;
