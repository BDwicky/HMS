/**
 * @file src/lib/permissions/guard.ts
 * Server-side permission guard utilities.
 *
 * Usage in Server Components / Route Handlers:
 *   const session = await auth();
 *   requirePermission(session, PERM_RESERVATIONS_CREATE);
 *
 * BR-SEC-001: backend authorization mandatory.
 * Permissions are strings from session.user.permissions[]
 * (loaded once at sign-in, stored in JWT).
 */

import type { Session } from "next-auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { Permission } from "./index";

/** Returns true if the session has the given permission. */
export function hasPermission(
  session: Session | null,
  permission: Permission,
): boolean {
  if (!session?.user?.permissions) return false;
  return session.user.permissions.includes(permission);
}

/** Returns true if the session has ALL of the given permissions. */
export function hasAllPermissions(
  session: Session | null,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(session, p));
}

/** Returns true if the session has ANY of the given permissions. */
export function hasAnyPermission(
  session: Session | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(session, p));
}

/**
 * Asserts the user is authenticated.
 * Throws UnauthorizedError if not (HTTP 401).
 */
export function requireAuth(session: Session | null): asserts session is Session {
  if (!session?.user) {
    throw new UnauthorizedError("Sesi tidak ditemukan. Silakan login kembali.");
  }
}

/**
 * Asserts the user has a specific permission.
 * Throws UnauthorizedError (401) if not authenticated.
 * Throws ForbiddenError (403) if authenticated but lacks permission.
 */
export function requirePermission(
  session: Session | null,
  permission: Permission,
): void {
  requireAuth(session);
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(
      `Akses ditolak. Diperlukan izin: ${permission}`,
    );
  }
}
