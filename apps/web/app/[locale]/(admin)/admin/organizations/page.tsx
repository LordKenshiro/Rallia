import { OrganizationsTableClient } from '@/components/organizations-table-client';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { buildTableQuery } from '@/lib/supabase-table-query';
import { createClient } from '@/lib/supabase/server';
import { parseTableParams } from '@/lib/table-params';
import { Tables } from '@/types';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Organization = Tables<'organization'>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.organizations');
  return {
    title: t('titleMeta'),
    description: t('descriptionMeta'),
  };
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('admin.organizations');
  const supabase = await createClient();
  const params = await searchParams;

  const tableParams = parseTableParams(params);

  try {
    // Build query with pagination, sorting, and filtering
    const query = supabase.from('organization').select(
      `
      id,
      name,
      email,
      phone,
      website,
      nature,
      slug,
      is_active,
      created_at,
      owner_id
    `,
      { count: 'exact' }
    );

    const result = await buildTableQuery<Organization>(query, tableParams, {
      allowedSortFields: ['name', 'email', 'created_at', 'is_active', 'nature'],
      allowedFilterFields: ['name_like', 'nature', 'is_active'],
    });

    return (
      <div className="flex flex-col w-full gap-8 h-full">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
          </div>
          <Link href="/admin/organizations/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t('createButton')}
            </Button>
          </Link>
        </div>

        <OrganizationsTableClient
          organizations={result.data}
          currentPage={result.page}
          totalPages={result.totalPages}
          totalItems={result.total}
          pageSize={result.pageSize}
          sortBy={tableParams.sortBy ?? undefined}
          sortOrder={tableParams.sortOrder ?? undefined}
        />
      </div>
    );
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return (
      <div className="flex flex-col w-full gap-8 h-full">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
          </div>
          <Link href="/admin/organizations/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t('createButton')}
            </Button>
          </Link>
        </div>
        <div className="grow overflow-hidden">
          <p className="text-destructive m-0">{t('table.error')}</p>
        </div>
      </div>
    );
  }
}
