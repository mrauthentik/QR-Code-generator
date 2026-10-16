import { describe, it, expect } from "vitest";
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnsafeUrlError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError,
  toAppError,
} from "@/lib/errors";

describe("Domain Error Classes", () => {
  it("should have correct HTTP status codes and codes", () => {
    const notFound = new NotFoundError("Resource not found");
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe("NOT_FOUND");
    expect(notFound.toJSON()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        details: null,
      },
    });

    const validation = new ValidationError("Invalid payload", { field: "slug" });
    expect(validation.statusCode).toBe(400);
    expect(validation.code).toBe("VALIDATION_ERROR");
    expect(validation.details).toEqual({ field: "slug" });

    expect(new UnauthorizedError("No session").statusCode).toBe(401);
    expect(new ForbiddenError("Access denied").statusCode).toBe(403);
    expect(new ConflictError("Slug exists").statusCode).toBe(409);
    expect(new UnsafeUrlError("Private IP").statusCode).toBe(422);
    expect(new RateLimitError("Too many scans").statusCode).toBe(429);
    expect(new DatabaseError("Query timeout").statusCode).toBe(500);
    expect(new ServiceUnavailableError("DB down").statusCode).toBe(503);
  });

  it("should convert unknown errors via toAppError", () => {
    const nativeErr = new Error("Generic crash");
    const appErr = toAppError(nativeErr);
    expect(appErr).toBeInstanceOf(DatabaseError);
    expect(appErr.message).toBe("Generic crash");

    const existingErr = new NotFoundError("Not here");
    expect(toAppError(existingErr)).toBe(existingErr);
  });
});
