/**
 * @file src/features/rooms/service.ts
 * Room Types & Rooms service — Phase 2.
 * UC-02 (room type management), UC-03 (room management).
 * BR: soft-delete via isActive flag (no hard deletes per MASTER_IMPLEMENTATION_PROMPT).
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { RoomStatus } from "@prisma/client";
import type { Room, RoomType } from "@prisma/client";

// ─── Room Type ────────────────────────────────────────────────

export const roomTypeCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Kode hanya boleh huruf kapital, angka, - atau _"),
  name: z.string().min(1, "Nama wajib diisi").max(100),
  description: z.string().optional(),
  maxOccupancy: z.coerce.number().int().min(1).max(20),
  basePrice: z.coerce.number().min(0),
  amenities: z.array(z.string()).default([]),
  imageUrls: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
});

export const roomTypeUpdateSchema = roomTypeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type RoomTypeCreateInput = z.infer<typeof roomTypeCreateSchema>;
export type RoomTypeUpdateInput = z.infer<typeof roomTypeUpdateSchema>;

export async function listRoomTypes(includeInactive = false): Promise<RoomType[]> {
  return prisma.roomType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getRoomType(id: string): Promise<RoomType> {
  const rt = await prisma.roomType.findUnique({ where: { id } });
  if (!rt) throw new NotFoundError("Tipe kamar tidak ditemukan");
  return rt;
}

export async function createRoomType(input: RoomTypeCreateInput): Promise<RoomType> {
  const existing = await prisma.roomType.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError(`Kode tipe kamar '${input.code}' sudah digunakan`);
  return prisma.roomType.create({ data: input });
}

export async function updateRoomType(id: string, input: RoomTypeUpdateInput): Promise<RoomType> {
  await getRoomType(id);
  if (input.code) {
    const conflict = await prisma.roomType.findFirst({
      where: { code: input.code, id: { not: id } },
    });
    if (conflict) throw new ConflictError(`Kode tipe kamar '${input.code}' sudah digunakan`);
  }
  return prisma.roomType.update({ where: { id }, data: input });
}

// ─── Room ─────────────────────────────────────────────────────

export const VALID_ROOM_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: [RoomStatus.RESERVED, RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE, RoomStatus.DIRTY],
  RESERVED: [RoomStatus.OCCUPIED, RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE],
  OCCUPIED: [RoomStatus.DIRTY],
  DIRTY: [RoomStatus.CLEANING, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE],
  CLEANING: [RoomStatus.INSPECTION, RoomStatus.DIRTY, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE],
  INSPECTION: [RoomStatus.AVAILABLE, RoomStatus.CLEANING, RoomStatus.DIRTY, RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_SERVICE],
  MAINTENANCE: [RoomStatus.DIRTY, RoomStatus.INSPECTION, RoomStatus.AVAILABLE, RoomStatus.OUT_OF_SERVICE],
  OUT_OF_SERVICE: [RoomStatus.DIRTY, RoomStatus.INSPECTION, RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
};

export const roomCreateSchema = z.object({
  roomTypeId: z.string().min(1, "Tipe kamar wajib dipilih"),
  roomNumber: z.string().min(1, "Nomor kamar wajib diisi").max(20),
  floor: z.coerce.number().int().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const roomUpdateSchema = roomCreateSchema.partial().extend({
  status: z.nativeEnum(RoomStatus).optional(),
});

export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type RoomUpdateInput = z.infer<typeof roomUpdateSchema>;

export async function listRooms(opts?: {
  includeInactive?: boolean;
  roomTypeId?: string;
}): Promise<(Room & { roomType: RoomType })[]> {
  return prisma.room.findMany({
    where: {
      ...(opts?.includeInactive ? {} : { isActive: true }),
      ...(opts?.roomTypeId ? { roomTypeId: opts.roomTypeId } : {}),
    },
    include: { roomType: true },
    orderBy: { roomNumber: "asc" },
  });
}

export async function getRoom(id: string): Promise<Room & { roomType: RoomType }> {
  const room = await prisma.room.findUnique({
    where: { id },
    include: { roomType: true },
  });
  if (!room) throw new NotFoundError("Kamar tidak ditemukan");
  return room;
}

export async function createRoom(input: RoomCreateInput): Promise<Room> {
  const rt = await prisma.roomType.findUnique({ where: { id: input.roomTypeId } });
  if (!rt) throw new NotFoundError("Tipe kamar tidak ditemukan");

  const existing = await prisma.room.findUnique({ where: { roomNumber: input.roomNumber } });
  if (existing) throw new ConflictError(`Nomor kamar '${input.roomNumber}' sudah ada`);

  return prisma.room.create({ data: input });
}

export async function updateRoom(id: string, input: RoomUpdateInput): Promise<Room> {
  const current = await getRoom(id);

  if (input.roomNumber && input.roomNumber !== current.roomNumber) {
    const conflict = await prisma.room.findFirst({
      where: { roomNumber: input.roomNumber, id: { not: id } },
    });
    if (conflict) throw new ConflictError(`Nomor kamar '${input.roomNumber}' sudah ada`);
  }

  if (input.roomTypeId && input.roomTypeId !== current.roomTypeId) {
    const rt = await prisma.roomType.findUnique({ where: { id: input.roomTypeId } });
    if (!rt) throw new NotFoundError("Tipe kamar tidak ditemukan");
  }

  if (input.status && input.status !== current.status) {
    const allowed = VALID_ROOM_TRANSITIONS[current.status] || [];
    if (!allowed.includes(input.status)) {
      throw new ConflictError(
        `Perubahan status kamar dari ${current.status} ke ${input.status} tidak diizinkan`,
      );
    }
  }

  return prisma.room.update({ where: { id }, data: input });
}
