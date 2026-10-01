import { describe, it, expect } from "vitest";
import {
  ratePlanCreateSchema,
  roomRateUpsertSchema,
  roomRateBulkSchema,
  cancellationPolicySchema,
  modificationPolicySchema,
  noShowPolicySchema,
} from "../service";

describe("Rate Plans Validation", () => {
  it("accepts valid rate plan data", () => {
    const valid = {
      code: "BAR",
      name: "Best Available Rate",
      description: "Standard flexible rate with breakfast",
      isRefundable: true,
      includesBreakfast: true,
    };
    const parsed = ratePlanCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid rate plan code format", () => {
    const invalid = {
      code: "bar rate",
      name: "Standard Rate",
    };
    const parsed = ratePlanCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("Room Rates Validation", () => {
  it("validates single-date room rate upsert", () => {
    const valid = {
      roomTypeId: "rt-1",
      ratePlanId: "rp-1",
      stayDate: "2026-10-15",
      price: 850000,
    };
    const parsed = roomRateUpsertSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid stayDate format or negative price", () => {
    expect(
      roomRateUpsertSchema.safeParse({
        roomTypeId: "rt-1",
        ratePlanId: "rp-1",
        stayDate: "15-10-2026",
        price: 850000,
      }).success,
    ).toBe(false);

    expect(
      roomRateUpsertSchema.safeParse({
        roomTypeId: "rt-1",
        ratePlanId: "rp-1",
        stayDate: "2026-10-15",
        price: -50000,
      }).success,
    ).toBe(false);
  });

  it("validates bulk room rate date range", () => {
    const valid = {
      roomTypeId: "rt-1",
      ratePlanId: "rp-1",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      price: 900000,
    };
    const parsed = roomRateBulkSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});

describe("Policy Validation", () => {
  it("validates cancellation policy with reasonable parameters", () => {
    const valid = {
      name: "Flexible 24h",
      freeDeadlineHours: 24,
      penaltyPercent: 50,
      penaltyNights: 1,
    };
    expect(cancellationPolicySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects penalty percent over 100", () => {
    expect(
      cancellationPolicySchema.safeParse({
        name: "Invalid Policy",
        penaltyPercent: 150,
      }).success,
    ).toBe(false);

    expect(
      noShowPolicySchema.safeParse({
        name: "Invalid NoShow",
        penaltyPercent: 120,
      }).success,
    ).toBe(false);
  });

  it("validates modification policy", () => {
    const valid = {
      name: "Modifiable up to 48h",
      allowModification: true,
      freeDeadlineHours: 48,
      penaltyPercent: 0,
    };
    expect(modificationPolicySchema.safeParse(valid).success).toBe(true);
  });
});
