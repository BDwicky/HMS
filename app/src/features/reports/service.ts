/**
 * @file src/features/reports/service.ts
 * Hotel Reports & Operational Analytics — Phase 8.
 * Calculations:
 * - Occupancy Rate: (Occupied Rooms / Total Rooms) * 100%
 * - ADR (Average Daily Rate): Total Room Revenue / Rooms Sold
 * - RevPAR (Revenue Per Available Room): Total Room Revenue / Total Available Room-Nights
 */

import { prisma } from "@/lib/db";
import {
  ReservationStatus,
  StayStatus,
  PaymentStatus,
  RefundStatus,
  HousekeepingTaskStatus,
  MaintenanceStatus,
} from "@prisma/client";

export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Helper to generate an array of YYYY-MM-DD date strings between start and end inclusive.
 */
export function getDateArray(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Occupancy Report
 */
export async function getOccupancyReport(filter: DateRangeFilter) {
  const dates = getDateArray(filter.startDate, filter.endDate);
  const totalRooms = await prisma.room.count();

  // Find all active reservations that overlap with the date range
  const reservations = await prisma.reservation.findMany({
    where: {
      status: {
        in: [
          ReservationStatus.CONFIRMED,
          ReservationStatus.CHECKED_IN,
          ReservationStatus.CHECKED_OUT,
        ],
      },
      checkIn: { lte: new Date(`${filter.endDate}T23:59:59Z`) },
      checkOut: { gt: new Date(`${filter.startDate}T00:00:00Z`) },
    },
    include: {
      items: true,
    },
  });

  const dailyStats = dates.map((dateStr) => {
    const curDate = new Date(`${dateStr}T00:00:00Z`);

    // Sum of rooms occupied on this date [checkIn, checkOut)
    let occupiedRooms = 0;
    for (const res of reservations) {
      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);

      if (curDate >= checkIn && curDate < checkOut) {
        occupiedRooms += res.items.length || 1;
      }
    }

    const availableRooms = Math.max(0, totalRooms - occupiedRooms);
    const occupancyRate =
      totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0;

    return {
      date: dateStr,
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate,
    };
  });

  const totalNightsSold = dailyStats.reduce((sum, d) => sum + d.occupiedRooms, 0);
  const totalCapacity = totalRooms * dates.length;
  const averageOccupancy =
    totalCapacity > 0 ? Number(((totalNightsSold / totalCapacity) * 100).toFixed(2)) : 0;

  return {
    filter,
    totalRooms,
    totalDays: dates.length,
    totalNightsSold,
    averageOccupancy,
    dailyStats,
  };
}

/**
 * Revenue Report (ADR, RevPAR, Room Rev, Extra Rev, Net Payments)
 */
export async function getRevenueReport(filter: DateRangeFilter) {
  const start = new Date(`${filter.startDate}T00:00:00Z`);
  const end = new Date(`${filter.endDate}T23:59:59Z`);
  const dates = getDateArray(filter.startDate, filter.endDate);
  const totalRooms = await prisma.room.count();

  // 1. Room Revenue from nightly snapshots in period
  const nightlySnapshots = await prisma.reservationItemNight.findMany({
    where: {
      stayDate: {
        gte: new Date(filter.startDate),
        lte: new Date(filter.endDate),
      },
      reservationItem: {
        reservation: {
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
          },
        },
      },
    },
  });

  const totalRoomRevenue = nightlySnapshots.reduce(
    (sum, n) => sum + Number(n.roomRate),
    0,
  );
  const totalRoomsSold = nightlySnapshots.length;

  // 2. Extra charges from Folio items in period
  const extraItems = await prisma.folioItem.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      type: "ADDITIONAL_CHARGE",
    },
  });
  const totalExtraRevenue = extraItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

  // 3. Gross revenue
  const grossRevenue = totalRoomRevenue + totalExtraRevenue;

  // 4. Payments collected
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      status: PaymentStatus.PAID,
    },
  });
  const totalPaymentsCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // 5. Refunds issued
  const refunds = await prisma.refund.findMany({
    where: {
      refundedAt: { gte: start, lte: end },
      status: RefundStatus.SUCCESS,
    },
  });
  const totalRefundsIssued = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

  const netPayments = totalPaymentsCollected - totalRefundsIssued;

  // 6. Metrics: ADR & RevPAR
  const adr = totalRoomsSold > 0 ? Math.round(totalRoomRevenue / totalRoomsSold) : 0;
  const totalAvailableNights = totalRooms * dates.length;
  const revPar =
    totalAvailableNights > 0 ? Math.round(totalRoomRevenue / totalAvailableNights) : 0;

  return {
    filter,
    totalRooms,
    totalDays: dates.length,
    totalRoomsSold,
    totalRoomRevenue,
    totalExtraRevenue,
    grossRevenue,
    totalPaymentsCollected,
    totalRefundsIssued,
    netPayments,
    adr,
    revPar,
  };
}

/**
 * Reservation Statistics Report
 */
export async function getReservationReport(filter: DateRangeFilter) {
  const start = new Date(`${filter.startDate}T00:00:00Z`);
  const end = new Date(`${filter.endDate}T23:59:59Z`);

  const reservations = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    include: {
      items: true,
    },
  });

  const total = reservations.length;

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalNights = 0;

  for (const res of reservations) {
    byStatus[res.status] = (byStatus[res.status] || 0) + 1;
    bySource[res.source] = (bySource[res.source] || 0) + 1;

    const diffDays = Math.max(
      1,
      Math.round(
        (new Date(res.checkOut).getTime() - new Date(res.checkIn).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    totalNights += diffDays;
  }

  const averageLengthOfStay = total > 0 ? Number((totalNights / total).toFixed(1)) : 0;
  const cancelledCount = byStatus[ReservationStatus.CANCELLED] || 0;
  const noShowCount = byStatus[ReservationStatus.NO_SHOW] || 0;

  const cancellationRate =
    total > 0 ? Number(((cancelledCount / total) * 100).toFixed(2)) : 0;
  const noShowRate =
    total > 0 ? Number(((noShowCount / total) * 100).toFixed(2)) : 0;

  return {
    filter,
    total,
    totalNights,
    averageLengthOfStay,
    cancellationRate,
    noShowRate,
    byStatus,
    bySource,
  };
}

/**
 * Payment Methods & Financial Settlement Report
 */
export async function getPaymentReport(filter: DateRangeFilter) {
  const start = new Date(`${filter.startDate}T00:00:00Z`);
  const end = new Date(`${filter.endDate}T23:59:59Z`);

  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      status: PaymentStatus.PAID,
    },
  });

  const refunds = await prisma.refund.findMany({
    where: {
      refundedAt: { gte: start, lte: end },
      status: RefundStatus.SUCCESS,
    },
  });

  const byMethod: Record<string, { count: number; total: number }> = {};
  let totalCollected = 0;

  for (const p of payments) {
    const amt = Number(p.amount);
    totalCollected += amt;
    if (!byMethod[p.method]) {
      byMethod[p.method] = { count: 0, total: 0 };
    }
    byMethod[p.method].count += 1;
    byMethod[p.method].total += amt;
  }

  const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const netRevenue = totalCollected - totalRefunded;

  return {
    filter,
    totalTransactions: payments.length,
    totalCollected,
    totalRefunded,
    netRevenue,
    byMethod,
  };
}

/**
 * Real-time Front Desk & Operational Dashboard KPIs
 */
export async function getDashboardKPIs() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfToday = new Date(`${todayStr}T00:00:00Z`);
  const endOfToday = new Date(`${todayStr}T23:59:59Z`);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // 1. Rooms breakdown
  const rooms = await prisma.room.findMany({
    select: { status: true },
  });

  const roomStatusCounts: Record<string, number> = {};
  for (const r of rooms) {
    roomStatusCounts[r.status] = (roomStatusCounts[r.status] || 0) + 1;
  }

  const totalRooms = rooms.length;
  const occupiedRooms = roomStatusCounts["OCCUPIED"] || 0;
  const currentOccupancyRate =
    totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;

  // 2. Arrivals today
  const todayArrivals = await prisma.reservation.count({
    where: {
      checkIn: { gte: startOfToday, lte: endOfToday },
      status: {
        in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PAYMENT],
      },
    },
  });

  // 3. Departures today
  const todayDepartures = await prisma.stay.count({
    where: {
      expectedCheckOut: { gte: startOfToday, lte: endOfToday },
      status: StayStatus.ACTIVE,
    },
  });

  // 4. In-house guests
  const inHouseStays = await prisma.stay.count({
    where: {
      status: StayStatus.ACTIVE,
    },
  });

  // 5. Pending housekeeping tasks
  const pendingHousekeeping = await prisma.housekeepingTask.count({
    where: {
      status: {
        in: [
          HousekeepingTaskStatus.PENDING,
          HousekeepingTaskStatus.IN_PROGRESS,
          HousekeepingTaskStatus.FAILED_INSPECTION,
        ],
      },
    },
  });

  // 6. Open maintenance requests
  const openMaintenance = await prisma.maintenanceRequest.count({
    where: {
      status: {
        in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS],
      },
    },
  });

  // 7. Today revenue
  const todayPayments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: startOfToday, lte: endOfToday },
      status: PaymentStatus.PAID,
    },
    select: { amount: true },
  });
  const todayRevenue = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // 8. Month to date revenue
  const monthPayments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: startOfMonth, lte: endOfToday },
      status: PaymentStatus.PAID,
    },
    select: { amount: true },
  });
  const monthRevenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    today: todayStr,
    totalRooms,
    roomStatusCounts,
    currentOccupancyRate,
    todayArrivals,
    todayDepartures,
    inHouseStays,
    pendingHousekeeping,
    openMaintenance,
    todayRevenue,
    monthRevenue,
  };
}
