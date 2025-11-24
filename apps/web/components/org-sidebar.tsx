"use client";

import { ModeToggle } from "@/components/mode-toggle";
import ThemeLogo from "@/components/theme-logo";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function OrgSidebar() {
  const t = useTranslations("app");
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const navItems = [
    {
      href: "/dashboard",
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
    },
    // Future routes for org admin - uncomment as you implement them
    // {
    //   href: "/organizations",
    //   label: t("nav.organizations"),
    //   icon: Building2,
    // },
    // {
    //   href: "/facilities",
    //   label: t("nav.facilities"),
    //   icon: MapPin,
    // },
    // {
    //   href: "/members",
    //   label: t("nav.members"),
    //   icon: Users,
    // },
    // {
    //   href: "/settings",
    //   label: t("nav.settings"),
    //   icon: Settings,
    // },
  ];

  return (
    <aside className="w-56 border-r border-[var(--secondary-200)] dark:border-[var(--secondary-800)] h-screen sticky top-0 flex flex-col overflow-y-auto">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-[var(--secondary-200)] dark:border-[var(--secondary-800)] flex justify-center">
        <ThemeLogo href="/dashboard" width={120} height={40} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary-100)] dark:bg-[var(--primary-800)] text-[var(--primary-700)] dark:text-[var(--primary-50)]"
                  : "text-muted-foreground hover:bg-[var(--secondary-100)] dark:hover:bg-[var(--secondary-800)] hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & Sign Out */}
      <div className="p-4 border-t border-[var(--secondary-200)] dark:border-[var(--secondary-800)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("nav.theme")}
          </span>
          <ModeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full cursor-pointer justify-start text-muted-foreground hover:text-foreground hover:bg-[var(--secondary-100)] dark:hover:bg-[var(--secondary-800)]"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 size-4" />
          {t("nav.signOut")}
        </Button>
      </div>
    </aside>
  );
}
