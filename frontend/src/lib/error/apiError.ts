import type { ApiErrorShape } from "@/types";

/** Thrown by apiClient for any non-2xx response or `{ success: false }` body. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly traceId?: string;

  constructor(
    status: number,
    shape: Partial<ApiErrorShape> & { message: string }
  ) {
    super(shape.message);
    this.name = "ApiError";
    this.status = status;
    this.code = shape.code ?? "UNKNOWN";
    this.details = shape.details;
    this.traceId = shape.traceId;
  }

  get isAuth(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** zod / mongoose field errors, normalised to { field: string[] }. */
  fieldErrors(): Record<string, string[]> {
    const d = this.details;
    if (d && typeof d === "object") {
      return Object.fromEntries(
        Object.entries(d).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.map(String) : [String(v)],
        ])
      );
    }
    return {};
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Something went wrong";
