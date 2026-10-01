import { describe, it, expect } from "vitest";
import {
  roomTypeCreateSchema,
  roomCreateSchema,
  roomUpdateSchema,
  VALID_ROOM_TRANSITIONS,
} from "../service";
import { RoomStatus } from "@prisma/client";

describe("Room Types Validation & Business Rules", () => {
  it("validates valid room type input", () => {
    const valid = {
      code: "DELUXE-KING",
      name: "Deluxe King Room",
      description: "Spacious room with king-size bed",
      maxOccupancy: 2,
      basePrice: 750000,
      amenities: ["WiFi", "AC", "TV", "Breakfast"],
      imageUrls: ["https://example.com/deluxe.jpg"],
    };
    const parsed = roomTypeCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid code format (lowercase or spaces)", () => {
    const invalid = {
      code: "deluxe king",
      name: "Deluxe King",
      maxOccupancy: 2,
      basePrice: 500000,
    };
    const parsed = roomTypeCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects negative base price or 0 max occupancy", () => {
    expect(
      roomTypeCreateSchema.safeParse({
        code: "STD",
        name: "Standard",
        maxOccupancy: 0,
        basePrice: 500000,
      }).success,
    ).toBe(false);

    expect(
      roomTypeCreateSchema.safeParse({
        code: "STD",
        name: "Standard",
        maxOccupancy: 2,
        basePrice: -100,
      }).success,
    ).toBe(false);
  });
});

describe("Rooms & Status Transitions", () => {
  it("validates room creation schema", () => {
    const valid = {
      roomTypeId: "rt-123",
      roomNumber: "101",
      floor: 1,
      description: "Garden view",
    };
    const parsed = roomCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects room creation with empty room number or empty roomTypeId", () => {
    expect(
      roomCreateSchema.safeParse({
        roomTypeId: "",
        roomNumber: "101",
      }).success,
    ).toBe(false);

    expect(
      roomCreateSchema.safeParse({
        roomTypeId: "rt-123",
        roomNumber: "",
      }).success,
    ).toBe(false);
  });

  it("validates room update with valid status", () => {
    const update = {
      status: RoomStatus.MAINTENANCE,
      description: "AC repair needed",
    };
    const parsed = roomUpdateSchema.safeParse(update);
    expect(parsed.success).toBe(true);
  });

  it("enforces valid status transition rules", () => {
    // AVAILABLE can transition to MAINTENANCE or RESERVED or OCCUPIED
    expect(VALID_ROOM_TRANSITIONS.AVAILABLE).toContain(RoomStatus.MAINTENANCE);
    expect(VALID_ROOM_TRANSITIONS.AVAILABLE).toContain(RoomStatus.RESERVED);

    // OCCUPIED can only transition to DIRTY (upon checkout)
    expect(VALID_ROOM_TRANSITIONS.OCCUPIED).toEqual([RoomStatus.DIRTY]);
    expect(VALID_ROOM_TRANSITIONS.OCCUPIED).not.toContain(RoomStatus.AVAILABLE);

    // DIRTY transitions to CLEANING or MAINTENANCE
    expect(VALID_ROOM_TRANSITIONS.DIRTY).toContain(RoomStatus.CLEANING);
    expect(VALID_ROOM_TRANSITIONS.DIRTY).not.toContain(RoomStatus.AVAILABLE);

    // INSPECTION transitions to AVAILABLE
    expect(VALID_ROOM_TRANSITIONS.INSPECTION).toContain(RoomStatus.AVAILABLE);
  });
});
