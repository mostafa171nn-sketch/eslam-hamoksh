import type { Response } from 'express';

/** Consistent API response shape used across the entire backend. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
  error?: { code: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, message = 'Success', meta?: PaginationMeta) {
  const body: ApiResponse<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created successfully') {
  return res.status(201).json({ success: true, message, data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
