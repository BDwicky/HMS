/**
 * @file src/features/payments/service.ts
 * Payment & Refund Processing with Idempotency — Phase 6.
 * Rules:
 * 1. Payment webhook handling must be idempotent. Duplicate callbacks do not duplicate effects.
 * 2. Never trust client payment amounts.
 * 3. Refunds are separate immutable records; finalized payments are not directly mutated.
 * 4. Folio balance is automatically updated on payments and refunds.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  ReservationStatus,
} from "@prisma/client";

export const recordPaymentSchema = z.object({
  reservationId: z.string().min(1, "ID reservasi wajib diisi"),
  folioId: z.string().optional(),
  amount: z.coerce.number().min(1, "Jumlah pembayaran minimal Rp 1"),
  method: z.nativeEnum(PaymentMethod),
  provider: z.string().optional(),
  providerTransactionId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().min(1, "ID pembayaran wajib diisi"),
  amount: z.coerce.number().min(1, "Jumlah pengembalian dana minimal Rp 1"),
  reason: z.string().min(1, "Alasan refund wajib dicantumkan").max(300),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;

export async function recordPayment(input: RecordPaymentInput, staffUserId?: string) {
  // Idempotency check 1: Idempotency Key
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { folio: true },
    });
    if (existing) {
      return existing; // Idempotent return without duplicate action
    }
  }

  // Idempotency check 2: Provider Transaction ID
  if (input.providerTransactionId) {
    const existing = await prisma.payment.findUnique({
      where: { providerTransactionId: input.providerTransactionId },
      include: { folio: true },
    });
    if (existing) {
      return existing;
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Resolve Folio
    let folioId = input.folioId;
    if (!folioId) {
      const f = await tx.folio.findUnique({ where: { reservationId: input.reservationId } });
      if (f) folioId = f.id;
    }

    const payAmount = Math.round(Number(input.amount));

    // 2. Create Payment Record (PAID)
    const payment = await tx.payment.create({
      data: {
        reservationId: input.reservationId,
        folioId: folioId || null,
        amount: payAmount,
        method: input.method,
        provider: input.provider || "MANUAL",
        providerTransactionId: input.providerTransactionId || null,
        idempotencyKey: input.idempotencyKey || null,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        processedById: staffUserId || null,
      },
    });

    // 3. Update Folio Balance
    if (folioId) {
      const folio = await tx.folio.findUniqueOrThrow({ where: { id: folioId } });
      const newBalance = Number(folio.balanceAmount) - payAmount;

      await tx.folio.update({
        where: { id: folioId },
        data: { balanceAmount: newBalance },
      });
    }

    // 4. Update Reservation Status if PENDING_PAYMENT
    const res = await tx.reservation.findUnique({ where: { id: input.reservationId } });
    if (res && res.status === ReservationStatus.PENDING_PAYMENT) {
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.CONFIRMED },
      });
    }

    return payment;
  });
}

export async function processRefund(input: RefundInput) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
      include: { refunds: true, folio: true },
    });

    if (!payment) throw new NotFoundError("Pembayaran tidak ditemukan");
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new ConflictError(`Pembayaran dengan status '${payment.status}' tidak dapat di-refund`);
    }

    const alreadyRefunded = payment.refunds.reduce(
      (sum, r) => sum + (r.status === RefundStatus.SUCCESS ? Number(r.amount) : 0),
      0,
    );
    const maxRefundable = Number(payment.amount) - alreadyRefunded;
    const reqAmount = Math.round(Number(input.amount));

    if (reqAmount > maxRefundable) {
      throw new ConflictError(
        `Jumlah refund (Rp ${reqAmount.toLocaleString()}) melebihi sisa dana yang dapat dikembalikan (Rp ${maxRefundable.toLocaleString()})`,
      );
    }

    // 1. Create Refund Record
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        reservationId: payment.reservationId,
        folioId: payment.folioId,
        amount: reqAmount,
        reason: input.reason.trim(),
        status: RefundStatus.SUCCESS,
        refundedAt: new Date(),
      },
    });

    // 2. Update Payment Status
    const totalNowRefunded = alreadyRefunded + reqAmount;
    const newPaymentStatus =
      totalNowRefunded >= Number(payment.amount)
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: newPaymentStatus },
    });

    // 3. Update Folio Balance
    if (payment.folioId) {
      const folio = await tx.folio.findUniqueOrThrow({ where: { id: payment.folioId } });
      await tx.folio.update({
        where: { id: payment.folioId },
        data: { balanceAmount: Number(folio.balanceAmount) + reqAmount },
      });
    }

    return refund;
  });
}
