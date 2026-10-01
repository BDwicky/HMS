/**
 * @file src/features/notifications/service.ts
 * Email & Notification Service — Phase 9.
 * Handles dispatching and persistence of guest and internal notifications.
 */

import { prisma } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";
import { formatRupiah } from "@/lib/utils/currency";

export interface SendNotificationInput {
  type: NotificationType;
  recipient: string; // guest email or user id
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export async function sendNotification(input: SendNotificationInput) {
  // 1. Create notification record
  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  try {
    // 2. Dispatch simulated / provider email transport
    // In production, integrate Resend, SendGrid, or nodemailer here.
    // In dev/test environment, log and mark as delivered.
    console.log(`[Notification/Email] Sent to: ${input.recipient} | Subject: "${input.subject}"`);

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });

    return updated;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Delivery failure";
    console.error(`[Notification/Email] Failed delivery to ${input.recipient}:`, err);

    return await prisma.notification.update({
      where: { id: notification.id },
      data: { failedAt: new Date(), error: errorMsg },
    });
  }
}

/**
 * Dispatch booking confirmation email to guest.
 */
export async function sendBookingConfirmationEmail(params: {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  roomTypeName: string;
  totalAmount: number;
}) {
  const subject = `Konfirmasi Reservasi Hotel [${params.bookingReference}]`;
  const body = `Halo ${params.guestName},

Terima kasih atas reservasi Anda di hotel kami.
Detail Pemesanan:
- Nomor Referensi: ${params.bookingReference}
- Tipe Kamar: ${params.roomTypeName}
- Tanggal Check-in: ${params.checkIn} (mulai pukul 14:00 WIB)
- Tanggal Check-out: ${params.checkOut} (maksimal pukul 12:00 WIB)
- Total Biaya: ${formatRupiah(params.totalAmount)}

Tunjukkan nomor referensi ini saat tiba di resepsionis.
Kami menantikan kedatangan Anda!`;

  return sendNotification({
    type: NotificationType.BOOKING_CONFIRMATION,
    recipient: params.guestEmail,
    subject,
    body,
    metadata: {
      bookingReference: params.bookingReference,
      totalAmount: params.totalAmount,
    },
  });
}

/**
 * Dispatch payment receipt notification.
 */
export async function sendPaymentReceiptEmail(params: {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  paymentMethod: string;
  amount: number;
  paidAt: string;
}) {
  const subject = `Bukti Pembayaran Reservasi [${params.bookingReference}]`;
  const body = `Halo ${params.guestName},

Pembayaran Anda telah berhasil kami terima.
- Referensi Booking: ${params.bookingReference}
- Jumlah: ${formatRupiah(params.amount)}
- Metode: ${params.paymentMethod}
- Waktu: ${params.paidAt}

Terima kasih atas kepercayaan Anda.`;

  return sendNotification({
    type: NotificationType.PAYMENT_RECEIVED,
    recipient: params.guestEmail,
    subject,
    body,
    metadata: {
      bookingReference: params.bookingReference,
      amount: params.amount,
      method: params.paymentMethod,
    },
  });
}

/**
 * Dispatch pre-arrival reminder email.
 */
export async function sendPreArrivalReminderEmail(params: {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
}) {
  const subject = `Pengingat Kedatangan Menginap Besok [${params.bookingReference}]`;
  const body = `Halo ${params.guestName},

Kami mengingatkan jadwal menginap Anda besok pada tanggal ${params.checkIn}.
Waktu check-in standar dimulai pukul 14:00 WIB.
Mohon siapkan kartu identitas asli (KTP / Paspor) saat proses registrasi di front desk.

Sampai jumpa besok!`;

  return sendNotification({
    type: NotificationType.PRE_ARRIVAL,
    recipient: params.guestEmail,
    subject,
    body,
    metadata: {
      bookingReference: params.bookingReference,
      checkIn: params.checkIn,
    },
  });
}

/**
 * List recent notifications.
 */
export async function listNotifications(opts: {
  recipient?: string;
  type?: NotificationType;
  limit?: number;
} = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const where: Prisma.NotificationWhereInput = {};
  if (opts.recipient) where.recipient = opts.recipient;
  if (opts.type) where.type = opts.type;

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
