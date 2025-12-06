'use client';

import { useOrganizationForm } from '@/hooks/useOrganizationForm';
import { OrganizationFormContext } from './OrganizationFormContext';
import type { AdminOrganizationFormProps } from './types';

interface OrganizationFormProviderProps extends AdminOrganizationFormProps {
  children: React.ReactNode;
}

export function OrganizationFormProvider({
  organizationSlug,
  initialData,
  children,
}: OrganizationFormProviderProps) {
  const formState = useOrganizationForm({ organizationSlug, initialData });

  return (
    <OrganizationFormContext.Provider value={formState}>
      {children}
    </OrganizationFormContext.Provider>
  );
}
