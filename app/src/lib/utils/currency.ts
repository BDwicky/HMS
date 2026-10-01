/**
 * @file src/lib/utils/currency.ts
 * Currency formatting utilities for Indonesian Rupiah (IDR).
 */

export function formatRupiah(amount: number | string | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : Number(amount.toString());
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
