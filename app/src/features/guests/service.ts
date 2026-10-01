/**
 * @file src/features/guests/service.ts
 * Guest Management & Identity Documents — Phase 3.
 * UC-01: Guest creation, lookup, and document verification.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { DocumentType } from "@prisma/client";
import type { Guest, GuestDocument } from "@prisma/client";

export const guestCreateSchema = z.object({
  firstName: z.string().min(1, "Nama depan wajib diisi").max(50),
  lastName: z.string().max(50).optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z
    .string()
    .min(5, "Nomor telepon minimal 5 digit")
    .max(20)
    .optional()
    .or(z.literal("")),
  nationality: z.string().max(50).default("Indonesia"),
  notes: z.string().max(500).optional(),
});

export const guestUpdateSchema = guestCreateSchema.partial();

export const guestDocumentCreateSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().min(3, "Nomor dokumen minimal 3 karakter").max(50),
  fileUrl: z.string().url().optional().or(z.literal("")),
  isVerified: z.boolean().default(false),
});

export type GuestCreateInput = z.infer<typeof guestCreateSchema>;
export type GuestUpdateInput = z.infer<typeof guestUpdateSchema>;
export type GuestDocumentCreateInput = z.infer<typeof guestDocumentCreateSchema>;

export interface GuestListOptions {
  query?: string;
  page?: number;
  limit?: number;
}

export async function checkDuplicateGuest(opts: {
  email?: string | null;
  phone?: string | null;
  excludeId?: string;
}): Promise<{ hasDuplicate: boolean; matches: Guest[] }> {
  const conditions = [];
  if (opts.email && opts.email.trim()) {
    conditions.push({ email: opts.email.trim() });
  }
  if (opts.phone && opts.phone.trim()) {
    conditions.push({ phone: opts.phone.trim() });
  }

  if (conditions.length === 0) {
    return { hasDuplicate: false, matches: [] };
  }

  const matches = await prisma.guest.findMany({
    where: {
      OR: conditions,
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
    },
  });

  return {
    hasDuplicate: matches.length > 0,
    matches,
  };
}

export async function listGuests(opts: GuestListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = opts.query
    ? {
        OR: [
          { firstName: { contains: opts.query, mode: "insensitive" as const } },
          { lastName: { contains: opts.query, mode: "insensitive" as const } },
          { email: { contains: opts.query, mode: "insensitive" as const } },
          { phone: { contains: opts.query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: {
        documents: true,
        _count: {
          select: { reservations: true, stays: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.guest.count({ where }),
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

export async function getGuest(id: string) {
  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      documents: true,
      reservations: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { roomType: true, ratePlan: true },
          },
        },
      },
      stays: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { room: true },
      },
    },
  });

  if (!guest) throw new NotFoundError("Data tamu tidak ditemukan");
  return guest;
}

export async function createGuest(input: GuestCreateInput) {
  const cleanEmail = input.email && input.email.trim() ? input.email.trim() : null;
  const cleanPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;

  return prisma.guest.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName ? input.lastName.trim() : null,
      email: cleanEmail,
      phone: cleanPhone,
      nationality: input.nationality || "Indonesia",
      notes: input.notes?.trim() || null,
    },
    include: { documents: true },
  });
}

export async function updateGuest(id: string, input: GuestUpdateInput): Promise<Guest> {
  await getGuest(id);

  const data: Record<string, unknown> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.lastName !== undefined) data.lastName = input.lastName?.trim() || null;
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.nationality !== undefined) data.nationality = input.nationality;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  return prisma.guest.update({
    where: { id },
    data,
  });
}

export async function addGuestDocument(
  guestId: string,
  input: GuestDocumentCreateInput,
): Promise<GuestDocument> {
  await getGuest(guestId);

  return prisma.guestDocument.create({
    data: {
      guestId,
      documentType: input.documentType,
      documentNumber: input.documentNumber.trim(),
      fileUrl: input.fileUrl?.trim() || null,
      verifiedAt: input.isVerified ? new Date() : null,
    },
  });
}

export async function verifyGuestDocument(documentId: string): Promise<GuestDocument> {
  const doc = await prisma.guestDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError("Dokumen tamu tidak ditemukan");

  return prisma.guestDocument.update({
    where: { id: documentId },
    data: { verifiedAt: new Date() },
  });
}
