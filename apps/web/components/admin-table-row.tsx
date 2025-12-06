'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale, useTranslations } from 'next-intl';

interface AdminTableRowProps {
  admin: {
    id: string;
    role: 'super_admin' | 'moderator' | 'support';
    assigned_at: string;
    full_name: string | null;
    display_name: string | null;
    email: string;
    is_active: boolean;
    created_at: string;
  };
}

export function AdminTableRow({ admin }: AdminTableRowProps) {
  const t = useTranslations('admin.users');
  const locale = useLocale();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const displayName = admin.display_name || admin.full_name || '-';

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="px-3 py-2 text-sm">
        <span className="font-medium">{displayName}</span>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{admin.email || '-'}</td>
      <td className="px-3 py-2 text-sm">
        <Badge variant="outline" className="text-xs">
          {t(`roles.${admin.role}`)}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(admin.assigned_at)}</td>
      <td className="px-3 py-2 text-sm">
        <Badge variant={admin.is_active ? 'default' : 'secondary'} className="text-xs">
          {admin.is_active ? t('status.active') : t('status.inactive')}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(admin.created_at)}</td>
    </tr>
  );
}
