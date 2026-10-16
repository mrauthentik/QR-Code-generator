/**
 * Domain and Infrastructure Errors with HTTP status mappings
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details ?? null,
      },
    };
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
}

export class UnsafeUrlError extends AppError {
  readonly statusCode = 422;
  readonly code = "UNSAFE_URL";
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code = "RATE_LIMIT_EXCEEDED";
}

export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly code = "DATABASE_ERROR";
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = "SERVICE_UNAVAILABLE";
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    return new DatabaseError(err.message, { stack: err.stack });
  }
  return new DatabaseError(String(err));
}
