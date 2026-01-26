'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { SidebarProfile } from '@/components/sidebar-profile';
import ThemeLogo from '@/components/theme-logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@rallia/shared-hooks';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useSidebar } from './sidebar-context';

const locales = [
  { code: 'en-US', name: 'English', short: 'EN' },
  { code: 'fr-CA', name: 'Français', short: 'FR' },
] as const;

// Mock notifications - in a real app, these would come from a notification service
interface Notification {
  id: string;
  type: 'newBooking' | 'bookingCancelled' | 'paymentReceived';
  message: string;
  timestamp: Date;
  read: boolean;
}

export function OrgSidebar() {
  const t = useTranslations('app');
  const tNotif = useTranslations('app.notifications');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const { signOut } = useAuth({ client: supabase });
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [isPending, startTransition] = useTransition();

  // In a real app, notifications would be fetched from a store or API
  const [notifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'newBooking':
        return <CalendarCheck className="size-4 text-green-500" />;
      case 'bookingCancelled':
        return <CalendarX className="size-4 text-red-500" />;
      case 'paymentReceived':
        return <DollarSign className="size-4 text-blue-500" />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
    router.refresh();
  };

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;

    startTransition(() => {
      const pathWithoutLocale = pathname.startsWith('/') ? pathname : `/${pathname}`;
      const queryString = searchParams.toString();
      const queryPart = queryString ? `?${queryString}` : '';
      const newUrl = `/${newLocale}${pathWithoutLocale}${queryPart}`;
      window.location.href = newUrl;
    });
  };

  const navItems = [
    {
      href: '/dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      exactMatch: true,
    },
    {
      href: '/dashboard/facilities',
      label: t('nav.facilities'),
      icon: MapPin,
      exactMatch: false,
    },
    {
      href: '/dashboard/availability',
      label: t('nav.availability'),
      icon: Calendar,
      exactMatch: false,
    },
    {
      href: '/dashboard/bookings',
      label: t('nav.bookings'),
      icon: CalendarCheck,
      exactMatch: false,
    },
    {
      href: '/dashboard/analytics',
      label: t('nav.analytics'),
      icon: BarChart3,
      exactMatch: false,
    },
    {
      href: '/dashboard/settings',
      label: t('nav.settings'),
      icon: Settings,
      exactMatch: false,
    },
  ];

  const currentLocale = locales.find(l => l.code === locale) || locales[0];

  return (
    <aside
      className={cn(
        'border-r border-border bg-card h-screen sticky top-0 flex flex-col overflow-hidden',
        'transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Logo/Brand */}
      <div
        className={cn(
          'border-b border-border flex items-center justify-center transition-all duration-200',
          isCollapsed ? 'px-3 py-4' : 'px-5 py-4'
        )}
      >
        {isCollapsed ? (
          <Link href="/dashboard" className="flex items-center justify-center">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">R</span>
            </div>
          </Link>
        ) : (
          <ThemeLogo href="/dashboard" width={110} height={36} />
        )}
      </div>

      {/* Profile Section */}
      <div className="border-b border-border">
        <SidebarProfile />
      </div>

      {/* Notification Bell */}
      <div className={cn('border-b border-border p-3', isCollapsed && 'flex justify-center')}>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size={isCollapsed ? 'icon' : 'default'}
                  className={cn('relative', isCollapsed ? 'size-9' : 'w-full justify-start gap-2')}
                >
                  <Bell className="size-4" />
                  {!isCollapsed && <span>{t('nav.notifications')}</span>}
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        'absolute text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center',
                        isCollapsed ? 'top-0 right-0' : 'right-3'
                      )}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                {t('nav.notifications')} {unreadCount > 0 && `(${unreadCount})`}
              </TooltipContent>
            )}
          </Tooltip>
          <PopoverContent
            side={isCollapsed ? 'right' : 'bottom'}
            align="start"
            className="w-80 p-0"
            sideOffset={isCollapsed ? 12 : 8}
          >
            <div className="p-3 border-b font-medium flex items-center justify-between">
              <span>{tNotif('title')}</span>
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  {tNotif('markAllRead')}
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Bell className="size-8 mx-auto mb-2 opacity-50" />
                  {tNotif('empty')}
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer',
                      !notif.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">{getNotificationIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tNotif(notif.type)}</p>
                        <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.exactMatch
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href + '/');

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                'group relative',
                isCollapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <Icon
                className={cn(
                  'shrink-0 transition-transform duration-150',
                  isCollapsed ? 'size-5' : 'size-[18px]',
                  !isActive && 'group-hover:scale-105'
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Theme & Language Row */}
        <div
          className={cn('flex items-center gap-2', isCollapsed ? 'flex-col' : 'justify-between')}
        >
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground font-medium">{t('nav.theme')}</span>
          )}
          <div className={cn('flex items-center gap-1', isCollapsed && 'flex-col')}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ModeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{t('nav.theme')}</TooltipContent>
              </Tooltip>
            ) : (
              <ModeToggle />
            )}

            {/* Language Toggle */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      disabled={isPending}
                    >
                      <Globe className="size-4" />
                      <span className="sr-only">Change language</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    {currentLocale.name} ({currentLocale.short})
                  </TooltipContent>
                )}
              </Tooltip>
              <DropdownMenuContent align={isCollapsed ? 'center' : 'end'} side="top">
                {locales.map(loc => (
                  <DropdownMenuItem
                    key={loc.code}
                    onClick={() => handleLocaleChange(loc.code)}
                    className={cn('cursor-pointer', locale === loc.code && 'bg-accent font-medium')}
                  >
                    {loc.name}
                    {locale === loc.code && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Sign Out */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                <span className="sr-only">{t('nav.signOut')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('nav.signOut')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted h-9"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 size-4" />
            {t('nav.signOut')}
          </Button>
        )}

        <Separator className="my-2" />

        {/* Collapse Toggle */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={toggleCollapse}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Expand sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-muted h-9"
            onClick={toggleCollapse}
          >
            <span className="text-xs">Collapse</span>
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
