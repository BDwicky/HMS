import { describe, it, expect } from "vitest";
import { hotelSettingUpdateSchema } from "../service";

describe("Hotel Settings Validation", () => {
  it("validates valid hotel settings update", () => {
    const valid = {
      hotelName: "Grand Antigravity Hotel & Resort",
      phone: "+62 21 555 1234",
      email: "info@antigravityhotel.com",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      taxPercent: 10,
      serviceChargePercent: 5,
      allowOutstandingCheckout: false,
      generateInvoiceOnCheckout: true,
    };
    const parsed = hotelSettingUpdateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects tax or service charge over 100 or below 0", () => {
    expect(
      hotelSettingUpdateSchema.safeParse({
        taxPercent: 110,
      }).success,
    ).toBe(false);

    expect(
      hotelSettingUpdateSchema.safeParse({
        taxPercent: -5,
      }).success,
    ).toBe(false);
  });
});
