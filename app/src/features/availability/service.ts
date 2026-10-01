/**
 * @file src/features/availability/service.ts
 * Availability Engine — Phase 3.
 * Core rules:
 * 1. Stay interval is [check_in, check_out). Check-out date is exclusive.
 * 2. Overlap formula: r.checkIn < checkOut AND r.checkOut > checkIn
 * 3. Physical rooms in MAINTENANCE or OUT_OF_SERVICE are excluded.
 * 4. Active reservations (CONFIRMED, CHECKED_IN, and unexpired PENDING_PAYMENT) count toward booked inventory.
 * 5. Returns real-time available quantities and nightly pricing per rate plan.
 */

import { prisma } from "@/lib/db";
import { z } from "zod";
import { RoomStatus, ReservationStatus } from "@prisma/client";

export const availabilityQuerySchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format check-in: YYYY-MM-DD"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format check-out: YYYY-MM-DD"),
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
    roomTypeId: z.string().optional(),
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
  );

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

export interface NightlyPrice {
  date: string;
  price: number;
}

export interface AvailableRatePlan {
  ratePlanId: string;
  ratePlanCode: string;
  ratePlanName: string;
  isRefundable: boolean;
  includesBreakfast: boolean;
  totalPrice: number;
  averageNightlyPrice: number;
  nightlyBreakdown: NightlyPrice[];
}

export interface AvailableRoomTypeResult {
  roomTypeId: string;
  roomTypeCode: string;
  name: string;
  description: string | null;
  maxOccupancy: number;
  basePrice: number;
  amenities: string[];
  imageUrls: string[];
  totalRooms: number;
  maintenanceRooms: number;
  bookedRooms: number;
  availableRooms: number;
  ratePlans: AvailableRatePlan[];
}

/**
 * Checks interval overlap: [startA, endA) overlaps with [startB, endB)
 */
export function isDateRangeOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Generates an array of individual dates [checkIn, checkOut)
 */
export function getStayDates(checkInStr: string, checkOutStr: string): string[] {
  const dates: string[] = [];
  const cur = new Date(checkInStr);
  const end = new Date(checkOutStr);

  while (cur < end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function checkAvailability(
  input: AvailabilityQueryInput,
): Promise<AvailableRoomTypeResult[]> {
  const checkInDate = new Date(input.checkIn);
  const checkOutDate = new Date(input.checkOut);
  const stayDates = getStayDates(input.checkIn, input.checkOut);
  const nightsCount = stayDates.length;

  // 1. Fetch Room Types (matching requested ID and occupancy)
  const totalGuests = input.adults + input.children;
  const roomTypes = await prisma.roomType.findMany({
    where: {
      isActive: true,
      ...(input.roomTypeId ? { id: input.roomTypeId } : {}),
      maxOccupancy: { gte: totalGuests },
    },
    include: {
      rooms: {
        where: { isActive: true },
      },
    },
    orderBy: { basePrice: "asc" },
  });

  if (roomTypes.length === 0) {
    return [];
  }

  // 2. Fetch Active Rate Plans
  const ratePlans = await prisma.ratePlan.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // 3. Fetch overlapping reservations
  // Reservation overlap: checkIn < requestedCheckOut AND checkOut > requestedCheckIn
  const activeReservationStatuses: ReservationStatus[] = [
    ReservationStatus.CONFIRMED,
    ReservationStatus.CHECKED_IN,
    ReservationStatus.PENDING_PAYMENT,
  ];

  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      status: { in: activeReservationStatuses },
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
    },
    include: {
      items: true,
    },
  });

  // 4. Fetch RoomRates for the period to calculate exact pricing
  const roomRates = await prisma.roomRate.findMany({
    where: {
      roomTypeId: { in: roomTypes.map((rt) => rt.id) },
      ratePlanId: { in: ratePlans.map((rp) => rp.id) },
      stayDate: {
        gte: checkInDate,
        lt: checkOutDate,
      },
    },
  });

  // Map room rates for O(1) lookup: `${roomTypeId}_${ratePlanId}_${YYYY-MM-DD}`
  const rateLookup = new Map<string, number>();
  for (const rr of roomRates) {
    const dStr = rr.stayDate.toISOString().split("T")[0];
    rateLookup.set(`${rr.roomTypeId}_${rr.ratePlanId}_${dStr}`, Number(rr.price));
  }

  // 5. Calculate availability and pricing for each Room Type
  const results: AvailableRoomTypeResult[] = [];

  for (const rt of roomTypes) {
    const totalPhysical = rt.rooms.length;

    // Maintenance / Out of service rooms are excluded from available count
    const maintenanceCount = rt.rooms.filter(
      (r) => r.status === RoomStatus.MAINTENANCE || r.status === RoomStatus.OUT_OF_SERVICE,
    ).length;

    // Count booked rooms from overlapping reservations
    let bookedCount = 0;
    for (const res of overlappingReservations) {
      for (const item of res.items) {
        if (item.roomTypeId === rt.id) {
          bookedCount += item.quantity;
        }
      }
    }

    const availableCount = Math.max(0, totalPhysical - maintenanceCount - bookedCount);

    // Calculate pricing for each rate plan
    const availablePlans: AvailableRatePlan[] = ratePlans.map((rp) => {
      let total = 0;
      const nightlyBreakdown: NightlyPrice[] = [];

      for (const dStr of stayDates) {
        const customRate = rateLookup.get(`${rt.id}_${rp.id}_${dStr}`);
        const nightPrice = customRate !== undefined ? customRate : Number(rt.basePrice);
        nightlyBreakdown.push({ date: dStr, price: nightPrice });
        total += nightPrice;
      }

      return {
        ratePlanId: rp.id,
        ratePlanCode: rp.code,
        ratePlanName: rp.name,
        isRefundable: rp.isRefundable,
        includesBreakfast: rp.includesBreakfast,
        totalPrice: total,
        averageNightlyPrice: nightsCount > 0 ? Math.round(total / nightsCount) : 0,
        nightlyBreakdown,
      };
    });

    results.push({
      roomTypeId: rt.id,
      roomTypeCode: rt.code,
      name: rt.name,
      description: rt.description,
      maxOccupancy: rt.maxOccupancy,
      basePrice: Number(rt.basePrice),
      amenities: rt.amenities,
      imageUrls: rt.imageUrls,
      totalRooms: totalPhysical,
      maintenanceRooms: maintenanceCount,
      bookedRooms: bookedCount,
      availableRooms: availableCount,
      ratePlans: availablePlans,
    });
  }

  return results;
}
