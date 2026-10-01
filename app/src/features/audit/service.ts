/**
 * @file src/features/audit/service.ts
 * Audit Logging Service — Phase 8.
 * Records and retrieves immutable audit trail records for compliance and tracing.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface RecordAuditLogInput {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ListAuditLogsOptions {
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Record an audit log entry.
 * Note: Never throws to prevent disrupting main business flows.
 */
export async function recordAuditLog(input: RecordAuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        previousData: (input.previousData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        newData: (input.newData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
    return null;
  }
}

/**
 * Query audit logs with pagination and filters.
 */
export async function listAuditLogs(opts: ListAuditLogsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (opts.resourceType) where.resourceType = opts.resourceType;
  if (opts.resourceId) where.resourceId = opts.resourceId;
  if (opts.userId) where.userId = opts.userId;
  if (opts.action) where.action = { contains: opts.action, mode: "insensitive" };

  if (opts.startDate || opts.endDate) {
    where.createdAt = {};
    if (opts.startDate) {
      where.createdAt.gte = new Date(opts.startDate);
    }
    if (opts.endDate) {
      const end = new Date(opts.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
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
