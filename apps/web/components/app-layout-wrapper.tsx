"use client";

import { usePathname } from "@/i18n/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";

export function AppLayoutWrapper({
  children,
  hasOrg,
}: {
  children: React.ReactNode;
  hasOrg: boolean;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname?.includes("/onboarding");

  // Show sidebar only if user has org and is not on onboarding
  const showSidebar = hasOrg && !isOnboardingPage;

  return (
    <div className="flex min-h-screen">
      {showSidebar && <AppSidebar />}
      <main
        className={`flex-1 overflow-auto ${
          showSidebar ? "" : "mx-auto max-w-4xl"
        } relative`}
      >
        {!showSidebar && (
          <div className="absolute top-4 right-4">
            <ModeToggle />
          </div>
        )}
        <div
          className={`${
            showSidebar ? "max-w-7xl" : "w-full"
          } mx-auto py-8 px-6`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
