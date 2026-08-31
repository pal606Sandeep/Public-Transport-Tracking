/**
 * Backend response envelope (as-built).
 * Success: { success, message, data? }
 * Error:   { error: { code, message, details?, traceId } }  -> thrown as ApiError
 */
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
  total: number;
  page: number;
  limit: number;
  pages?: number;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  language?: string;
  avatarKey?: string | null;
  isActive?: boolean;
}
