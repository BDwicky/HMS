"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah } from "@/lib/utils/currency";

type TabType = "revenue" | "occupancy" | "reservations" | "payments" | "audit";

interface RevenueData {
  totalRooms: number;
  totalDays: number;
  totalRoomsSold: number;
  totalRoomRevenue: number;
  totalExtraRevenue: number;
  grossRevenue: number;
  totalPaymentsCollected: number;
  totalRefundsIssued: number;
  netPayments: number;
  adr: number;
  revPar: number;
}

interface OccupancyData {
  totalRooms: number;
  totalDays: number;
  totalNightsSold: number;
  averageOccupancy: number;
  dailyStats: Array<{
    date: string;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    occupancyRate: number;
  }>;
}

interface ReservationData {
  total: number;
  totalNights: number;
  averageLengthOfStay: number;
  cancellationRate: number;
  noShowRate: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

interface PaymentData {
  totalTransactions: number;
  totalCollected: number;
  totalRefunded: number;
  netRevenue: number;
  byMethod: Record<string, { count: number; total: number }>;
}

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
  previousData?: unknown;
  newData?: unknown;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("revenue");

  // Date range defaults: Last 7 days
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const fetchTabData = useCallback(async (tab: TabType) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "revenue") {
        const res = await fetch(`/api/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error("Gagal mengambil data pendapatan");
        const json = await res.json();
        setRevenueData(json.data);
      } else if (tab === "occupancy") {
        const res = await fetch(`/api/reports/occupancy?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error("Gagal mengambil data okupansi");
        const json = await res.json();
        setOccupancyData(json.data);
      } else if (tab === "reservations") {
        const res = await fetch(`/api/reports/reservations?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error("Gagal mengambil data reservasi");
        const json = await res.json();
        setReservationData(json.data);
      } else if (tab === "payments") {
        const res = await fetch(`/api/reports/payments?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) throw new Error("Gagal mengambil data pembayaran");
        const json = await res.json();
        setPaymentData(json.data);
      } else if (tab === "audit") {
        const res = await fetch(`/api/audit-logs?startDate=${startDate}&endDate=${endDate}&limit=50`);
        if (!res.ok) throw new Error("Gagal mengambil riwayat audit");
        const json = await res.json();
        setAuditLogs(json.data.items || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const setPreset = (preset: "today" | "7d" | "30d" | "thisMonth") => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (preset === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "7d") {
      const past7 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past7);
      setEndDate(today);
    } else if (preset === "30d") {
      const past30 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past30);
      setEndDate(today);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(today);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Laporan &amp; Analitik
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Statistik pendapatan, tingkat hunian, transaksi kasir, dan jejak audit
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
          <button
            onClick={() => setPreset("today")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPreset("7d")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            7 Hari
          </button>
          <button
            onClick={() => setPreset("30d")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            30 Hari
          </button>
          <button
            onClick={() => setPreset("thisMonth")}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            Bulan Ini
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-500 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-2 overflow-x-auto pb-px">
        {[
          { id: "revenue", label: "Pendapatan (Revenue)" },
          { id: "occupancy", label: "Tingkat Hunian (Occupancy)" },
          { id: "reservations", label: "Statistik Reservasi" },
          { id: "payments", label: "Rekap Pembayaran" },
          { id: "audit", label: "Riwayat Audit" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Menghitung analitik laporan...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: REVENUE */}
          {activeTab === "revenue" && revenueData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Pendapatan Kotor (Gross)
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatRupiah(revenueData.grossRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Kamar: {formatRupiah(revenueData.totalRoomRevenue)} + Add-on: {formatRupiah(revenueData.totalExtraRevenue)}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Net Penerimaan Kasir
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatRupiah(revenueData.netPayments)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Diterima: {formatRupiah(revenueData.totalPaymentsCollected)} - Refund: {formatRupiah(revenueData.totalRefundsIssued)}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    ADR (Average Daily Rate)
                  </div>
                  <div className="text-2xl font-bold text-indigo-400">
                    {formatRupiah(revenueData.adr)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Rata-rata tarif per kamar terjual ({revenueData.totalRoomsSold} malam)
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    RevPAR
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {formatRupiah(revenueData.revPar)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Pendapatan per seluruh kamar tersedia
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Rincian Komponen Pendapatan
                </h3>
                <div className="divide-y divide-slate-800">
                  <div className="py-3 flex justify-between text-sm">
                    <span className="text-slate-400">Pendapatan Sewa Kamar (Room Revenue)</span>
                    <span className="text-white font-medium">{formatRupiah(revenueData.totalRoomRevenue)}</span>
                  </div>
                  <div className="py-3 flex justify-between text-sm">
                    <span className="text-slate-400">Biaya Tambahan &amp; Layanan (Extra Charges)</span>
                    <span className="text-white font-medium">{formatRupiah(revenueData.totalExtraRevenue)}</span>
                  </div>
                  <div className="py-3 flex justify-between text-sm">
                    <span className="text-slate-400">Total Pengembalian Dana (Refunds)</span>
                    <span className="text-rose-400 font-medium">-{formatRupiah(revenueData.totalRefundsIssued)}</span>
                  </div>
                  <div className="py-3 flex justify-between text-sm font-semibold border-t border-slate-700">
                    <span className="text-white">Penerimaan Kas Bersih (Net Revenue)</span>
                    <span className="text-emerald-400 text-base">{formatRupiah(revenueData.netPayments)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OCCUPANCY */}
          {activeTab === "occupancy" && occupancyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Rata-rata Okupansi
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {occupancyData.averageOccupancy}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Periode {occupancyData.totalDays} hari
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Total Kamar Terjual (Room-Nights)
                  </div>
                  <div className="text-3xl font-bold text-blue-400">
                    {occupancyData.totalNightsSold}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Malam terjual dari total {occupancyData.totalRooms * occupancyData.totalDays} kapasitas
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Total Kamar Hotel
                  </div>
                  <div className="text-3xl font-bold text-slate-300">
                    {occupancyData.totalRooms}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Kamar fisik terdaftar</div>
                </div>
              </div>

              {/* Daily Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white">
                    Tingkat Hunian Harian
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3">Tanggal</th>
                        <th className="px-6 py-3">Total Kamar</th>
                        <th className="px-6 py-3">Kamar Terisi</th>
                        <th className="px-6 py-3">Kamar Tersedia</th>
                        <th className="px-6 py-3">Okupansi (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {occupancyData.dailyStats.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-800/30">
                          <td className="px-6 py-3.5 font-medium text-white">{d.date}</td>
                          <td className="px-6 py-3.5">{d.totalRooms}</td>
                          <td className="px-6 py-3.5 text-blue-400 font-medium">{d.occupiedRooms}</td>
                          <td className="px-6 py-3.5 text-emerald-400">{d.availableRooms}</td>
                          <td className="px-6 py-3.5 font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                d.occupancyRate >= 70
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : d.occupancyRate >= 40
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {d.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESERVATIONS */}
          {activeTab === "reservations" && reservationData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Total Reservasi Masuk
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {reservationData.total}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Periode ini</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Rata-rata Menginap (ALOS)
                  </div>
                  <div className="text-3xl font-bold text-indigo-400">
                    {reservationData.averageLengthOfStay} <span className="text-sm font-normal text-slate-400">malam</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Average Length of Stay</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Tingkat Pembatalan
                  </div>
                  <div className="text-3xl font-bold text-rose-400">
                    {reservationData.cancellationRate}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {reservationData.byStatus?.["CANCELLED"] || 0} dibatalkan
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Tingkat No-Show
                  </div>
                  <div className="text-3xl font-bold text-amber-400">
                    {reservationData.noShowRate}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {reservationData.byStatus?.["NO_SHOW"] || 0} no-show
                  </div>
                </div>
              </div>

              {/* Status & Source Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Distribusi Status Reservasi
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(reservationData.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{status}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-white font-medium text-xs">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Kanal Sumber Pemesanan (Source)
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(reservationData.bySource).map(([src, count]) => (
                      <div key={src} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{src}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium text-xs">
                          {count} ({reservationData.total > 0 ? ((count / reservationData.total) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {activeTab === "payments" && paymentData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Total Pembayaran Diterima
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatRupiah(paymentData.totalCollected)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {paymentData.totalTransactions} transaksi berhasil
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Total Refund Dikeluarkan
                  </div>
                  <div className="text-2xl font-bold text-rose-400">
                    {formatRupiah(paymentData.totalRefunded)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Pengembalian dana</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">
                    Pendapatan Kas Bersih
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatRupiah(paymentData.netRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Settlement netto</div>
                </div>
              </div>

              {/* Methods Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white">
                    Rincian Berdasarkan Metode Pembayaran
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3">Metode</th>
                        <th className="px-6 py-3">Jumlah Transaksi</th>
                        <th className="px-6 py-3">Total Nominal</th>
                        <th className="px-6 py-3">Porsi (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {Object.entries(paymentData.byMethod).map(([method, val]) => (
                        <tr key={method} className="hover:bg-slate-800/30">
                          <td className="px-6 py-3.5 font-medium text-white">{method}</td>
                          <td className="px-6 py-3.5">{val.count}</td>
                          <td className="px-6 py-3.5 text-emerald-400 font-medium">
                            {formatRupiah(val.total)}
                          </td>
                          <td className="px-6 py-3.5 text-slate-400">
                            {paymentData.totalCollected > 0
                              ? ((val.total / paymentData.totalCollected) * 100).toFixed(1)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Riwayat Jejak Audit Sistem
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Catatan perubahan entitas yang tidak dapat diubah (immutable audit log)
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Menampilkan {auditLogs.length} entri terbaru
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Belum ada log aktivitas pada rentang tanggal ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3">Waktu</th>
                        <th className="px-6 py-3">Pengguna</th>
                        <th className="px-6 py-3">Aksi</th>
                        <th className="px-6 py-3">Tipe Entitas</th>
                        <th className="px-6 py-3">ID Entitas</th>
                        <th className="px-6 py-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-3.5 text-white font-medium">
                            {log.user?.name || "System"}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                            {log.resourceType}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-400 font-mono truncate max-w-[120px]">
                            {log.resourceId}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                            {log.ipAddress || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
