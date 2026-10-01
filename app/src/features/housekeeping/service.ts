/**
 * @file src/features/housekeeping/service.ts
 * Housekeeping Operations & Full Room State Machine — Phase 7.
 * Room Lifecycle:
 * AVAILABLE -> RESERVED -> OCCUPIED -> DIRTY -> CLEANING -> INSPECTION -> AVAILABLE
 * Inspection Failure loop: INSPECTION -> FAILED_INSPECTION -> CLEANING -> INSPECTION
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { RoomStatus, HousekeepingTaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  roomId: z.string().min(1, "Kamar wajib dipilih"),
  assignedToId: z.string().optional(),
  notes: z.string().max(300).optional(),
});

export const updateTaskStatusSchema = z.object({
  action: z.enum(["START", "COMPLETE", "INSPECT_PASS", "INSPECT_FAIL", "ASSIGN"]),
  assignedToId: z.string().optional(),
  notes: z.string().max(300).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export async function listHousekeepingTasks(opts: {
  status?: HousekeepingTaskStatus;
  roomId?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.roomId) where.roomId = opts.roomId;
  if (opts.assignedToId) where.assignedToId = opts.assignedToId;

  const [items, total] = await Promise.all([
    prisma.housekeepingTask.findMany({
      where,
      include: {
        room: { include: { roomType: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.housekeepingTask.count({ where }),
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

export async function createHousekeepingTask(input: CreateTaskInput, staffUserId?: string) {
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new NotFoundError("Kamar tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    // If room was AVAILABLE or INSPECTION, change to DIRTY
    if (room.status === RoomStatus.AVAILABLE || room.status === RoomStatus.INSPECTION) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: RoomStatus.DIRTY },
      });
    }

    const task = await tx.housekeepingTask.create({
      data: {
        roomId: room.id,
        status: HousekeepingTaskStatus.PENDING,
        assignedToId: input.assignedToId || null,
        createdById: staffUserId || null,
        notes: input.notes?.trim() || `Tugas pembersihan kamar ${room.roomNumber}`,
      },
      include: {
        room: true,
        assignedTo: true,
      },
    });

    return task;
  });
}

export async function updateHousekeepingTaskStatus(
  taskId: string,
  input: UpdateTaskStatusInput,
  staffUserId?: string,
) {
  const task = await prisma.housekeepingTask.findUnique({
    where: { id: taskId },
    include: { room: true },
  });

  if (!task) throw new NotFoundError("Tugas housekeeping tidak ditemukan");

  return prisma.$transaction(async (tx) => {
    switch (input.action) {
      case "ASSIGN": {
        if (!input.assignedToId) throw new ConflictError("ID staf penanggung jawab wajib ditentukan");
        return tx.housekeepingTask.update({
          where: { id: taskId },
          data: { assignedToId: input.assignedToId },
          include: { room: true, assignedTo: true },
        });
      }

      case "START": {
        // Staff begins cleaning: Room becomes CLEANING
        await tx.room.update({
          where: { id: task.roomId },
          data: { status: RoomStatus.CLEANING },
        });

        return tx.housekeepingTask.update({
          where: { id: taskId },
          data: {
            status: HousekeepingTaskStatus.IN_PROGRESS,
            startedAt: new Date(),
            assignedToId: input.assignedToId || task.assignedToId || staffUserId,
            notes: input.notes ? `${task.notes || ""}\n${input.notes}`.trim() : task.notes,
          },
          include: { room: true, assignedTo: true },
        });
      }

      case "COMPLETE": {
        // Cleaning finished: Room enters INSPECTION
        await tx.room.update({
          where: { id: task.roomId },
          data: { status: RoomStatus.INSPECTION },
        });

        return tx.housekeepingTask.update({
          where: { id: taskId },
          data: {
            completedAt: new Date(),
            notes: input.notes ? `${task.notes || ""}\nSelesai: ${input.notes}`.trim() : task.notes,
          },
          include: { room: true, assignedTo: true },
        });
      }

      case "INSPECT_PASS": {
        // Inspection approved: Room status becomes AVAILABLE!
        await tx.room.update({
          where: { id: task.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });

        return tx.housekeepingTask.update({
          where: { id: taskId },
          data: {
            status: HousekeepingTaskStatus.DONE,
            inspectedAt: new Date(),
            notes: input.notes ? `${task.notes || ""}\nInspeksi Lulus: ${input.notes}`.trim() : task.notes,
          },
          include: { room: true, assignedTo: true },
        });
      }

      case "INSPECT_FAIL": {
        // Inspection failed: Loop back to CLEANING!
        await tx.room.update({
          where: { id: task.roomId },
          data: { status: RoomStatus.CLEANING },
        });

        return tx.housekeepingTask.update({
          where: { id: taskId },
          data: {
            status: HousekeepingTaskStatus.FAILED_INSPECTION,
            inspectedAt: new Date(),
            notes: input.notes ? `${task.notes || ""}\nInspeksi Gagal (Perlu perbaikan): ${input.notes}`.trim() : task.notes,
          },
          include: { room: true, assignedTo: true },
        });
      }

      default:
        throw new ConflictError("Aksi status housekeeping tidak dikenal");
    }
  });
}
