import { describe, it, expect } from "vitest";
import { checkInSchema, changeRoomSchema, extendStaySchema } from "../service";

describe("Front Desk Check-In Validation", () => {
  it("validates valid check-in payload", () => {
    const valid = {
      reservationId: "res-123",
      reservationItemId: "item-123",
      roomId: "room-101",
    };
    expect(checkInSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects check-in without room ID", () => {
    const invalid = {
      reservationId: "res-123",
      reservationItemId: "item-123",
      roomId: "",
    };
    expect(checkInSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("Room Change Validation", () => {
  it("validates room change payload with optional reason", () => {
    const valid = {
      newRoomId: "room-202",
      reason: "AC tidak dingin",
    };
    expect(changeRoomSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty new room ID", () => {
    expect(changeRoomSchema.safeParse({ newRoomId: "" }).success).toBe(false);
  });
});

describe("Stay Extension Validation", () => {
  it("validates stay extension date format", () => {
    expect(extendStaySchema.safeParse({ newCheckOut: "2026-10-25" }).success).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(extendStaySchema.safeParse({ newCheckOut: "25-10-2026" }).success).toBe(false);
  });
});
