/**
 * @file src/lib/permissions/__tests__/guard.test.ts
 * Tests for permission guard utilities.
 * Traceability: UC-01 (Login), BR-SEC-001 (backend authorization)
 */

import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  requireAuth,
  requirePermission,
} from "../guard";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { Permission } from "../index";

// ─── Test helpers ───────────────────────────────────────────

function makeSession(permissions: string[]): Session {
  return {
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@hotel.dev",
      roleId: "role-1",
      roleName: "Admin",
      permissions,
    },
  };
}

// ─── hasPermission ──────────────────────────────────────────

describe("hasPermission()", () => {
  it("returns true when permission is in session", () => {
    const session = makeSession(["reservations:create", "guests:view"]);
    expect(hasPermission(session, "reservations:create" as Permission)).toBe(true);
  });

  it("returns false when permission is missing", () => {
    const session = makeSession(["guests:view"]);
    expect(hasPermission(session, "reservations:create" as Permission)).toBe(false);
  });

  it("returns false for null session", () => {
    expect(hasPermission(null, "reservations:create" as Permission)).toBe(false);
  });

  it("returns false for session with empty permissions", () => {
    const session = makeSession([]);
    expect(hasPermission(session, "reservations:view" as Permission)).toBe(false);
  });
});

// ─── hasAllPermissions ──────────────────────────────────────

describe("hasAllPermissions()", () => {
  it("returns true when user has all permissions", () => {
    const session = makeSession(["reservations:create", "reservations:view"]);
    expect(
      hasAllPermissions(session, [
        "reservations:create" as Permission,
        "reservations:view" as Permission,
      ]),
    ).toBe(true);
  });

  it("returns false when user is missing one permission", () => {
    const session = makeSession(["reservations:view"]);
    expect(
      hasAllPermissions(session, [
        "reservations:create" as Permission,
        "reservations:view" as Permission,
      ]),
    ).toBe(false);
  });
});

// ─── hasAnyPermission ───────────────────────────────────────

describe("hasAnyPermission()", () => {
  it("returns true when user has at least one permission", () => {
    const session = makeSession(["guests:view"]);
    expect(
      hasAnyPermission(session, [
        "reservations:create" as Permission,
        "guests:view" as Permission,
      ]),
    ).toBe(true);
  });

  it("returns false when user has none", () => {
    const session = makeSession(["rooms:view"]);
    expect(
      hasAnyPermission(session, [
        "reservations:create" as Permission,
        "guests:view" as Permission,
      ]),
    ).toBe(false);
  });
});

// ─── requireAuth ────────────────────────────────────────────

describe("requireAuth()", () => {
  it("does not throw when session is valid", () => {
    const session = makeSession(["reservations:view"]);
    expect(() => requireAuth(session)).not.toThrow();
  });

  it("throws UnauthorizedError for null session", () => {
    expect(() => requireAuth(null)).toThrow(UnauthorizedError);
  });
});

// ─── requirePermission ──────────────────────────────────────

describe("requirePermission()", () => {
  it("does not throw when permission is present", () => {
    const session = makeSession(["reservations:create"]);
    expect(() =>
      requirePermission(session, "reservations:create" as Permission),
    ).not.toThrow();
  });

  it("throws ForbiddenError when permission is missing", () => {
    const session = makeSession(["guests:view"]);
    expect(() =>
      requirePermission(session, "reservations:create" as Permission),
    ).toThrow(ForbiddenError);
  });

  it("throws UnauthorizedError when not authenticated", () => {
    expect(() =>
      requirePermission(null, "reservations:create" as Permission),
    ).toThrow(UnauthorizedError);
  });
});
