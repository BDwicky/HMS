/**
 * @file src/features/maintenance/service.ts
 * Maintenance Requests & Out-of-Order Rooms — Phase 7.
 * Rules:
 * 1. Maintenance can set room to MAINTENANCE or OUT_OF_SERVICE.
 * 2. Rooms under maintenance are excluded by the availability engine.
 * 3. Resolved maintenance transitions room to DIRTY for cleaning & inspection.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import {
  MaintenancePriority,
  MaintenanceStatus,
  RoomStatus,
} from "@prisma/client";

export const createMaintenanceSchema = z.object({
  roomId: z.string().min(1, "Kamar wajib dipilih"),
  category: z.string().optional(),
  description: z.string().min(1, "Deskripsi kerusakan wajib diisi").max(500),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  takeOutOfService: z.boolean().default(false),
  photoUrls: z.array(z.string().url()).default([]),
});

export const updateMaintenanceSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus),
  notes: z.string().max(500).optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export async function listMaintenanceRequests(opts: {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  roomId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.priority) where.priority = opts.priority;
  if (opts.roomId) where.roomId = opts.roomId;

  const [items, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      include: {
        room: { include: { roomType: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.maintenanceRequest.count({ where }),
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

export async function createMaintenanceRequest(
  input: CreateMaintenanceInput,
  staffUserId?: string,
) {
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new NotFoundError("Kamar tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    // Determine new room status if high priority or explicitly taking out of service
    let targetRoomStatus = room.status;
    if (input.takeOutOfService) {
      targetRoomStatus = RoomStatus.OUT_OF_SERVICE;
    } else if (
      input.priority === MaintenancePriority.HIGH ||
      input.priority === MaintenancePriority.URGENT
    ) {
      targetRoomStatus = RoomStatus.MAINTENANCE;
    }

    if (targetRoomStatus !== room.status) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: targetRoomStatus },
      });
    }

    const req = await tx.maintenanceRequest.create({
      data: {
        roomId: room.id,
        category: input.category || null,
        description: input.description.trim(),
        priority: input.priority,
        status: MaintenanceStatus.OPEN,
        photoUrls: input.photoUrls,
        reportedById: staffUserId || null,
      },
      include: { room: true },
    });

    return req;
  });
}

export async function updateMaintenanceRequest(
  id: string,
  input: UpdateMaintenanceInput,
) {
  const req = await prisma.maintenanceRequest.findUnique({
    where: { id },
    include: { room: true },
  });

  if (!req) throw new NotFoundError("Permintaan pemeliharaan tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    const isResolving =
      input.status === MaintenanceStatus.RESOLVED || input.status === MaintenanceStatus.CLOSED;

    // When maintenance is resolved, set room status to DIRTY (so it gets cleaned & inspected)
    if (isResolving && (req.room.status === RoomStatus.MAINTENANCE || req.room.status === RoomStatus.OUT_OF_SERVICE)) {
      await tx.room.update({
        where: { id: req.roomId },
        data: { status: RoomStatus.DIRTY },
      });

      // Auto create housekeeping cleaning task
      await tx.housekeepingTask.create({
        data: {
          roomId: req.roomId,
          status: "PENDING",
          notes: `Pembersihan pasca-perbaikan maintenance (${req.description})`,
        },
      });
    }

    const updated = await tx.maintenanceRequest.update({
      where: { id },
      data: {
        status: input.status,
        resolvedAt: isResolving ? new Date() : req.resolvedAt,
      },
      include: { room: true },
    });

    return updated;
  });
}
