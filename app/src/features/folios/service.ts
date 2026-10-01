/**
 * @file src/features/folios/service.ts
 * Folio & Charges Management — Phase 6.
 * Rules:
 * 1. Folio maintains authoritative room & additional charges, tax, service charge, and balance.
 * 2. Additional charges (Breakfast, Extra Bed, Minibar, Laundry, etc.) update totals server-side.
 * 3. Discounts reduce total amount and balance.
 * 4. Never hard-delete folio items; corrections use adjustments or credit items.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { FolioItemType } from "@prisma/client";
import { getHotelSettings } from "@/features/settings/service";

export const addChargeSchema = z.object({
  category: z.string().min(1, "Kategori tagihan wajib dipilih"),
  description: z.string().min(1, "Keterangan tagihan wajib diisi").max(200),
  quantity: z.coerce.number().min(0.1).default(1),
  unitPrice: z.coerce.number().min(0, "Harga satuan tidak boleh negatif"),
  stayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const addDiscountSchema = z.object({
  description: z.string().min(1, "Alasan diskon wajib diisi").max(200),
  amount: z.coerce.number().min(1, "Nominal diskon minimal 1"),
});

export type AddChargeInput = z.infer<typeof addChargeSchema>;
export type AddDiscountInput = z.infer<typeof addDiscountSchema>;

export async function getFolio(id: string) {
  const folio = await prisma.folio.findUnique({
    where: { id },
    include: {
      reservation: {
        include: { guest: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
      payments: {
        include: { refunds: true },
        orderBy: { createdAt: "desc" },
      },
      invoice: true,
    },
  });

  if (!folio) throw new NotFoundError("Folio tagihan tidak ditemukan");
  return folio;
}

export async function getFolioByReservation(reservationId: string) {
  const folio = await prisma.folio.findUnique({
    where: { reservationId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } },
      invoice: true,
    },
  });

  if (!folio) throw new NotFoundError("Folio tagihan untuk reservasi ini tidak ditemukan");
  return folio;
}

export async function addFolioCharge(folioId: string, input: AddChargeInput) {
  const folio = await getFolio(folioId);
  const settings = await getHotelSettings();
  const taxPercent = Number(settings?.taxPercent || 0);
  const serviceChargePercent = Number(settings?.serviceChargePercent || 0);

  const chargeSubtotal = Math.round(Number(input.quantity) * Number(input.unitPrice));
  const chargeTax = Math.round(chargeSubtotal * (taxPercent / 100));
  const chargeService = Math.round(chargeSubtotal * (serviceChargePercent / 100));
  const chargeTotal = chargeSubtotal + chargeTax + chargeService;

  return prisma.$transaction(async (tx) => {
    // 1. Create Folio Item
    const item = await tx.folioItem.create({
      data: {
        folioId,
        type: FolioItemType.ADDITIONAL_CHARGE,
        category: input.category,
        description: input.description.trim(),
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        subtotal: chargeSubtotal,
        stayDate: input.stayDate ? new Date(input.stayDate) : null,
      },
    });

    // 2. Update Folio Totals
    const updatedFolio = await tx.folio.update({
      where: { id: folioId },
      data: {
        subtotal: Number(folio.subtotal) + chargeSubtotal,
        taxAmount: Number(folio.taxAmount) + chargeTax,
        serviceCharge: Number(folio.serviceCharge) + chargeService,
        totalAmount: Number(folio.totalAmount) + chargeTotal,
        balanceAmount: Number(folio.balanceAmount) + chargeTotal,
      },
      include: { items: true, payments: true },
    });

    return { item, folio: updatedFolio };
  });
}

export async function applyFolioDiscount(folioId: string, input: AddDiscountInput) {
  const folio = await getFolio(folioId);
  const discountAmount = Math.round(Number(input.amount));

  return prisma.$transaction(async (tx) => {
    // 1. Record Discount Item
    const item = await tx.folioItem.create({
      data: {
        folioId,
        type: FolioItemType.DISCOUNT,
        category: "DISCOUNT",
        description: `Diskon: ${input.description.trim()}`,
        quantity: 1,
        unitPrice: -discountAmount,
        subtotal: -discountAmount,
      },
    });

    // 2. Update Folio
    const updatedFolio = await tx.folio.update({
      where: { id: folioId },
      data: {
        discountAmount: Number(folio.discountAmount) + discountAmount,
        totalAmount: Math.max(0, Number(folio.totalAmount) - discountAmount),
        balanceAmount: Number(folio.balanceAmount) - discountAmount,
      },
      include: { items: true, payments: true },
    });

    return { item, folio: updatedFolio };
  });
}
