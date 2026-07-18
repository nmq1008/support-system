import { Request } from 'express';

export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function parsePagination(req: Request, defaultSize = 20, maxSize = 100): PageParams {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginated<T>(items: T[], total: number, params: PageParams) {
  return {
    items,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize) || 1,
    },
  };
}
