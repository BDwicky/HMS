/**
 * @file src/features/pricing/service.ts
 * Rate Plans, Policies, and Room Rates service — Phase 2.
 * UC-04 (rate plans), UC-05 (room rates).
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  RatePlan,
  RoomRate,
  CancellationPolicy,
  ModificationPolicy,
  NoShowPolicy,
} from "@prisma/client";

// ─── Cancellation Policy ──────────────────────────────────────

export const cancellationPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  freeDeadlineHours: z.coerce.number().int().min(0).optional(),
  penaltyPercent: z.coerce.number().min(0).max(100).optional(),
  penaltyNights: z.coerce.number().int().min(0).optional(),
});
export type CancellationPolicyInput = z.infer<typeof cancellationPolicySchema>;

export async function listCancellationPolicies(): Promise<CancellationPolicy[]> {
  return prisma.cancellationPolicy.findMany({ orderBy: { name: "asc" } });
}
export async function createCancellationPolicy(input: CancellationPolicyInput) {
  return prisma.cancellationPolicy.create({ data: input });
}
export async function updateCancellationPolicy(id: string, input: Partial<CancellationPolicyInput>) {
  const p = await prisma.cancellationPolicy.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Kebijakan pembatalan tidak ditemukan");
  return prisma.cancellationPolicy.update({ where: { id }, data: input });
}

// ─── Modification Policy ──────────────────────────────────────

export const modificationPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  allowModification: z.boolean().default(true),
  freeDeadlineHours: z.coerce.number().int().min(0).optional(),
  penaltyPercent: z.coerce.number().min(0).max(100).optional(),
});
export type ModificationPolicyInput = z.infer<typeof modificationPolicySchema>;

export async function listModificationPolicies(): Promise<ModificationPolicy[]> {
  return prisma.modificationPolicy.findMany({ orderBy: { name: "asc" } });
}
export async function createModificationPolicy(input: ModificationPolicyInput) {
  return prisma.modificationPolicy.create({ data: input });
}
export async function updateModificationPolicy(id: string, input: Partial<ModificationPolicyInput>) {
  const p = await prisma.modificationPolicy.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Kebijakan modifikasi tidak ditemukan");
  return prisma.modificationPolicy.update({ where: { id }, data: input });
}

// ─── No-Show Policy ───────────────────────────────────────────

export const noShowPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  penaltyPercent: z.coerce.number().min(0).max(100).optional(),
  penaltyNights: z.coerce.number().int().min(0).optional(),
});
export type NoShowPolicyInput = z.infer<typeof noShowPolicySchema>;

export async function listNoShowPolicies(): Promise<NoShowPolicy[]> {
  return prisma.noShowPolicy.findMany({ orderBy: { name: "asc" } });
}
export async function createNoShowPolicy(input: NoShowPolicyInput) {
  return prisma.noShowPolicy.create({ data: input });
}
export async function updateNoShowPolicy(id: string, input: Partial<NoShowPolicyInput>) {
  const p = await prisma.noShowPolicy.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Kebijakan no-show tidak ditemukan");
  return prisma.noShowPolicy.update({ where: { id }, data: input });
}

// ─── Rate Plan ────────────────────────────────────────────────

export const ratePlanCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  isRefundable: z.boolean().default(true),
  includesBreakfast: z.boolean().default(false),
  cancellationPolicyId: z.string().optional(),
  modificationPolicyId: z.string().optional(),
  noShowPolicyId: z.string().optional(),
  isActive: z.boolean().default(true),
});
export const ratePlanUpdateSchema = ratePlanCreateSchema.partial();
export type RatePlanCreateInput = z.infer<typeof ratePlanCreateSchema>;
export type RatePlanUpdateInput = z.infer<typeof ratePlanUpdateSchema>;

export async function listRatePlans(includeInactive = false): Promise<RatePlan[]> {
  return prisma.ratePlan.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      cancellationPolicy: true,
      modificationPolicy: true,
      noShowPolicy: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getRatePlan(id: string) {
  const rp = await prisma.ratePlan.findUnique({
    where: { id },
    include: {
      cancellationPolicy: true,
      modificationPolicy: true,
      noShowPolicy: true,
    },
  });
  if (!rp) throw new NotFoundError("Rate plan tidak ditemukan");
  return rp;
}

export async function createRatePlan(input: RatePlanCreateInput): Promise<RatePlan> {
  const existing = await prisma.ratePlan.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError(`Kode rate plan '${input.code}' sudah digunakan`);
  return prisma.ratePlan.create({ data: input });
}

export async function updateRatePlan(id: string, input: RatePlanUpdateInput): Promise<RatePlan> {
  await getRatePlan(id);
  if (input.code) {
    const conflict = await prisma.ratePlan.findFirst({
      where: { code: input.code, id: { not: id } },
    });
    if (conflict) throw new ConflictError(`Kode rate plan '${input.code}' sudah digunakan`);
  }
  return prisma.ratePlan.update({ where: { id }, data: input });
}

// ─── Room Rates ───────────────────────────────────────────────

export const roomRateUpsertSchema = z.object({
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  stayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
  price: z.coerce.number().min(0),
});

export const roomRateBulkSchema = z.object({
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.coerce.number().min(0),
});

export type RoomRateUpsertInput = z.infer<typeof roomRateUpsertSchema>;
export type RoomRateBulkInput = z.infer<typeof roomRateBulkSchema>;

export async function getRoomRates(opts: {
  roomTypeId?: string;
  ratePlanId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RoomRate[]> {
  return prisma.roomRate.findMany({
    where: {
      ...(opts.roomTypeId ? { roomTypeId: opts.roomTypeId } : {}),
      ...(opts.ratePlanId ? { ratePlanId: opts.ratePlanId } : {}),
      ...(opts.startDate || opts.endDate
        ? {
            stayDate: {
              ...(opts.startDate ? { gte: new Date(opts.startDate) } : {}),
              ...(opts.endDate ? { lte: new Date(opts.endDate) } : {}),
            },
          }
        : {}),
    },
    orderBy: { stayDate: "asc" },
  });
}

export async function upsertRoomRate(input: RoomRateUpsertInput): Promise<RoomRate> {
  const stayDate = new Date(input.stayDate);
  return prisma.roomRate.upsert({
    where: {
      roomTypeId_ratePlanId_stayDate: {
        roomTypeId: input.roomTypeId,
        ratePlanId: input.ratePlanId,
        stayDate,
      },
    },
    create: {
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      stayDate,
      price: input.price,
    },
    update: { price: input.price },
  });
}

export async function bulkUpsertRoomRates(input: RoomRateBulkInput): Promise<number> {
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (end < start) throw new Error("endDate harus setelah startDate");

  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  await prisma.$transaction(
    dates.map((stayDate) =>
      prisma.roomRate.upsert({
        where: {
          roomTypeId_ratePlanId_stayDate: {
            roomTypeId: input.roomTypeId,
            ratePlanId: input.ratePlanId,
            stayDate,
          },
        },
        create: {
          roomTypeId: input.roomTypeId,
          ratePlanId: input.ratePlanId,
          stayDate,
          price: input.price,
        },
        update: { price: input.price },
      }),
    ),
  );

  return dates.length;
}
