/**
 * @file src/features/reservations/service.ts
 * Core Reservation Engine — Phase 4.
 * Rules:
 * 1. Shared engine for ONLINE, WALK_IN, PHONE, STAFF.
 * 2. Booking reference format: BK-YYYYMMDD-XXXX (unique).
 * 3. Multi-room, multi-type reservations with nightly rate snapshots (ReservationItemNight).
 * 4. Authoritative server-side pricing: subtotal, tax, service charge, total.
 * 5. Concurrency & availability verified inside transaction before creation.
 * 6. Cancellation, modification, and no-show policies enforced server-side.
 * 7. Reservations are never hard-deleted.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { ReservationStatus, ReservationSource, RoomStatus } from "@prisma/client";
import { getStayDates } from "@/features/availability/service";
import { getHotelSettings } from "@/features/settings/service";

// ─── Schemas ──────────────────────────────────────────────────

export const reservationItemInputSchema = z.object({
  roomTypeId: z.string().min(1, "Tipe kamar wajib dipilih"),
  ratePlanId: z.string().min(1, "Rate plan wajib dipilih"),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const reservationCreateSchema = z
  .object({
    guestId: z.string().optional(),
    guest: z
      .object({
        firstName: z.string().min(1, "Nama depan tamu wajib diisi"),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().min(5).optional().or(z.literal("")),
        nationality: z.string().default("Indonesia"),
      })
      .optional(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format check-in: YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format check-out: YYYY-MM-DD"),
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
    source: z.nativeEnum(ReservationSource).default(ReservationSource.ONLINE),
    items: z.array(reservationItemInputSchema).min(1, "Minimal pilih 1 tipe kamar"),
    specialRequest: z.string().max(500).optional(),
    internalNote: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const inDate = new Date(data.checkIn);
      const outDate = new Date(data.checkOut);
      return outDate > inDate;
    },
    {
      message: "Tanggal check-out harus setelah tanggal check-in",
      path: ["checkOut"],
    },
  )
  .refine(
    (data) => Boolean(data.guestId || data.guest?.firstName),
    {
      message: "Data tamu harus disertakan (guestId atau profil guest baru)",
      path: ["guest"],
    },
  );

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;

export const reservationCancelSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const reservationModifySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  specialRequest: z.string().max(500).optional(),
  internalNote: z.string().max(500).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────

export function generateBookingReference(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${yyyy}${mm}${dd}-${random}`;
}

// ─── Main Services ───────────────────────────────────────────

export async function createReservation(
  input: ReservationCreateInput,
  createdById?: string,
) {
  const checkInDate = new Date(input.checkIn);
  const checkOutDate = new Date(input.checkOut);
  const stayDates = getStayDates(input.checkIn, input.checkOut);
  const nights = stayDates.length;

  return prisma.$transaction(async (tx) => {
    // 1. Resolve or Create Guest
    let guestId = input.guestId;
    let guestFirstName = "";
    let guestLastName: string | null = null;
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;

    if (guestId) {
      const g = await tx.guest.findUnique({ where: { id: guestId } });
      if (!g) throw new NotFoundError("Data tamu tidak ditemukan");
      guestFirstName = g.firstName;
      guestLastName = g.lastName;
      guestEmail = g.email;
      guestPhone = g.phone;
    } else if (input.guest) {
      const g = await tx.guest.create({
        data: {
          firstName: input.guest.firstName.trim(),
          lastName: input.guest.lastName ? input.guest.lastName.trim() : null,
          email: input.guest.email && input.guest.email.trim() ? input.guest.email.trim() : null,
          phone: input.guest.phone && input.guest.phone.trim() ? input.guest.phone.trim() : null,
          nationality: input.guest.nationality || "Indonesia",
        },
      });
      guestId = g.id;
      guestFirstName = g.firstName;
      guestLastName = g.lastName;
      guestEmail = g.email;
      guestPhone = g.phone;
    }

    if (!guestId) throw new ValidationError("Identitas tamu gagal diverifikasi");

    // 2. Concurrency Check: Verify availability for each roomType
    for (const item of input.items) {
      const rt = await tx.roomType.findUnique({
        where: { id: item.roomTypeId, isActive: true },
        include: { rooms: { where: { isActive: true } } },
      });
      if (!rt) throw new NotFoundError(`Tipe kamar '${item.roomTypeId}' tidak ditemukan atau nonaktif`);

      const totalPhysical = rt.rooms.length;
      const maintenanceCount = rt.rooms.filter(
        (r) => r.status === RoomStatus.MAINTENANCE || r.status === RoomStatus.OUT_OF_SERVICE,
      ).length;

      // Active overlapping reservations
      const overlapping = await tx.reservation.findMany({
        where: {
          status: {
            in: [
              ReservationStatus.CONFIRMED,
              ReservationStatus.CHECKED_IN,
              ReservationStatus.PENDING_PAYMENT,
            ],
          },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        include: { items: true },
      });

      let bookedCount = 0;
      for (const res of overlapping) {
        for (const resItem of res.items) {
          if (resItem.roomTypeId === item.roomTypeId) {
            bookedCount += resItem.quantity;
          }
        }
      }

      const availableCount = totalPhysical - maintenanceCount - bookedCount;
      if (availableCount < item.quantity) {
        throw new ConflictError(
          `Kamar tipe '${rt.name}' tidak lagi mencukupi untuk tanggal tersebut (tersisa ${Math.max(0, availableCount)} kamar, diminta ${item.quantity})`,
        );
      }
    }

    // 3. Load Settings for Tax & Service Charge
    const settings = await getHotelSettings();
    const taxPercent = Number(settings?.taxPercent || 0);
    const serviceChargePercent = Number(settings?.serviceChargePercent || 0);

    // 4. Calculate Rates and Prepare Item Snapshots
    let overallSubtotal = 0;
    const preparedItems = [];

    for (const item of input.items) {
      const rt = await tx.roomType.findUniqueOrThrow({ where: { id: item.roomTypeId } });
      await tx.ratePlan.findUniqueOrThrow({ where: { id: item.ratePlanId } });

      // Fetch custom daily rates
      const customRates = await tx.roomRate.findMany({
        where: {
          roomTypeId: item.roomTypeId,
          ratePlanId: item.ratePlanId,
          stayDate: {
            gte: checkInDate,
            lt: checkOutDate,
          },
        },
      });

      const rateMap = new Map<string, number>();
      for (const cr of customRates) {
        rateMap.set(cr.stayDate.toISOString().split("T")[0], Number(cr.price));
      }

      const nightsDetail = [];
      let itemTotalPerRoom = 0;

      for (const dStr of stayDates) {
        const nightlyRate = rateMap.get(dStr) ?? Number(rt.basePrice);
        const nightTax = Math.round(nightlyRate * (taxPercent / 100));
        const nightSubtotal = nightlyRate;

        itemTotalPerRoom += nightlyRate;
        nightsDetail.push({
          stayDate: new Date(dStr),
          roomRate: nightlyRate,
          taxAmount: nightTax,
          subtotal: nightSubtotal,
        });
      }

      const itemSubtotal = itemTotalPerRoom * item.quantity;
      overallSubtotal += itemSubtotal;
      const averagePricePerNight = nights > 0 ? Math.round(itemTotalPerRoom / nights) : 0;

      preparedItems.push({
        roomTypeId: item.roomTypeId,
        ratePlanId: item.ratePlanId,
        quantity: item.quantity,
        pricePerNight: averagePricePerNight,
        nights,
        subtotal: itemSubtotal,
        nightsDetail,
      });
    }

    // 5. Calculate Final Totals
    const taxAmount = Math.round(overallSubtotal * (taxPercent / 100));
    const serviceCharge = Math.round(overallSubtotal * (serviceChargePercent / 100));
    const totalAmount = overallSubtotal + taxAmount + serviceCharge;

    // 6. Generate Unique Reference
    let bookingReference = generateBookingReference();
    let refCollision = await tx.reservation.findUnique({ where: { bookingReference } });
    while (refCollision) {
      bookingReference = generateBookingReference();
      refCollision = await tx.reservation.findUnique({ where: { bookingReference } });
    }

    // Initial status: STAFF or WALK_IN default to CONFIRMED, ONLINE defaults to PENDING_PAYMENT
    const initialStatus =
      input.source === ReservationSource.ONLINE
        ? ReservationStatus.PENDING_PAYMENT
        : ReservationStatus.CONFIRMED;

    // 7. Insert Reservation & Details
    const reservation = await tx.reservation.create({
      data: {
        bookingReference,
        guestId,
        source: input.source,
        status: initialStatus,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: input.adults,
        children: input.children,
        guestFirstName,
        guestLastName,
        guestEmail,
        guestPhone,
        specialRequest: input.specialRequest || null,
        internalNote: input.internalNote || null,
        subtotal: overallSubtotal,
        taxAmount,
        serviceCharge,
        discountAmount: 0,
        totalAmount,
        createdById: createdById || null,
        items: {
          create: preparedItems.map((pi) => ({
            roomTypeId: pi.roomTypeId,
            ratePlanId: pi.ratePlanId,
            quantity: pi.quantity,
            pricePerNight: pi.pricePerNight,
            nights: pi.nights,
            subtotal: pi.subtotal,
            nightsDetail: {
              create: pi.nightsDetail,
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            roomType: true,
            ratePlan: true,
            nightsDetail: true,
          },
        },
        guest: true,
      },
    });

    return reservation;
  });
}

export async function listReservations(opts: {
  status?: ReservationStatus;
  checkIn?: string;
  checkOut?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (opts.status) {
    where.status = opts.status;
  }

  if (opts.checkIn) {
    where.checkIn = { gte: new Date(opts.checkIn) };
  }

  if (opts.checkOut) {
    where.checkOut = { lte: new Date(opts.checkOut) };
  }

  if (opts.search && opts.search.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { bookingReference: { contains: q, mode: "insensitive" } },
      { guestFirstName: { contains: q, mode: "insensitive" } },
      { guestLastName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        items: {
          include: { roomType: true, ratePlan: true },
        },
        guest: true,
        cancellation: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
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

export async function getReservation(id: string) {
  const res = await prisma.reservation.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          roomType: true,
          ratePlan: {
            include: { cancellationPolicy: true, modificationPolicy: true, noShowPolicy: true },
          },
          nightsDetail: { orderBy: { stayDate: "asc" } },
        },
      },
      guest: true,
      cancellation: true,
      changeLogs: {
        include: { changedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      roomAssignments: { include: { room: true } },
      stays: { include: { room: true } },
    },
  });

  if (!res) throw new NotFoundError("Reservasi tidak ditemukan");
  return res;
}

export async function getReservationByReference(bookingReference: string, email?: string) {
  const res = await prisma.reservation.findUnique({
    where: { bookingReference },
    include: {
      items: {
        include: {
          roomType: true,
          ratePlan: true,
          nightsDetail: { orderBy: { stayDate: "asc" } },
        },
      },
      guest: true,
      cancellation: true,
    },
  });

  if (!res) throw new NotFoundError("Reservasi tidak ditemukan");

  if (email && res.guestEmail?.toLowerCase() !== email.toLowerCase()) {
    throw new NotFoundError("Email tidak cocok dengan nomor konfirmasi reservasi");
  }

  return res;
}

// ─── Cancellation with Policy ─────────────────────────────────

export async function cancelReservation(
  reservationId: string,
  opts: { reason?: string; cancelledById?: string } = {},
) {
  const res = await getReservation(reservationId);

  if (
    res.status !== ReservationStatus.PENDING_PAYMENT &&
    res.status !== ReservationStatus.CONFIRMED
  ) {
    throw new ConflictError(
      `Reservasi dengan status '${res.status}' tidak dapat dibatalkan`,
    );
  }

  const now = new Date();
  const checkInDate = new Date(res.checkIn);
  const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Evaluate cancellation policy across items
  let totalCancellationFee = 0;
  let isNonRefundable = false;

  for (const item of res.items) {
    const policy = item.ratePlan.cancellationPolicy;
    if (!item.ratePlan.isRefundable) {
      isNonRefundable = true;
    }

    if (policy) {
      const freeDeadline = policy.freeDeadlineHours ?? 24;
      if (hoursUntilCheckIn < freeDeadline) {
        if (policy.penaltyPercent) {
          const penalty = (Number(item.subtotal) * Number(policy.penaltyPercent)) / 100;
          totalCancellationFee += penalty;
        } else if (policy.penaltyNights && item.nights > 0) {
          const oneNightAvg = Number(item.subtotal) / item.nights;
          totalCancellationFee += oneNightAvg * Math.min(policy.penaltyNights, item.nights);
        }
      }
    }
  }

  if (isNonRefundable) {
    totalCancellationFee = Number(res.totalAmount);
  }

  totalCancellationFee = Math.round(totalCancellationFee);
  const refundableAmount = Math.max(0, Number(res.totalAmount) - totalCancellationFee);

  return prisma.$transaction(async (tx) => {
    // 1. Update reservation status
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CANCELLED },
    });

    // 2. Record cancellation audit record
    await tx.reservationCancellation.create({
      data: {
        reservationId,
        reason: opts.reason || "Dibatalkan oleh staf / tamu",
        cancellationFee: totalCancellationFee,
        refundableAmount,
      },
    });

    // 3. Log change
    await tx.reservationChangeLog.create({
      data: {
        reservationId,
        changedById: opts.cancelledById || null,
        changeType: "STATUS_CHANGE",
        previousData: { status: res.status },
        newData: {
          status: ReservationStatus.CANCELLED,
          cancellationFee: totalCancellationFee,
          refundableAmount,
        },
        notes: opts.reason || null,
      },
    });

    return updated;
  });
}

// ─── Mark No-Show with Policy ─────────────────────────────────

export async function markNoShow(reservationId: string, staffUserId?: string) {
  const res = await getReservation(reservationId);

  if (res.status !== ReservationStatus.CONFIRMED) {
    throw new ConflictError("Hanya reservasi CONFIRMED yang dapat ditandai No-Show");
  }

  let totalPenalty = 0;
  for (const item of res.items) {
    const policy = item.ratePlan.noShowPolicy;
    if (policy) {
      if (policy.penaltyPercent) {
        totalPenalty += (Number(item.subtotal) * Number(policy.penaltyPercent)) / 100;
      } else if (policy.penaltyNights && item.nights > 0) {
        const oneNight = Number(item.subtotal) / item.nights;
        totalPenalty += oneNight * Math.min(policy.penaltyNights, item.nights);
      }
    } else {
      // Default standard 1 night fee
      const oneNight = Number(item.subtotal) / Math.max(1, item.nights);
      totalPenalty += oneNight;
    }
  }

  totalPenalty = Math.round(totalPenalty);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.NO_SHOW },
    });

    await tx.reservationChangeLog.create({
      data: {
        reservationId,
        changedById: staffUserId || null,
        changeType: "STATUS_CHANGE",
        previousData: { status: res.status },
        newData: { status: ReservationStatus.NO_SHOW, penaltyFee: totalPenalty },
        notes: "Tamu tidak hadir pada tanggal check-in (No-Show)",
      },
    });

    return updated;
  });
}
