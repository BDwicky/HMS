"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/currency";

interface DashboardKPIs {
  today: string;
  totalRooms: number;
  roomStatusCounts: Record<string, number>;
  currentOccupancyRate: number;
  todayArrivals: number;
  todayDepartures: number;
  inHouseStays: number;
  pendingHousekeeping: number;
  openMaintenance: number;
  todayRevenue: number;
  monthRevenue: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/kpis");
      if (!res.ok) {
        throw new Error("Gagal memuat ringkasan dashboard");
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Ringkasan performa real-time dan status kamar hari ini
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchKPIs}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Segarkan
          </button>
          <Link
            href="/reservations"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-lg shadow-blue-500/20"
          >
            + Reservasi Baru
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchKPIs} className="underline hover:text-rose-300">
            Coba lagi
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Tingkat Hunian</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
            {loading ? (
              <div className="h-8 w-20 bg-slate-800 animate-pulse rounded" />
            ) : (
              `${data?.currentOccupancyRate ?? 0}%`
            )}
          </div>
          <p className="text-xs text-slate-400">
            {data?.roomStatusCounts?.["OCCUPIED"] ?? 0} dari {data?.totalRooms ?? 0} kamar terisi
          </p>
        </div>

        {/* Today Arrivals & Departures */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Kedatangan & Kepulangan</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-4 mb-1">
            <div>
              <span className="text-2xl font-bold text-emerald-400">
                {loading ? "-" : data?.todayArrivals ?? 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Check-in</span>
            </div>
            <div className="text-slate-600">/</div>
            <div>
              <span className="text-2xl font-bold text-amber-400">
                {loading ? "-" : data?.todayDepartures ?? 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Check-out</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {data?.inHouseStays ?? 0} tamu aktif menginap saat ini
          </p>
        </div>

        {/* Revenue Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Pendapatan Hari Ini</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
            {loading ? (
              <div className="h-8 w-28 bg-slate-800 animate-pulse rounded" />
            ) : (
              formatRupiah(data?.todayRevenue ?? 0)
            )}
          </div>
          <p className="text-xs text-slate-400">
            Bulan ini: {formatRupiah(data?.monthRevenue ?? 0)}
          </p>
        </div>

        {/* Operations (Housekeeping & Maintenance) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Operasional Kamar</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-4 mb-1">
            <div>
              <span className="text-2xl font-bold text-amber-400">
                {loading ? "-" : data?.pendingHousekeeping ?? 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Pembersihan</span>
            </div>
            <div className="text-slate-600">/</div>
            <div>
              <span className="text-2xl font-bold text-rose-400">
                {loading ? "-" : data?.openMaintenance ?? 0}
              </span>
              <span className="text-xs text-slate-400 ml-1">Perbaikan</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Perlu penanganan oleh tim operasional
          </p>
        </div>
      </div>

      {/* Room Status Distribution Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Status Kamar Saat Ini</h2>
          <Link
            href="/rooms"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
          >
            Lihat Denah Kamar →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { key: "AVAILABLE", label: "Tersedia", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
            { key: "RESERVED", label: "Dipesan", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
            { key: "OCCUPIED", label: "Terisi", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
            { key: "DIRTY", label: "Kotor", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
            { key: "CLEANING", label: "Pembersihan", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
            { key: "INSPECTION", label: "Inspeksi", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
            { key: "MAINTENANCE", label: "Perbaikan", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
            { key: "OUT_OF_SERVICE", label: "Rusak/Tutup", color: "bg-slate-800 text-slate-400 border-slate-700" },
          ].map((item) => (
            <div
              key={item.key}
              className={`rounded-xl border p-3 text-center transition ${item.color}`}
            >
              <div className="text-xl font-bold">
                {data?.roomStatusCounts?.[item.key] ?? 0}
              </div>
              <div className="text-xs font-medium mt-0.5 opacity-90">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/reservations"
          className="group block p-6 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition">
            Kelola Reservasi
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Lihat daftar pemesanan, proses check-in tamu, perpindahan kamar, dan perpanjangan menginap.
          </p>
        </Link>

        <Link
          href="/housekeeping"
          className="group block p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition">
            Housekeeping &amp; Perbaikan
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Pantau giliran pembersihan kamar, inspeksi kebersihan, dan laporan perbaikan teknis.
          </p>
        </Link>

        <Link
          href="/reports"
          className="group block p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition">
            Laporan &amp; Audit Log
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Analisis okupansi, ADR, RevPAR, rekapitulasi pembayaran kasir, dan riwayat aktivitas audit.
          </p>
        </Link>
      </div>
    </div>
  );
}
