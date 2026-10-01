import { describe, it, expect } from "vitest";
import {
  availabilityQuerySchema,
  isDateRangeOverlapping,
  getStayDates,
} from "../service";

describe("Availability Query Validation", () => {
  it("accepts valid availability query parameters", () => {
    const valid = {
      checkIn: "2026-10-10",
      checkOut: "2026-10-14",
      adults: 2,
      children: 1,
    };
    const parsed = availabilityQuerySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects checkOut date that is on or before checkIn date", () => {
    // Same day
    expect(
      availabilityQuerySchema.safeParse({
        checkIn: "2026-10-10",
        checkOut: "2026-10-10",
        adults: 1,
      }).success,
    ).toBe(false);

    // checkOut earlier than checkIn
    expect(
      availabilityQuerySchema.safeParse({
        checkIn: "2026-10-15",
        checkOut: "2026-10-10",
        adults: 1,
      }).success,
    ).toBe(false);
  });
});

describe("Interval Overlap Rules [check_in, check_out)", () => {
  it("correctly identifies overlapping intervals", () => {
    const rStart = new Date("2026-10-10");
    const rEnd = new Date("2026-10-15");

    // Overlaps in middle
    expect(
      isDateRangeOverlapping(rStart, rEnd, new Date("2026-10-12"), new Date("2026-10-14")),
    ).toBe(true);

    // Starts earlier, overlaps start
    expect(
      isDateRangeOverlapping(rStart, rEnd, new Date("2026-10-08"), new Date("2026-10-12")),
    ).toBe(true);

    // Overlaps end
    expect(
      isDateRangeOverlapping(rStart, rEnd, new Date("2026-10-13"), new Date("2026-10-18")),
    ).toBe(true);
  });

  it("does NOT overlap when checkout date equals next checkin date (exclusive checkout)", () => {
    const rStart = new Date("2026-10-10");
    const rEnd = new Date("2026-10-15");

    // Guest A checks out Oct 15, Guest B checks in Oct 15 -> NO OVERLAP
    expect(
      isDateRangeOverlapping(rStart, rEnd, new Date("2026-10-15"), new Date("2026-10-20")),
    ).toBe(false);

    // Guest A checks in Oct 10, Guest B checks out Oct 10 -> NO OVERLAP
    expect(
      isDateRangeOverlapping(rStart, rEnd, new Date("2026-10-05"), new Date("2026-10-10")),
    ).toBe(false);
  });

  it("correctly generates individual stay dates for nights [checkIn, checkOut)", () => {
    const dates = getStayDates("2026-10-10", "2026-10-13");
    expect(dates).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(dates.length).toBe(3); // 3 nights
  });
});
