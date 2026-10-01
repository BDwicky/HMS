/**
 * @file src/lib/errors/index.ts
 * Centralised application error classes.
 * All thrown errors should extend AppError so API handlers can produce
 * consistent JSON error responses.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "PAYMENT_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super("VALIDATION_ERROR", message, 422, fields);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super("BUSINESS_RULE_VIOLATION", message, 422);
    this.name = "BusinessRuleError";
  }
}

/**
 * Format an AppError (or unknown error) into the standard JSON response body.
 */
export function toErrorResponse(error: unknown): {
  error: { code: string; message: string; fields?: Record<string, string> };
} {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    };
  }
  // Unknown errors — do not leak details to the client.
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  };
}
