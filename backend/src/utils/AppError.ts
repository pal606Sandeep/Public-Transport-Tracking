/**
 * Domain error with an HTTP status code, a stable error `code`, and optional
 * structured `details` (e.g. zod field errors). Centralized error handler maps
 * this into the standard `{ error: { code, message, details?, traceId } }`
 * envelope.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: unknown;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad Request", code = "BAD_REQUEST", details?: unknown): AppError {
    return new AppError(message, { statusCode: 400, code, details });
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED", details?: unknown): AppError {
    return new AppError(message, { statusCode: 401, code, details });
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN", details?: unknown): AppError {
    return new AppError(message, { statusCode: 403, code, details });
  }

  static notFound(message = "Not Found", code = "NOT_FOUND", details?: unknown): AppError {
    return new AppError(message, { statusCode: 404, code, details });
  }

  static conflict(message = "Conflict", code = "CONFLICT", details?: unknown): AppError {
    return new AppError(message, { statusCode: 409, code, details });
  }

  static tooManyRequests(message = "Too Many Requests", code = "RATE_LIMITED", details?: unknown): AppError {
    return new AppError(message, { statusCode: 429, code, details });
  }
}
