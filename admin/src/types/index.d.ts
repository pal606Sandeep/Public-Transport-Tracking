export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface AuthUser {
  id: string;
  _id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
}
