import { AdminTableRow } from '@/components/admin-table-row';
import { SortableTableHeader } from '@/components/sortable-table-header';
import { TablePagination } from '@/components/table-pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserInvitationButton } from '@/components/user-invitation-button';
import { buildTableQuery } from '@/lib/supabase-table-query';
import { parseTableParams } from '@/lib/table-params';
import { createClient } from '@/lib/supabase/server';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { isSuperAdmin } from '@/lib/supabase/check-admin';
import { redirect } from 'next/navigation';

interface AdminWithProfile {
  id: string;
  role: 'super_admin' | 'moderator' | 'support';
  assigned_at: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    display_name: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
}

interface TransformedAdmin {
  id: string;
  role: 'super_admin' | 'moderator' | 'support';
  assigned_at: string;
  full_name: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  email: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.users');
  return {
    title: t('titleMeta'),
    description: t('descriptionMeta'),
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('admin.users');
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  const userIsSuperAdmin = await isSuperAdmin(user.id);

  const tableParams = parseTableParams(params);

  // Set default sort if none specified (admins table doesn't have created_at)
  if (!tableParams.sortBy) {
    tableParams.sortBy = 'assigned_at';
    tableParams.sortOrder = 'desc';
  }

  // Fetch admins with profile data
  let adminsResult: {
    data: TransformedAdmin[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null = null;

  try {
    const query = supabase.from('admins').select(
      `
        id,
        role,
        assigned_at,
        notes,
        profiles (
          full_name,
          display_name,
          is_active,
          created_at
        )
      `,
      { count: 'exact' }
    );

    const result = await buildTableQuery<AdminWithProfile>(query, tableParams, {
      allowedSortFields: ['role', 'assigned_at'],
      allowedFilterFields: ['role'],
    });

    // Transform the data to flatten profiles
    const transformedData = result.data.map(admin => ({
      id: admin.id,
      role: admin.role,
      assigned_at: admin.assigned_at,
      full_name: admin.profiles?.full_name || null,
      display_name: admin.profiles?.display_name || null,
      is_active: admin.profiles?.is_active ?? true,
      created_at: admin.profiles?.created_at || admin.assigned_at,
      email: '', // Email will need to be fetched separately via admin API if needed
    }));

    adminsResult = {
      ...result,
      data: transformedData,
    };
  } catch (error) {
    console.error('Error fetching admins:', error);
  }

  return (
    <div className="flex flex-col w-full gap-8 h-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
        </div>
        {userIsSuperAdmin && <UserInvitationButton />}
      </div>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList>
          <TabsTrigger value="admins">{t('tabs.admins')}</TabsTrigger>
          <TabsTrigger value="organizationMembers">{t('tabs.organizationMembers')}</TabsTrigger>
          <TabsTrigger value="players">{t('tabs.players')}</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-6">
          {!adminsResult ? (
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <p className="text-destructive m-0">{t('table.error')}</p>
              </CardContent>
            </Card>
          ) : adminsResult.data.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground m-0">{t('table.noAdmins')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="grow overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.name')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.email')}
                      </th>
                      <SortableTableHeader
                        field="role"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.role')}
                      </SortableTableHeader>
                      <SortableTableHeader
                        field="assigned_at"
                        currentSortBy={tableParams.sortBy}
                        currentSortOrder={tableParams.sortOrder}
                      >
                        {t('table.assignedAt')}
                      </SortableTableHeader>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.status')}
                      </th>
                      <th className="text-left px-3 py-2 text-sm font-semibold">
                        {t('table.createdAt')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsResult.data.map(admin => (
                      <AdminTableRow
                        key={admin.id}
                        admin={{
                          id: admin.id,
                          role: admin.role,
                          assigned_at: admin.assigned_at,
                          full_name: admin.full_name,
                          display_name: admin.display_name,
                          email: admin.email,
                          is_active: admin.is_active,
                          created_at: admin.created_at,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={adminsResult.page}
                totalPages={adminsResult.totalPages}
                totalItems={adminsResult.total}
                pageSize={adminsResult.pageSize}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="organizationMembers" className="mt-6">
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground m-0">{t('tabs.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground m-0">{t('tabs.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
