export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface JwtPayload {
  id: string;
  role: string;
}

export interface AuthUser {
  id: string;
  role: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
