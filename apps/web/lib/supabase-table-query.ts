import { TableParams } from './table-params';

export interface TableQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Type representing any Postgrest query builder with the methods we need
interface PostgrestQueryBuilder {
  eq: (column: string, value: unknown) => PostgrestQueryBuilder;
  ilike: (column: string, pattern: string) => PostgrestQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => PostgrestQueryBuilder;
  range: (from: number, to: number) => PostgrestQueryBuilder;
  then: PromiseLike<{
    data: unknown[] | null;
    error: Error | null;
    count: number | null;
  }>['then'];
}

/**
 * Builds and executes a table query with filtering, sorting, and pagination.
 *
 * Note: This function accepts a Supabase query builder and applies operations dynamically.
 * The query parameter uses a loose type to accommodate Supabase's strict generic typing.
 */
export async function buildTableQuery<T>(
  // Accept the query as unknown to allow Supabase's strictly-typed query builders
  query: unknown,
  tableParams: TableParams,
  options?: {
    allowedSortFields?: string[];
    allowedFilterFields?: string[];
  }
): Promise<TableQueryResult<T>> {
  let qb = query as PostgrestQueryBuilder;

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
