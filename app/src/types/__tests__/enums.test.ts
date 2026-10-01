/**
 * @file src/types/__tests__/enums.test.ts
 * Smoke test: all enum values exist and match the SRS §5 status definitions.
 */

import { describe, it, expect } from "vitest";
import {
  ReservationStatus,
  RoomStatus,
  PaymentStatus,
  RefundStatus,
  StayStatus,
} from "../enums";

describe("Reservation statuses (SRS §5)", () => {
  it("contains all required statuses", () => {
    const required = [
      "PENDING_PAYMENT",
      "CONFIRMED",
      "EXPIRED",
      "CANCELLED",
      "CHECKED_IN",
      "CHECKED_OUT",
      "NO_SHOW",
    ];
    for (const s of required) {
      expect(Object.values(ReservationStatus)).toContain(s);
    }
  });
});

describe("Room statuses (SRS §5)", () => {
  it("contains all required statuses", () => {
    const required = [
      "AVAILABLE",
      "RESERVED",
      "OCCUPIED",
      "DIRTY",
      "CLEANING",
      "INSPECTION",
      "MAINTENANCE",
      "OUT_OF_SERVICE",
    ];
    for (const s of required) {
      expect(Object.values(RoomStatus)).toContain(s);
    }
  });
});

describe("Payment statuses (SRS §5)", () => {
  it("contains all required statuses", () => {
    const required = [
      "PENDING",
      "PAID",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
    ];
    for (const s of required) {
      expect(Object.values(PaymentStatus)).toContain(s);
    }
  });
});

describe("Refund statuses (SRS §5)", () => {
  it("contains all required statuses", () => {
    const required = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"];
    for (const s of required) {
      expect(Object.values(RefundStatus)).toContain(s);
    }
  });
});

describe("Stay statuses (SRS §5)", () => {
  it("contains all required statuses", () => {
    const required = ["ACTIVE", "CHECKED_OUT"];
    for (const s of required) {
      expect(Object.values(StayStatus)).toContain(s);
    }
  });
});
