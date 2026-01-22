'use client';

import { OrganizationTableRow } from '@/components/organization-table-row';
import { OrganizationsBulkActions } from '@/components/organizations-bulk-actions';
import { SortableTableHeader } from '@/components/sortable-table-header';
import { TablePagination } from '@/components/table-pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/types';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Organization = Tables<'organization'>;

interface OrganizationsTableClientProps {
  organizations: Pick<
    Organization,
    'id' | 'name' | 'email' | 'phone' | 'website' | 'nature' | 'slug' | 'is_active' | 'created_at'
  >[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function OrganizationsTableClient({
  organizations,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  sortBy,
  sortOrder,
}: OrganizationsTableClientProps) {
  const t = useTranslations('admin.organizations');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(organizations.map(org => org.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteComplete = () => {
    setSelectedIds(new Set());
  };

  const allSelected = organizations.length > 0 && selectedIds.size === organizations.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < organizations.length;

  return (
    <Card className="overflow-hidden flex flex-col">
      {organizations.length === 0 ? (
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground m-0">{t('table.noOrganizations')}</p>
        </CardContent>
      ) : (
        <>
          <OrganizationsBulkActions
            selectedIds={Array.from(selectedIds)}
            onDeleteComplete={handleDeleteComplete}
          />
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="rounded border-input h-4 w-4"
                    />
                  </th>
                  <SortableTableHeader
                    field="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                  >
                    {t('table.name')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="email"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                  >
                    {t('table.email')}
                  </SortableTableHeader>
                  <th className="text-left px-3 py-2 text-sm font-semibold">{t('table.phone')}</th>
                  <th className="text-left px-3 py-2 text-sm font-semibold">
                    {t('table.website')}
                  </th>
                  <SortableTableHeader
                    field="nature"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                  >
                    {t('table.nature')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="is_active"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                  >
                    {t('table.status')}
                  </SortableTableHeader>
                  <SortableTableHeader
                    field="created_at"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                  >
                    {t('table.createdAt')}
                  </SortableTableHeader>
                </tr>
              </thead>
              <tbody>
                {organizations.map(org => (
                  <OrganizationTableRow
                    key={org.id}
                    organization={org}
                    isSelected={selectedIds.has(org.id)}
                    onSelectChange={handleSelectChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}
    </Card>
  );
}
