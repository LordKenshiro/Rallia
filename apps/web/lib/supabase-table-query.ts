import { TableParams } from './table-params';

export interface TableQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Type representing any Postgrest query builder with the methods we need
type PostgrestQueryBuilder = {
  eq: (column: string, value: any) => any;
  ilike: (column: string, pattern: string) => any;
  order: (column: string, options: { ascending: boolean }) => any;
  range: (from: number, to: number) => any;
} & PromiseLike<{
  data: any[] | null;
  error: any | null;
  count: number | null;
}>;

export async function buildTableQuery<T>(
  query: PostgrestQueryBuilder,
  tableParams: TableParams,
  options?: {
    allowedSortFields?: string[];
    allowedFilterFields?: string[];
  }
): Promise<TableQueryResult<T>> {
  let qb = query;

  // Apply filters
  if (tableParams.filters && options?.allowedFilterFields) {
    Object.entries(tableParams.filters).forEach(([key, value]) => {
      if (value && options.allowedFilterFields?.includes(key)) {
        // Support different filter types
        if (key.includes('_like')) {
          const fieldName = key.replace('_like', '');
          qb = qb.ilike(fieldName, `%${value}%`);
        } else {
          qb = qb.eq(key, value);
        }
      }
    });
  }

  // Apply sorting
  if (tableParams.sortBy && options?.allowedSortFields?.includes(tableParams.sortBy)) {
    qb = qb.order(tableParams.sortBy, {
      ascending: tableParams.sortOrder === 'asc',
    });
  } else if (!tableParams.sortBy) {
    // Default sort if none specified
    qb = qb.order('created_at', { ascending: false });
  }

  // Apply pagination
  const from = (tableParams.page - 1) * tableParams.pageSize;
  const to = from + tableParams.pageSize - 1;
  qb = qb.range(from, to);

  const { data, error, count } = await qb;

  if (error) {
    throw error;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / tableParams.pageSize);

  return {
    data: (data || []) as T[],
    total,
    page: tableParams.page,
    pageSize: tableParams.pageSize,
    totalPages,
  };
}
