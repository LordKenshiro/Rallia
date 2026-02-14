'use client';

import { ModeToggle } from '@/components/mode-toggle';
import ThemeLogo from '@/components/theme-logo';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@rallia/shared-hooks';
import { Building2, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export function AdminSidebar() {
  const t = useTranslations('admin.sidebar');
  const tApp = useTranslations('app');
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { signOut } = useAuth({ client: supabase });

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/sign-in');
    router.refresh();
  };

  const navItems = [
    {
      href: '/admin/dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      rolesAllowed: ['super_admin', 'moderator', 'support'],
    },
    {
      href: '/admin/organizations',
      label: t('organizations'),
      icon: Building2,
      rolesAllowed: ['super_admin', 'support'],
    },
    {
      href: '/admin/users',
      label: t('users'),
      icon: Users,
      rolesAllowed: ['super_admin'],
    },
    // {
    //   href: '/admin/analytics',
    //   label: t('analytics'),
    //   icon: BarChart3,
    // },
    // {
    //   href: '/admin/settings',
    //   label: t('settings'),
    //   icon: Settings,
    // },
  ];

  return (
    <aside className="w-56 border-r border-[var(--secondary-200)] dark:border-[var(--secondary-800)] h-screen sticky top-0 flex flex-col overflow-y-auto bg-[var(--primary-50)] dark:bg-[var(--primary-900)]">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-[var(--secondary-200)] dark:border-[var(--secondary-800)] flex items-center justify-center gap-2">
        <ThemeLogo href="/admin/dashboard" width={100} height={33} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--primary-100)] dark:bg-[var(--primary-800)] text-[var(--primary-700)] dark:text-[var(--primary-50)]'
                  : 'text-muted-foreground hover:bg-[var(--secondary-100)] dark:hover:bg-[var(--secondary-800)] hover:text-foreground'
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
          <span className="text-sm text-muted-foreground">{tApp('nav.theme')}</span>
          <ModeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full cursor-pointer justify-start text-muted-foreground hover:text-foreground hover:bg-[var(--secondary-100)] dark:hover:bg-[var(--secondary-800)]"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 size-4" />
          {tApp('nav.signOut')}
        </Button>
      </div>
    </aside>
  );
}
