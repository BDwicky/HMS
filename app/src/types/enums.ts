/**
 * @file src/types/enums.ts
 * Domain enumerations that mirror the Prisma schema enums.
 * Keeping them here allows UI code to import them without pulling in Prisma.
 */

// ─── Reservation ────────────────────────────────────────────────────────────
export const ReservationStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  CHECKED_IN: "CHECKED_IN",
  CHECKED_OUT: "CHECKED_OUT",
  NO_SHOW: "NO_SHOW",
} as const;
export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

// ─── Reservation Source ─────────────────────────────────────────────────────
export const ReservationSource = {
  ONLINE: "ONLINE",
  WALK_IN: "WALK_IN",
  PHONE: "PHONE",
  STAFF: "STAFF",
} as const;
export type ReservationSource =
  (typeof ReservationSource)[keyof typeof ReservationSource];

// ─── Room ────────────────────────────────────────────────────────────────────
export const RoomStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  DIRTY: "DIRTY",
  CLEANING: "CLEANING",
  INSPECTION: "INSPECTION",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

// ─── Payment ─────────────────────────────────────────────────────────────────
export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ─── Refund ──────────────────────────────────────────────────────────────────
export const RefundStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

// ─── Stay ────────────────────────────────────────────────────────────────────
export const StayStatus = {
  ACTIVE: "ACTIVE",
  CHECKED_OUT: "CHECKED_OUT",
} as const;
export type StayStatus = (typeof StayStatus)[keyof typeof StayStatus];

// ─── Folio ───────────────────────────────────────────────────────────────────
export const FolioStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type FolioStatus = (typeof FolioStatus)[keyof typeof FolioStatus];

// ─── Folio Item Type ─────────────────────────────────────────────────────────
export const FolioItemType = {
  ROOM_CHARGE: "ROOM_CHARGE",
  ADDITIONAL_CHARGE: "ADDITIONAL_CHARGE",
  DISCOUNT: "DISCOUNT",
  TAX: "TAX",
  SERVICE_CHARGE: "SERVICE_CHARGE",
} as const;
export type FolioItemType = (typeof FolioItemType)[keyof typeof FolioItemType];

// ─── Additional Charge Category ──────────────────────────────────────────────
export const AdditionalChargeCategory = {
  BREAKFAST: "BREAKFAST",
  EXTRA_BED: "EXTRA_BED",
  LAUNDRY: "LAUNDRY",
  MINIBAR: "MINIBAR",
  RESTAURANT: "RESTAURANT",
  SERVICE: "SERVICE",
  LATE_CHECKOUT: "LATE_CHECKOUT",
  EARLY_CHECKIN: "EARLY_CHECKIN",
  OTHER: "OTHER",
} as const;
export type AdditionalChargeCategory =
  (typeof AdditionalChargeCategory)[keyof typeof AdditionalChargeCategory];

// ─── Housekeeping Task Status ─────────────────────────────────────────────────
export const HousekeepingTaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  FAILED_INSPECTION: "FAILED_INSPECTION",
} as const;
export type HousekeepingTaskStatus =
  (typeof HousekeepingTaskStatus)[keyof typeof HousekeepingTaskStatus];

// ─── Maintenance Request Status ───────────────────────────────────────────────
export const MaintenanceStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type MaintenanceStatus =
  (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

// ─── Invoice Status ──────────────────────────────────────────────────────────
export const InvoiceStatus = {
  ISSUED: "ISSUED",
  VOID: "VOID",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

// ─── Document Type ───────────────────────────────────────────────────────────
export const DocumentType = {
  KTP: "KTP",
  SIM: "SIM",
  PASSPORT: "PASSPORT",
  OTHER: "OTHER",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
