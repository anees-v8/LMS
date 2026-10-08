/**
 * Standard application error carrying an HTTP status + machine-readable code.
 * Thrown anywhere; caught by each route handler's try/catch (Next.js has no
 * central Express-style error-handler middleware, so route handlers call
 * `handleApiError` from lib/utils/apiResponse.ts in their catch block).
 * Ported verbatim from the Express backend's src/utils/ApiError.ts.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly isApiError = true as const;

  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code = 'BAD_REQUEST', message?: string, details?: unknown): ApiError {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(code = 'UNAUTHORIZED', message?: string): ApiError {
    return new ApiError(401, code, message);
  }
  static forbidden(code = 'FORBIDDEN', message?: string): ApiError {
    return new ApiError(403, code, message);
  }
  static notFound(code = 'NOT_FOUND', message?: string): ApiError {
    return new ApiError(404, code, message);
  }
  static conflict(code = 'CONFLICT', message?: string): ApiError {
    return new ApiError(409, code, message);
  }
  static tooManyRequests(code = 'TOO_MANY_REQUESTS', message?: string): ApiError {
    return new ApiError(429, code, message);
  }
  static internal(code = 'INTERNAL_ERROR', message?: string): ApiError {
    return new ApiError(500, code, message);
  }
}

export default ApiError;
