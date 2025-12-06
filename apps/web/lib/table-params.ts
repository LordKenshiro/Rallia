export interface TableParams {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, string | null>;
}

export const DEFAULT_PAGE_SIZE = 15;

export function parseTableParams(
  searchParams: Record<string, string | string[] | undefined>
): TableParams {
  const page = Math.max(1, parseInt(String(searchParams.page || '1'), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(
      1,
      parseInt(String(searchParams.pageSize || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
    )
  );

  const sortBy = searchParams.sortBy ? String(searchParams.sortBy) : null;
  const sortOrder = searchParams.sortOrder === 'asc' ? 'asc' : 'desc';

  // Parse filters (e.g., filter[name]=value, filter[status]=active)
  const filters: Record<string, string | null> = {};
  Object.keys(searchParams).forEach(key => {
    const filterMatch = key.match(/^filter\[(.+)\]$/);
    if (filterMatch) {
      const filterKey = filterMatch[1];
      const value = searchParams[key];
      filters[filterKey] = value ? String(value) : null;
    }
  });

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
  };
}

export function buildTableQueryString(params: Partial<TableParams>): string {
  const searchParams = new URLSearchParams();

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set('pageSize', String(params.pageSize));
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
    searchParams.set('sortOrder', params.sortOrder || 'asc');
  }
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value) {
        searchParams.set(`filter[${key}]`, value);
      }
    });
  }

  return searchParams.toString();
}
