/**
 * @file src/features/scheduler/service.ts
 * Background Scheduler & Automation Engine — Phase 9.
 * Rules:
 * - Payment Expiration: Automatically expire PENDING_PAYMENT reservations past payment window.
 * - No-Show Automation: Mark CONFIRMED reservations as NO_SHOW after check-in date cutoff.
 */

import { prisma } from "@/lib/db";
import { ReservationStatus, NotificationType } from "@prisma/client";
import { markNoShow } from "@/features/reservations/service";
import { recordAuditLog } from "@/features/audit/service";
import { sendNotification } from "@/features/notifications/service";

export interface ExpireReservationsResult {
  expiredCount: number;
  expiredIds: string[];
}

export interface ProcessNoShowsResult {
  processedCount: number;
  processedIds: string[];
}

/**
 * Expire pending reservations whose payment window has elapsed.
 * Default timeout: 120 minutes (2 hours).
 */
export async function expirePendingReservations(
  timeoutMinutes: number = 120,
): Promise<ExpireReservationsResult> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // Find all pending reservations created before the cutoff
  const pendingReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING_PAYMENT,
      createdAt: { lte: cutoff },
    },
    include: {
      guest: true,
    },
  });

  const expiredIds: string[] = [];

  for (const res of pendingReservations) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      await tx.reservationChangeLog.create({
        data: {
          reservationId: res.id,
          changeType: "STATUS_CHANGE",
          previousData: { status: res.status },
          newData: { status: ReservationStatus.EXPIRED },
          notes: `Kedaluwarsa otomatis: Pembayaran tidak diselesaikan dalam ${timeoutMinutes} menit`,
        },
      });
    });

    // Record audit log
    await recordAuditLog({
      action: "reservation.auto_expire",
      resourceType: "Reservation",
      resourceId: res.id,
      previousData: { status: res.status },
      newData: { status: ReservationStatus.EXPIRED },
    });

    // Notify guest if email present
    if (res.guest?.email) {
      await sendNotification({
        type: NotificationType.INTERNAL,
        recipient: res.guest.email,
        subject: `Reservasi Kedaluwarsa [${res.bookingReference}]`,
        body: `Halo ${res.guest.firstName},\n\nBatas waktu pembayaran untuk reservasi ${res.bookingReference} telah berakhir dan pemesanan otomatis dibatalkan.\n\nSilakan lakukan reservasi baru jika Anda masih ingin menginap.`,
      });
    }

    expiredIds.push(res.id);
  }

  return {
    expiredCount: expiredIds.length,
    expiredIds,
  };
}

/**
 * Process automated No-Shows for reservations where check-in date has passed.
 */
export async function processAutomatedNoShows(): Promise<ProcessNoShowsResult> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfToday = new Date(`${todayStr}T00:00:00Z`);

  // Confirmed reservations with check-in date strictly earlier than today
  const overdueReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.CONFIRMED,
      checkIn: { lt: startOfToday },
    },
    include: {
      guest: true,
    },
  });

  const processedIds: string[] = [];

  for (const res of overdueReservations) {
    try {
      await markNoShow(res.id, undefined);

      await recordAuditLog({
        action: "reservation.auto_no_show",
        resourceType: "Reservation",
        resourceId: res.id,
        previousData: { status: res.status },
        newData: { status: ReservationStatus.NO_SHOW },
      });

      if (res.guest?.email) {
        await sendNotification({
          type: NotificationType.NO_SHOW_PROCESSED,
          recipient: res.guest.email,
          subject: `Status No-Show Reservasi [${res.bookingReference}]`,
          body: `Halo ${res.guest.firstName},\n\nAnda tercatat tidak hadir pada tanggal check-in untuk reservasi ${res.bookingReference}. Status reservasi telah dialihkan menjadi No-Show sesuai kebijakan hotel.`,
        });
      }

      processedIds.push(res.id);
    } catch (err) {
      console.error(`[Scheduler] Failed to process no-show for reservation ${res.id}:`, err);
    }
  }

  return {
    processedCount: processedIds.length,
    processedIds,
  };
}
