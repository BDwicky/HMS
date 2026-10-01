/**
 * @file src/features/invoices/service.ts
 * Invoice Generation & Invoicing — Phase 6.
 * Rules:
 * 1. Sequential / unique invoice numbering: INV-YYYYMMDD-XXXX.
 * 2. Immutable guest snapshot (first/last name, email, phone, address) and financial snapshot.
 * 3. Never hard-delete issued invoices.
 */

import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { InvoiceStatus } from "@prisma/client";

export function generateInvoiceNumber(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${yyyy}${mm}${dd}-${random}`;
}

export async function generateInvoice(folioId: string) {
  const existing = await prisma.invoice.findUnique({ where: { folioId } });
  if (existing) return existing;

  const folio = await prisma.folio.findUnique({
    where: { id: folioId },
    include: {
      reservation: {
        include: { guest: true },
      },
      items: true,
      payments: true,
    },
  });

  if (!folio) throw new NotFoundError("Folio tagihan tidak ditemukan");

  const guest = folio.reservation.guest;
  const guestFirstName = guest.firstName;
  const guestLastName = guest.lastName;
  const guestEmail = guest.email;
  const guestPhone = guest.phone;

  let invoiceNumber = generateInvoiceNumber();
  let collision = await prisma.invoice.findUnique({ where: { invoiceNumber } });
  while (collision) {
    invoiceNumber = generateInvoiceNumber();
    collision = await prisma.invoice.findUnique({ where: { invoiceNumber } });
  }

  return prisma.invoice.create({
    data: {
      folioId,
      invoiceNumber,
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date(),
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      guestAddress: null,
      subtotal: folio.subtotal,
      taxAmount: folio.taxAmount,
      serviceCharge: folio.serviceCharge,
      discountAmount: folio.discountAmount,
      totalAmount: folio.totalAmount,
    },
    include: {
      folio: {
        include: {
          items: true,
          payments: true,
        },
      },
    },
  });
}

export async function getInvoice(id: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      folio: {
        include: {
          items: { orderBy: { createdAt: "asc" } },
          payments: { orderBy: { createdAt: "desc" } },
          reservation: true,
        },
      },
    },
  });

  if (!inv) throw new NotFoundError("Faktur / Invoice tidak ditemukan");
  return inv;
}

export async function listInvoices(opts: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.search && opts.search.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { guestFirstName: { contains: q, mode: "insensitive" } },
      { guestLastName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        folio: {
          include: { reservation: true },
        },
      },
      orderBy: { issuedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
