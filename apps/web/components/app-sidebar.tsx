"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function AppSidebar() {
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
    // Future routes - uncomment as you implement them
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
    <aside className="w-64 border-r border-[var(--secondary-200)] dark:border-[var(--secondary-800)] h-screen sticky top-0 flex flex-col overflow-y-auto">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
        <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
          <h2 className="text-2xl font-bold">Rallia</h2>
        </Link>
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
                  ? "bg-[var(--primary-100)] dark:bg-[var(--primary-900)] text-[var(--primary-700)] dark:text-[var(--primary-300)]"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 size-4" />
          {t("nav.signOut")}
        </Button>
      </div>
    </aside>
  );
}
