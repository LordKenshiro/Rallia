'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/i18n/navigation';
import { CreditCard, Settings, FileText, Users, DollarSign, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const t = useTranslations('settings');
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard/settings',
      label: t('nav.general'),
      description: t('nav.generalDesc'),
      icon: Settings,
      exactMatch: true,
    },
    {
      href: '/dashboard/settings/payments',
      label: t('nav.payments'),
      description: t('nav.paymentsDesc'),
      icon: CreditCard,
      exactMatch: false,
    },
    {
      href: '/dashboard/settings/policies',
      label: t('nav.policies'),
      description: t('nav.policiesDesc'),
      icon: FileText,
      exactMatch: false,
    },
    {
      href: '/dashboard/settings/members',
      label: t('nav.members'),
      description: t('nav.membersDesc'),
      icon: Users,
      exactMatch: false,
    },
    {
      href: '/dashboard/settings/pricing',
      label: t('nav.pricing'),
      description: t('nav.pricingDesc'),
      icon: DollarSign,
      exactMatch: false,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Settings Navigation */}
      <nav className="lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-4">
          <Card className="overflow-hidden">
            <CardContent className="p-2">
              <div className="space-y-1">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = item.exactMatch
                    ? pathname === item.href
                    : pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group animate-in fade-in-0 slide-in-from-left-2',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div
                        className={cn(
                          'p-1.5 rounded-md transition-colors',
                          isActive ? 'bg-primary/20' : 'bg-muted group-hover:bg-muted-foreground/10'
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          'size-4 transition-all',
                          isActive ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-50'
                        )}
                      />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </nav>

      {/* Settings Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
