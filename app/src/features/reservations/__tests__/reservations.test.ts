import { describe, it, expect } from "vitest";
import {
  generateBookingReference,
  reservationCreateSchema,
  reservationCancelSchema,
} from "../service";
import { ReservationSource } from "@prisma/client";

describe("Booking Reference Generator", () => {
  it("generates booking references in BK-YYYYMMDD-XXXX format", () => {
    const fixedDate = new Date("2026-10-15T00:00:00Z");
    const ref = generateBookingReference(fixedDate);
    expect(ref).toMatch(/^BK-20261015-[A-Z0-9]{4}$/);
  });

  it("generates unique references across invocations", () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) {
      set.add(generateBookingReference());
    }
    expect(set.size).toBe(50);
  });
});

describe("Reservation Creation Validation", () => {
  it("validates valid reservation input with guest details", () => {
    const valid = {
      checkIn: "2026-10-20",
      checkOut: "2026-10-23",
      adults: 2,
      children: 0,
      source: ReservationSource.ONLINE,
      items: [
        {
          roomTypeId: "rt-deluxe",
          ratePlanId: "rp-bar",
          quantity: 1,
        },
      ],
      guest: {
        firstName: "Ahmad",
        lastName: "Dahlan",
        email: "ahmad@example.com",
        phone: "+62812345678",
      },
    };
    const parsed = reservationCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects reservation without guest profile and without guestId", () => {
    const invalid = {
      checkIn: "2026-10-20",
      checkOut: "2026-10-23",
      adults: 2,
      items: [
        {
          roomTypeId: "rt-deluxe",
          ratePlanId: "rp-bar",
          quantity: 1,
        },
      ],
    };
    expect(reservationCreateSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects checkOut that is equal to or before checkIn", () => {
    const invalid = {
      checkIn: "2026-10-20",
      checkOut: "2026-10-20",
      guestId: "g-123",
      items: [{ roomTypeId: "rt-deluxe", ratePlanId: "rp-bar", quantity: 1 }],
    };
    expect(reservationCreateSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects empty items array", () => {
    const invalid = {
      checkIn: "2026-10-20",
      checkOut: "2026-10-23",
      guestId: "g-123",
      items: [],
    };
    expect(reservationCreateSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("Cancellation Reason Validation", () => {
  it("accepts valid cancellation reason", () => {
    expect(
      reservationCancelSchema.safeParse({ reason: "Perubahan jadwal penerbangan" }).success,
    ).toBe(true);
  });

  it("accepts empty cancellation payload", () => {
    expect(reservationCancelSchema.safeParse({}).success).toBe(true);
  });
});
