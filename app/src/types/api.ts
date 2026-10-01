/**
 * @file src/types/api.ts
 * Shared TypeScript types for API request/response shapes.
 * Follows the contract defined in docs/API.md.
 */

/** Standard success response envelope */
export interface ApiSuccess<T = unknown, M = unknown> {
  data: T;
  meta?: M;
}

/** Standard error response envelope */
export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/** Paginated meta block */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Generic paginated API response */
export type PaginatedResponse<T> = ApiSuccess<T[], PaginationMeta>;
