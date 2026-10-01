import { describe, it, expect } from "vitest";
import { generateInvoiceNumber } from "../service";

describe("Invoice Number Generator", () => {
  it("generates invoice numbers in INV-YYYYMMDD-XXXX format", () => {
    const fixedDate = new Date("2026-10-15T00:00:00Z");
    const num = generateInvoiceNumber(fixedDate);
    expect(num).toMatch(/^INV-20261015-[A-Z0-9]{4}$/);
  });

  it("produces unique invoice numbers across calls", () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) {
      set.add(generateInvoiceNumber());
    }
    expect(set.size).toBe(50);
  });
});
