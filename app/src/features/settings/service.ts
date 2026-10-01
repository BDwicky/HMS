/**
 * @file src/features/settings/service.ts
 * Hotel Settings service — Phase 2.
 * UC-30: View and update hotel settings.
 * BR: Only one settings record exists (upsert pattern).
 */

import { prisma } from "@/lib/db";
import type { HotelSetting } from "@prisma/client";
import { z } from "zod";

export const hotelSettingUpdateSchema = z.object({
  hotelName: z.string().min(1, "Nama hotel wajib diisi"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  website: z.string().url("URL tidak valid").optional().or(z.literal("")),
  currency: z.string().length(3, "Kode mata uang harus 3 huruf").default("IDR"),
  timezone: z.string().default("Asia/Jakarta"),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu harus HH:MM")
    .default("14:00"),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu harus HH:MM")
    .default("12:00"),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  serviceChargePercent: z.coerce.number().min(0).max(100).default(0),
  allowOutstandingCheckout: z.boolean().default(false),
  generateInvoiceOnCheckout: z.boolean().default(true),
  logoUrl: z.string().optional(),
});

export type HotelSettingUpdateInput = z.infer<typeof hotelSettingUpdateSchema>;

export async function getHotelSettings(): Promise<HotelSetting | null> {
  return prisma.hotelSetting.findFirst();
}

export async function upsertHotelSettings(
  input: HotelSettingUpdateInput,
): Promise<HotelSetting> {
  const existing = await prisma.hotelSetting.findFirst();
  if (existing) {
    return prisma.hotelSetting.update({
      where: { id: existing.id },
      data: {
        ...input,
        taxPercent: input.taxPercent,
        serviceChargePercent: input.serviceChargePercent,
      },
    });
  }
  return prisma.hotelSetting.create({ data: input });
}
