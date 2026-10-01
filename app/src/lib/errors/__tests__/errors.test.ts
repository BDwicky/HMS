/**
 * @file src/lib/errors/__tests__/errors.test.ts
 * TC-SEC-001: Verify error classes and API response format.
 * Phase 0 – infrastructure validation tests.
 */

import { describe, it, expect } from "vitest";
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
  toErrorResponse,
} from "../index";

describe("AppError subclasses", () => {
  it("ValidationError has correct code and statusCode", () => {
    const err = new ValidationError("Invalid input", { field: "message" });
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(422);
    expect(err.fields).toEqual({ field: "message" });
  });

  it("NotFoundError has correct code and statusCode", () => {
    const err = new NotFoundError();
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
  });

  it("UnauthorizedError has correct code and statusCode", () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.statusCode).toBe(401);
  });

  it("ForbiddenError has correct code and statusCode", () => {
    const err = new ForbiddenError();
    expect(err.code).toBe("FORBIDDEN");
    expect(err.statusCode).toBe(403);
  });

  it("ConflictError has correct code and statusCode", () => {
    const err = new ConflictError("Duplicate entry");
    expect(err.code).toBe("CONFLICT");
    expect(err.statusCode).toBe(409);
  });

  it("BusinessRuleError has correct code and statusCode", () => {
    const err = new BusinessRuleError("BR-RES-003 violated");
    expect(err.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(err.statusCode).toBe(422);
  });
});

describe("toErrorResponse", () => {
  it("returns structured error for AppError", () => {
    const err = new ValidationError("Bad request", { name: "Required" });
    const response = toErrorResponse(err);
    expect(response).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Bad request",
        fields: { name: "Required" },
      },
    });
  });

  it("returns INTERNAL_ERROR for unknown error", () => {
    const response = toErrorResponse(new Error("Something exploded"));
    expect(response.error.code).toBe("INTERNAL_ERROR");
    // Must NOT leak internal message
    expect(response.error.message).not.toContain("Something exploded");
  });

  it("returns INTERNAL_ERROR for non-Error thrown value", () => {
    const response = toErrorResponse("just a string");
    expect(response.error.code).toBe("INTERNAL_ERROR");
  });
});
