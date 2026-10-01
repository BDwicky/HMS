import { describe, it, expect } from "vitest";
import { addChargeSchema, addDiscountSchema } from "../service";

describe("Folio Additional Charges Validation", () => {
  it("validates valid additional charge payload", () => {
    const valid = {
      category: "MINIBAR",
      description: "2x Soft Drinks & 1x Chocolate",
      quantity: 1,
      unitPrice: 75000,
    };
    expect(addChargeSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects negative unit price", () => {
    const invalid = {
      category: "LAUNDRY",
      description: "Cuci jas",
      quantity: 1,
      unitPrice: -50000,
    };
    expect(addChargeSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("Folio Discount Validation", () => {
  it("validates positive discount amount", () => {
    const valid = {
      description: "Diskon voucher promosi",
      amount: 100000,
    };
    expect(addDiscountSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects 0 or negative discount amount", () => {
    expect(
      addDiscountSchema.safeParse({
        description: "Diskon",
        amount: 0,
      }).success,
    ).toBe(false);
  });
});
