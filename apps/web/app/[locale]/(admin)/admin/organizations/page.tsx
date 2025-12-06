import { OrganizationTableRow } from '@/components/organization-table-row';
import { SortableTableHeader } from '@/components/sortable-table-header';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { buildTableQuery } from '@/lib/supabase-table-query';
import { createClient } from '@/lib/supabase/server';
import { parseTableParams } from '@/lib/table-params';
import { Tables } from '@/types';
import { Building2, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Organization = Tables<'organizations'>;

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
    const query = supabase.from('organizations').select(
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

        <Card className="overflow-hidden flex flex-col">
          {result.data.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground m-0">{t('table.noOrganizations')}</p>
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <SortableTableHeader
                        field="name"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.name')}
                      </SortableTableHeader>
                      <SortableTableHeader
                        field="email"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.email')}
                      </SortableTableHeader>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.phone')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.website')}
                      </th>
                      <SortableTableHeader
                        field="nature"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.nature')}
                      </SortableTableHeader>
                      <SortableTableHeader
                        field="is_active"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.status')}
                      </SortableTableHeader>
                      <SortableTableHeader
                        field="created_at"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.createdAt')}
                      </SortableTableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map(org => (
                      <OrganizationTableRow key={org.id} organization={org} />
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={result.page}
                totalPages={result.totalPages}
                totalItems={result.total}
                pageSize={result.pageSize}
              />
            </>
          )}
        </Card>
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
        <Card className="grow overflow-hidden">
          <CardContent className="pt-6">
            <p className="text-destructive m-0">{t('table.error')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
