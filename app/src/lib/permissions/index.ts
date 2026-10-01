/**
 * @file src/lib/permissions/index.ts
 * Permission constants and a placeholder check helper.
 * Real enforcement is implemented in Phase 1 (auth module).
 *
 * Each permission string follows the pattern: resource:action
 */

// ─── Resource: Auth ────────────────────────────────────────────────────────
export const PERM_AUTH_LOGIN = "auth:login";

// ─── Resource: Users ───────────────────────────────────────────────────────
export const PERM_USERS_VIEW = "users:view";
export const PERM_USERS_CREATE = "users:create";
export const PERM_USERS_UPDATE = "users:update";
export const PERM_USERS_DELETE = "users:delete";

// ─── Resource: Roles ───────────────────────────────────────────────────────
export const PERM_ROLES_VIEW = "roles:view";
export const PERM_ROLES_MANAGE = "roles:manage";

// ─── Resource: Guests ──────────────────────────────────────────────────────
export const PERM_GUESTS_VIEW = "guests:view";
export const PERM_GUESTS_CREATE = "guests:create";
export const PERM_GUESTS_UPDATE = "guests:update";
export const PERM_GUESTS_VIEW_DOCUMENTS = "guests:view_documents";

// ─── Resource: Rooms ───────────────────────────────────────────────────────
export const PERM_ROOMS_VIEW = "rooms:view";
export const PERM_ROOMS_MANAGE = "rooms:manage";
export const PERM_ROOM_TYPES_MANAGE = "room_types:manage";

// ─── Resource: Reservations ────────────────────────────────────────────────
export const PERM_RESERVATIONS_VIEW = "reservations:view";
export const PERM_RESERVATIONS_CREATE = "reservations:create";
export const PERM_RESERVATIONS_MODIFY = "reservations:modify";
export const PERM_RESERVATIONS_CANCEL = "reservations:cancel";
export const PERM_RESERVATIONS_NO_SHOW = "reservations:no_show";
export const PERM_RESERVATIONS_VIEW_INTERNAL = "reservations:view_internal";

// ─── Resource: Check-in / Stay ─────────────────────────────────────────────
export const PERM_CHECKIN_PROCESS = "checkin:process";
export const PERM_STAYS_MANAGE = "stays:manage";

// ─── Resource: Folios / Billing ────────────────────────────────────────────
export const PERM_FOLIOS_VIEW = "folios:view";
export const PERM_FOLIOS_ADD_CHARGE = "folios:add_charge";
export const PERM_FOLIOS_APPLY_DISCOUNT = "folios:apply_discount";

// ─── Resource: Payments ────────────────────────────────────────────────────
export const PERM_PAYMENTS_VIEW = "payments:view";
export const PERM_PAYMENTS_PROCESS = "payments:process";
export const PERM_REFUNDS_PROCESS = "refunds:process";

// ─── Resource: Checkout ────────────────────────────────────────────────────
export const PERM_CHECKOUT_PROCESS = "checkout:process";

// ─── Resource: Invoices ────────────────────────────────────────────────────
export const PERM_INVOICES_VIEW = "invoices:view";
export const PERM_INVOICES_GENERATE = "invoices:generate";

// ─── Resource: Housekeeping ────────────────────────────────────────────────
export const PERM_HOUSEKEEPING_VIEW = "housekeeping:view";
export const PERM_HOUSEKEEPING_MANAGE = "housekeeping:manage";
export const PERM_HOUSEKEEPING_UPDATE_STATUS = "housekeeping:update_status";

// ─── Resource: Maintenance ─────────────────────────────────────────────────
export const PERM_MAINTENANCE_VIEW = "maintenance:view";
export const PERM_MAINTENANCE_MANAGE = "maintenance:manage";

// ─── Resource: Reports ─────────────────────────────────────────────────────
export const PERM_REPORTS_VIEW = "reports:view";

// ─── Resource: Settings ────────────────────────────────────────────────────
export const PERM_SETTINGS_VIEW = "settings:view";
export const PERM_SETTINGS_MANAGE = "settings:manage";

// ─── Resource: Pricing ─────────────────────────────────────────────────────
export const PERM_RATE_PLANS_MANAGE = "rate_plans:manage";
export const PERM_POLICIES_MANAGE = "policies:manage";

// ─── Resource: Audit ───────────────────────────────────────────────────────
export const PERM_AUDIT_LOGS_VIEW = "audit_logs:view";

// ─── All permissions list (useful for seeding) ────────────────────────────
export const ALL_PERMISSIONS = [
  PERM_AUTH_LOGIN,
  PERM_USERS_VIEW,
  PERM_USERS_CREATE,
  PERM_USERS_UPDATE,
  PERM_USERS_DELETE,
  PERM_ROLES_VIEW,
  PERM_ROLES_MANAGE,
  PERM_GUESTS_VIEW,
  PERM_GUESTS_CREATE,
  PERM_GUESTS_UPDATE,
  PERM_GUESTS_VIEW_DOCUMENTS,
  PERM_ROOMS_VIEW,
  PERM_ROOMS_MANAGE,
  PERM_ROOM_TYPES_MANAGE,
  PERM_RESERVATIONS_VIEW,
  PERM_RESERVATIONS_CREATE,
  PERM_RESERVATIONS_MODIFY,
  PERM_RESERVATIONS_CANCEL,
  PERM_RESERVATIONS_NO_SHOW,
  PERM_RESERVATIONS_VIEW_INTERNAL,
  PERM_CHECKIN_PROCESS,
  PERM_STAYS_MANAGE,
  PERM_FOLIOS_VIEW,
  PERM_FOLIOS_ADD_CHARGE,
  PERM_FOLIOS_APPLY_DISCOUNT,
  PERM_PAYMENTS_VIEW,
  PERM_PAYMENTS_PROCESS,
  PERM_REFUNDS_PROCESS,
  PERM_CHECKOUT_PROCESS,
  PERM_INVOICES_VIEW,
  PERM_INVOICES_GENERATE,
  PERM_HOUSEKEEPING_VIEW,
  PERM_HOUSEKEEPING_MANAGE,
  PERM_HOUSEKEEPING_UPDATE_STATUS,
  PERM_MAINTENANCE_VIEW,
  PERM_MAINTENANCE_MANAGE,
  PERM_REPORTS_VIEW,
  PERM_SETTINGS_VIEW,
  PERM_SETTINGS_MANAGE,
  PERM_RATE_PLANS_MANAGE,
  PERM_POLICIES_MANAGE,
  PERM_AUDIT_LOGS_VIEW,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
