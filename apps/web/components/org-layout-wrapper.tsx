'use client';

import { usePathname } from '@/i18n/navigation';
import { OrgSidebar } from '@/components/org-sidebar';

export function OrgLayoutWrapper({
  children,
  hasOrg,
}: {
  children: React.ReactNode;
  hasOrg: boolean;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname?.includes('/onboarding');

  // Show sidebar only if user has org and is not on onboarding
  const showSidebar = hasOrg && !isOnboardingPage;

  return (
    <div className="flex min-h-screen">
      {showSidebar && <OrgSidebar />}
      <main className={`flex-1 overflow-auto ${showSidebar ? '' : 'mx-auto max-w-4xl'} relative`}>
        <div className={`${showSidebar ? 'max-w-7xl' : 'w-full'} mx-auto py-8 px-6`}>
          {children}
        </div>
      </main>
    </div>
  );
}
