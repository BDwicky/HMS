import { describe, it, expect } from "vitest";
import { recordPaymentSchema, refundSchema } from "../service";
import { PaymentMethod } from "@prisma/client";

describe("Payment Recording Validation", () => {
  it("validates valid payment input", () => {
    const valid = {
      reservationId: "res-123",
      amount: 1500000,
      method: PaymentMethod.QRIS,
      provider: "XENDIT",
      providerTransactionId: "trx_qris_999",
      idempotencyKey: "idemp_123",
    };
    expect(recordPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-positive payment amount", () => {
    const invalid = {
      reservationId: "res-123",
      amount: 0,
      method: PaymentMethod.CASH,
    };
    expect(recordPaymentSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("Refund Processing Validation", () => {
  it("validates valid refund input", () => {
    const valid = {
      paymentId: "pay-123",
      amount: 500000,
      reason: "Pembatalan reservasi sesuai kebijakan fleksibel",
    };
    expect(refundSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects refund without reason", () => {
    const invalid = {
      paymentId: "pay-123",
      amount: 500000,
      reason: "",
    };
    expect(refundSchema.safeParse(invalid).success).toBe(false);
  });
});
