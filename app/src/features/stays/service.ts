/**
 * @file src/features/stays/service.ts
 * Front Desk Stay Management — Phase 5.
 * Core rules:
 * 1. Check-in assigns an AVAILABLE room and creates an ACTIVE Stay.
 * 2. Room status transitions to OCCUPIED.
 * 3. Initial Folio is created with room charge items if not already present.
 * 4. Room Change: old room becomes DIRTY, new room becomes OCCUPIED, assignment history logged.
 * 5. Stay Extension: validates future availability before extending expected check-out.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  StayStatus,
  RoomStatus,
  ReservationStatus,
  FolioStatus,
  FolioItemType,
  HousekeepingTaskStatus,
} from "@prisma/client";
import { getStayDates } from "@/features/availability/service";
import { getHotelSettings } from "@/features/settings/service";
import { generateInvoice } from "@/features/invoices/service";

// ─── Schemas ──────────────────────────────────────────────────

export const checkInSchema = z.object({
  reservationId: z.string().min(1, "ID reservasi wajib diisi"),
  reservationItemId: z.string().min(1, "Item reservasi wajib dipilih"),
  roomId: z.string().min(1, "Kamar wajib dipilih"),
  guestId: z.string().optional(),
});

export const changeRoomSchema = z.object({
  newRoomId: z.string().min(1, "Kamar baru wajib dipilih"),
  reason: z.string().max(300).optional(),
});

export const extendStaySchema = z.object({
  newCheckOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type ChangeRoomInput = z.infer<typeof changeRoomSchema>;
export type ExtendStayInput = z.infer<typeof extendStaySchema>;

// ─── Services ─────────────────────────────────────────────────

export async function processCheckIn(input: CheckInInput, staffUserId?: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch Reservation
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: {
        items: {
          include: {
            roomType: true,
            nightsDetail: { orderBy: { stayDate: "asc" } },
          },
        },
        guest: true,
      },
    });

    if (!reservation) throw new NotFoundError("Reservasi tidak ditemukan");
    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.CHECKED_IN
    ) {
      throw new ConflictError(
        `Reservasi dengan status '${reservation.status}' tidak dapat di-check-in`,
      );
    }

    const item = reservation.items.find((it) => it.id === input.reservationItemId);
    if (!item) throw new NotFoundError("Item kamar reservasi tidak ditemukan");

    // 2. Validate Physical Room
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
      include: { roomType: true },
    });

    if (!room) throw new NotFoundError("Kamar fisik tidak ditemukan");
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new ConflictError(
        `Kamar nomor ${room.roomNumber} saat ini berstatus '${room.status}' (tidak dapat di-check-in)`,
      );
    }

    const guestId = input.guestId || reservation.guestId;

    // 3. Update Room Status to OCCUPIED
    await tx.room.update({
      where: { id: room.id },
      data: { status: RoomStatus.OCCUPIED },
    });

    // 4. Record Room Assignment
    await tx.reservationRoomAssignment.create({
      data: {
        reservationId: reservation.id,
        reservationItemId: item.id,
        roomId: room.id,
        assignedById: staffUserId || null,
      },
    });

    // 5. Record Assignment History
    await tx.roomAssignmentHistory.create({
      data: {
        roomId: room.id,
        reservationId: reservation.id,
        guestId,
        assignedAt: new Date(),
        notes: `Check-in reservasi ${reservation.bookingReference}`,
      },
    });

    // 6. Create Active Stay
    const stay = await tx.stay.create({
      data: {
        reservationId: reservation.id,
        reservationItemId: item.id,
        guestId,
        roomId: room.id,
        checkedInAt: new Date(),
        checkedInById: staffUserId || null,
        expectedCheckOut: reservation.checkOut,
        status: StayStatus.ACTIVE,
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        reservation: true,
      },
    });

    // 7. Update Reservation Status
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CHECKED_IN },
    });

    // 8. Ensure Folio Exists & Populate Initial Room Charges
    let folio = await tx.folio.findUnique({ where: { reservationId: reservation.id } });
    if (!folio) {
      folio = await tx.folio.create({
        data: {
          reservationId: reservation.id,
          status: FolioStatus.OPEN,
          currency: "IDR",
          subtotal: reservation.subtotal,
          taxAmount: reservation.taxAmount,
          serviceCharge: reservation.serviceCharge,
          discountAmount: reservation.discountAmount,
          totalAmount: reservation.totalAmount,
          balanceAmount: reservation.totalAmount,
        },
      });

      // Populate room charge items from nightly snapshots
      for (const it of reservation.items) {
        for (const night of it.nightsDetail) {
          await tx.folioItem.create({
            data: {
              folioId: folio.id,
              type: FolioItemType.ROOM_CHARGE,
              category: "ROOM_CHARGE",
              description: `Sewa Kamar: ${it.roomType.name} (${night.stayDate.toISOString().split("T")[0]})`,
              quantity: 1,
              unitPrice: night.roomRate,
              subtotal: night.roomRate,
              stayDate: night.stayDate,
            },
          });
        }
      }
    }

    return stay;
  });
}

// ─── Room Change / Upgrade ────────────────────────────────────

export async function changeRoom(
  stayId: string,
  input: ChangeRoomInput,
  staffUserId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const stay = await tx.stay.findUnique({
      where: { id: stayId },
      include: {
        room: true,
        reservation: true,
      },
    });

    if (!stay) throw new NotFoundError("Data stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictError("Hanya tamu dengan status menginap ACTIVE yang dapat pindah kamar");
    }

    if (stay.roomId === input.newRoomId) {
      throw new ConflictError("Kamar baru tidak boleh sama dengan kamar saat ini");
    }

    // Validate new room
    const newRoom = await tx.room.findUnique({
      where: { id: input.newRoomId },
      include: { roomType: true },
    });

    if (!newRoom) throw new NotFoundError("Kamar tujuan tidak ditemukan");
    if (newRoom.status !== RoomStatus.AVAILABLE) {
      throw new ConflictError(
        `Kamar nomor ${newRoom.roomNumber} sedang berstatus '${newRoom.status}', tidak tersedia`,
      );
    }

    const oldRoom = stay.room;

    // 1. Old room becomes DIRTY
    await tx.room.update({
      where: { id: oldRoom.id },
      data: { status: RoomStatus.DIRTY },
    });

    // 2. New room becomes OCCUPIED
    await tx.room.update({
      where: { id: newRoom.id },
      data: { status: RoomStatus.OCCUPIED },
    });

    // 3. Release previous assignment
    const prevAssignment = await tx.reservationRoomAssignment.findFirst({
      where: {
        reservationId: stay.reservationId,
        roomId: oldRoom.id,
        releasedAt: null,
      },
    });

    if (prevAssignment) {
      await tx.reservationRoomAssignment.update({
        where: { id: prevAssignment.id },
        data: { releasedAt: new Date() },
      });
    }

    // 4. Create new assignment
    await tx.reservationRoomAssignment.create({
      data: {
        reservationId: stay.reservationId,
        reservationItemId: stay.reservationItemId,
        roomId: newRoom.id,
        assignedById: staffUserId || null,
      },
    });

    // 5. Update Stay.roomId
    const updatedStay = await tx.stay.update({
      where: { id: stayId },
      data: { roomId: newRoom.id },
      include: { room: true, guest: true },
    });

    // 6. Record RoomAssignmentHistory for old & new
    await tx.roomAssignmentHistory.create({
      data: {
        roomId: oldRoom.id,
        reservationId: stay.reservationId,
        guestId: stay.guestId,
        assignedAt: stay.checkedInAt,
        releasedAt: new Date(),
        notes: `Pindah kamar ke ${newRoom.roomNumber}: ${input.reason || "Alasan operasional"}`,
      },
    });

    // 7. Log change in reservation
    await tx.reservationChangeLog.create({
      data: {
        reservationId: stay.reservationId,
        changedById: staffUserId || null,
        changeType: "ROOM_CHANGE",
        previousData: { roomId: oldRoom.id, roomNumber: oldRoom.roomNumber },
        newData: { roomId: newRoom.id, roomNumber: newRoom.roomNumber },
        notes: input.reason || "Pindah kamar",
      },
    });

    return updatedStay;
  });
}

// ─── Extend Stay ──────────────────────────────────────────────

export async function extendStay(
  stayId: string,
  input: ExtendStayInput,
  staffUserId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const stay = await tx.stay.findUnique({
      where: { id: stayId },
      include: {
        room: { include: { roomType: true } },
        reservation: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!stay) throw new NotFoundError("Data stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictError("Hanya stay berstatus ACTIVE yang dapat diperpanjang");
    }

    const currentOut = stay.expectedCheckOut;
    const newOut = new Date(input.newCheckOut);

    if (newOut <= currentOut) {
      throw new ConflictError("Tanggal perpanjangan harus lebih lama dari tanggal check-out saat ini");
    }

    // Check future overlapping reservation on this physical room
    const futureOverlap = await tx.reservationRoomAssignment.findFirst({
      where: {
        roomId: stay.roomId,
        reservationId: { not: stay.reservationId },
        releasedAt: null,
        reservation: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PAYMENT] },
          checkIn: { lt: newOut },
          checkOut: { gt: currentOut },
        },
      },
    });

    if (futureOverlap) {
      throw new ConflictError("Kamar ini sudah memiliki reservasi terjadwal pada tanggal perpanjangan tersebut");
    }

    // Calculate additional dates
    const currentOutStr = currentOut.toISOString().split("T")[0];
    const additionalDates = getStayDates(currentOutStr, input.newCheckOut);

    const settings = await getHotelSettings();
    const taxPercent = Number(settings?.taxPercent || 0);
    const serviceChargePercent = Number(settings?.serviceChargePercent || 0);

    // Calculate rates for extra nights
    const item = stay.reservation.items.find((it) => it.id === stay.reservationItemId);
    const basePrice = Number(stay.room.roomType.basePrice);

    let additionalSubtotal = 0;
    const newNights = [];

    for (const dStr of additionalDates) {
      const stayDate = new Date(dStr);
      // Fetch custom rate if exists
      const cr = await tx.roomRate.findFirst({
        where: {
          roomTypeId: stay.room.roomTypeId,
          stayDate,
        },
      });

      const rate = cr ? Number(cr.price) : basePrice;
      const tax = Math.round(rate * (taxPercent / 100));

      additionalSubtotal += rate;
      newNights.push({
        reservationItemId: stay.reservationItemId,
        stayDate,
        roomRate: rate,
        taxAmount: tax,
        subtotal: rate,
      });
    }

    // 1. Insert new snapshot nights
    if (item && newNights.length > 0) {
      for (const nn of newNights) {
        await tx.reservationItemNight.create({ data: nn });
      }

      await tx.reservationItem.update({
        where: { id: item.id },
        data: {
          nights: item.nights + additionalDates.length,
          subtotal: Number(item.subtotal) + additionalSubtotal,
        },
      });
    }

    // 2. Update Reservation Financials & checkOut
    const addTax = Math.round(additionalSubtotal * (taxPercent / 100));
    const addService = Math.round(additionalSubtotal * (serviceChargePercent / 100));
    const addTotal = additionalSubtotal + addTax + addService;

    await tx.reservation.update({
      where: { id: stay.reservationId },
      data: {
        checkOut: newOut,
        subtotal: Number(stay.reservation.subtotal) + additionalSubtotal,
        taxAmount: Number(stay.reservation.taxAmount) + addTax,
        serviceCharge: Number(stay.reservation.serviceCharge) + addService,
        totalAmount: Number(stay.reservation.totalAmount) + addTotal,
      },
    });

    // 3. Update Stay expectedCheckOut
    const updatedStay = await tx.stay.update({
      where: { id: stayId },
      data: { expectedCheckOut: newOut },
      include: { room: true, guest: true },
    });

    // 4. Update Folio
    const folio = await tx.folio.findUnique({ where: { reservationId: stay.reservationId } });
    if (folio) {
      await tx.folio.update({
        where: { id: folio.id },
        data: {
          subtotal: Number(folio.subtotal) + additionalSubtotal,
          taxAmount: Number(folio.taxAmount) + addTax,
          serviceCharge: Number(folio.serviceCharge) + addService,
          totalAmount: Number(folio.totalAmount) + addTotal,
          balanceAmount: Number(folio.balanceAmount) + addTotal,
        },
      });

      // Add extra room charge folio items
      for (const nn of newNights) {
        await tx.folioItem.create({
          data: {
            folioId: folio.id,
            type: FolioItemType.ROOM_CHARGE,
            category: "ROOM_CHARGE",
            description: `Perpanjangan Sewa Kamar: ${stay.room.roomType.name} (${nn.stayDate.toISOString().split("T")[0]})`,
            quantity: 1,
            unitPrice: nn.roomRate,
            subtotal: nn.roomRate,
            stayDate: nn.stayDate,
          },
        });
      }
    }

    // 5. Change log
    await tx.reservationChangeLog.create({
      data: {
        reservationId: stay.reservationId,
        changedById: staffUserId || null,
        changeType: "STAY_EXTENSION",
        previousData: { checkOut: currentOut },
        newData: { checkOut: newOut, additionalTotal: addTotal },
        notes: `Perpanjangan menginap hingga ${input.newCheckOut}`,
      },
    });

    return updatedStay;
  });
}

// ─── Query Stays ──────────────────────────────────────────────

export async function listStays(opts: {
  status?: StayStatus;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;

  if (opts.search && opts.search.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { room: { roomNumber: { contains: q, mode: "insensitive" } } },
      { guest: { firstName: { contains: q, mode: "insensitive" } } },
      { guest: { lastName: { contains: q, mode: "insensitive" } } },
      { reservation: { bookingReference: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.stay.findMany({
      where,
      include: {
        room: { include: { roomType: true } },
        guest: true,
        reservation: true,
      },
      orderBy: { checkedInAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stay.count({ where }),
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

export async function getStay(id: string) {
  const stay = await prisma.stay.findUnique({
    where: { id },
    include: {
      room: { include: { roomType: true } },
      guest: true,
      reservation: {
        include: {
          folio: {
            include: {
              items: { orderBy: { createdAt: "asc" } },
              payments: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
    },
  });

  if (!stay) throw new NotFoundError("Data stay tidak ditemukan");
  return stay;
}

export const checkOutSchema = z.object({
  stayId: z.string().min(1, "ID stay wajib diisi"),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export async function processCheckOut(stayId: string, staffUserId?: string) {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: {
      room: true,
      reservation: {
        include: {
          folio: true,
          stays: true,
        },
      },
    },
  });

  if (!stay) throw new NotFoundError("Data stay tidak ditemukan");
  if (stay.status !== StayStatus.ACTIVE) {
    throw new ConflictError("Stay ini sudah tidak aktif (sudah checkout sebelumnya)");
  }

  const settings = await getHotelSettings();
  const folio = stay.reservation.folio;

  // Validate balance
  if (folio && Number(folio.balanceAmount) > 0) {
    if (!settings?.allowOutstandingCheckout) {
      throw new ConflictError(
        `Checkout ditolak: Masih terdapat sisa tagihan sebesar Rp ${Number(folio.balanceAmount).toLocaleString("id-ID")} yang belum diselesaikan. Lunasi tagihan atau ubah pengaturan checkout outstanding.`,
      );
    }
  }

  const checkOutResult = await prisma.$transaction(async (tx) => {
    // 1. Close stay
    const closedStay = await tx.stay.update({
      where: { id: stayId },
      data: {
        actualCheckOut: new Date(),
        status: StayStatus.CHECKED_OUT,
      },
    });

    // 2. Set room to DIRTY
    await tx.room.update({
      where: { id: stay.roomId },
      data: { status: RoomStatus.DIRTY },
    });

    // 3. Create Housekeeping task
    await tx.housekeepingTask.create({
      data: {
        roomId: stay.roomId,
        status: HousekeepingTaskStatus.PENDING,
        createdById: staffUserId || null,
        notes: `Checkout cleaning kamar ${stay.room.roomNumber}`,
      },
    });

    // 4. Release room assignment
    const assignment = await tx.reservationRoomAssignment.findFirst({
      where: {
        reservationId: stay.reservationId,
        roomId: stay.roomId,
        releasedAt: null,
      },
    });
    if (assignment) {
      await tx.reservationRoomAssignment.update({
        where: { id: assignment.id },
        data: { releasedAt: new Date() },
      });
    }

    // 5. Check if all stays for this reservation are checked out
    const remainingActiveStays = await tx.stay.count({
      where: {
        reservationId: stay.reservationId,
        id: { not: stayId },
        status: StayStatus.ACTIVE,
      },
    });

    if (remainingActiveStays === 0) {
      await tx.reservation.update({
        where: { id: stay.reservationId },
        data: { status: ReservationStatus.CHECKED_OUT },
      });

      if (folio) {
        await tx.folio.update({
          where: { id: folio.id },
          data: {
            status: FolioStatus.CLOSED,
            closedAt: new Date(),
          },
        });
      }
    }

    return closedStay;
  });

  // 6. Generate invoice if configured
  if (folio && settings?.generateInvoiceOnCheckout) {
    try {
      await generateInvoice(folio.id);
    } catch {
      // Ignore invoice generation failure if already generated
    }
  }

  return checkOutResult;
}

