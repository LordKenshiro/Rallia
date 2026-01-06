'use client';

import { Badge } from '@/components/ui/badge';
import { useRouter } from '@/i18n/navigation';
import { Tables } from '@/types';
import { useTranslations } from 'next-intl';

interface OrganizationTableRowProps {
  organization: Pick<
    Tables<'organization'>,
    'id' | 'name' | 'email' | 'phone' | 'website' | 'nature' | 'slug' | 'is_active' | 'created_at'
  >;
  isSelected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
}

export function OrganizationTableRow({
  organization,
  isSelected = false,
  onSelectChange,
}: OrganizationTableRowProps) {
  const router = useRouter();
  const t = useTranslations('admin.organizations');

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    router.push(`/admin/organizations/${organization.slug}`);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectChange?.(organization.id, e.target.checked);
  };

  return (
    <tr
      onClick={handleClick}
      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <td className="px-3 py-2 text-sm" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="rounded border-input h-4 w-4"
        />
      </td>
      <td className="px-3 py-2 text-sm">
        <span className="font-medium">{organization.name}</span>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{organization.email || '-'}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{organization.phone || '-'}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {organization.website ? (
          <a
            href={organization.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {organization.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          '-'
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        {organization.nature ? (
          <Badge variant="outline" className="text-xs">
            {t(`nature.${organization.nature}`)}
          </Badge>
        ) : (
          '-'
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        <Badge variant={organization.is_active ? 'default' : 'secondary'} className="text-xs">
          {organization.is_active ? t('status.active') : t('status.inactive')}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {formatDate(organization.created_at)}
      </td>
    </tr>
  );
}
