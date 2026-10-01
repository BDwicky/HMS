"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LoadingSpinner, EmptyState } from "@/components/shared";

interface ReservationItem {
  id: string;
  bookingReference: string;
  status: string;
  source: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestFirstName: string;
  guestLastName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  specialRequest?: string | null;
  internalNote?: string | null;
  subtotal: number | string;
  taxAmount: number | string;
  serviceCharge: number | string;
  totalAmount: number | string;
  items: Array<{
    id: string;
    quantity: number;
    pricePerNight: number | string;
    nights: number;
    subtotal: number | string;
    roomType: { name: string; code: string };
    ratePlan: { name: string; code: string };
    nightsDetail?: Array<{ stayDate: string; roomRate: number | string; subtotal: number | string }>;
  }>;
  cancellation?: {
    cancelledAt: string;
    reason?: string | null;
    cancellationFee: number | string;
    refundableAmount: number | string;
  } | null;
}

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  CONFIRMED: { label: "Dikonfirmasi", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  CHECKED_IN: { label: "Checked-In", bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400" },
  CHECKED_OUT: { label: "Checked-Out", bg: "bg-slate-700/50 border-slate-600", text: "text-slate-300" },
  CANCELLED: { label: "Dibatalkan", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400" },
  NO_SHOW: { label: "No-Show", bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
  EXPIRED: { label: "Kadaluarsa", bg: "bg-slate-700/50 border-slate-600", text: "text-slate-400" },
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals & Details
  const [selectedRes, setSelectedRes] = useState<ReservationItem | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Reservation Form
  const [roomTypes, setRoomTypes] = useState<Array<{ id: string; name: string; code: string; basePrice: number }>>([]);
  const [ratePlans, setRatePlans] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [newRes, setNewRes] = useState({
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    roomTypeId: "",
    ratePlanId: "",
    quantity: 1,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequest: "",
    internalNote: "",
  });

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const q = encodeURIComponent(search);
      const st = statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
      const res = await fetch(`/api/reservations?search=${q}${st}&page=${page}&limit=12`);
      const json = await res.json();
      if (json.data) {
        setReservations(json.data);
        if (json.meta) {
          setTotalPages(json.meta.totalPages || 1);
          setTotalCount(json.meta.total || 0);
        }
      }
    } catch {
      notify("error", "Gagal memuat data reservasi");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Load room types & rate plans for creation modal
  useEffect(() => {
    Promise.all([
      fetch("/api/room-types").then((r) => r.json()),
      fetch("/api/rate-plans").then((r) => r.json()),
    ]).then(([rt, rp]) => {
      if (rt.data) setRoomTypes(rt.data);
      if (rp.data) setRatePlans(rp.data);
    }).catch(() => {});
  }, []);

  const handleCancelReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;

    try {
      const res = await fetch(`/api/reservations/${selectedRes.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal membatalkan reservasi");

      notify("success", `Reservasi ${selectedRes.bookingReference} berhasil dibatalkan`);
      setShowCancelModal(false);
      setSelectedRes(null);
      setCancelReason("");
      fetchReservations();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleMarkNoShow = async (reservationId: string) => {
    if (!confirm("Tandai tamu ini sebagai No-Show? Kebijakan denda no-show akan diaplikasikan.")) return;

    try {
      const res = await fetch(`/api/reservations/${reservationId}/no-show`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menandai no-show");

      notify("success", "Reservasi berhasil ditandai No-Show");
      fetchReservations();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        checkIn: newRes.checkIn,
        checkOut: newRes.checkOut,
        adults: Number(newRes.adults),
        children: Number(newRes.children),
        source: "STAFF",
        items: [
          {
            roomTypeId: newRes.roomTypeId,
            ratePlanId: newRes.ratePlanId,
            quantity: Number(newRes.quantity),
          },
        ],
        guest: {
          firstName: newRes.firstName,
          lastName: newRes.lastName || undefined,
          email: newRes.email || undefined,
          phone: newRes.phone || undefined,
        },
        specialRequest: newRes.specialRequest || undefined,
        internalNote: newRes.internalNote || undefined,
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal membuat reservasi");

      notify("success", `Reservasi berhasil dibuat! No. Ref: ${json.data.bookingReference}`);
      setShowCreateModal(false);
      setNewRes({
        checkIn: "",
        checkOut: "",
        adults: 1,
        children: 0,
        roomTypeId: "",
        ratePlanId: "",
        quantity: 1,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialRequest: "",
        internalNote: "",
      });
      fetchReservations();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/90 border-rose-500/40 text-rose-300"
          }`}
        >
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Manajemen Reservasi"
        description="Kelola seluruh pesanan kamar tamu (Online, Walk-in, Telepon), pantau status, dan kelola pembatalan."
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <span>+</span> Buat Reservasi Baru
          </button>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 max-w-2xl">
          <input
            type="text"
            placeholder="Cari No. Booking, Nama, Email, Telepon..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-72 px-3.5 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Status</option>
            {Object.keys(STATUS_MAP).map((st) => (
              <option key={st} value={st}>
                {STATUS_MAP[st].label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-400">
          Total Reservasi: <span className="font-semibold text-white">{totalCount}</span>
        </div>
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
      ) : reservations.length === 0 ? (
        <EmptyState
          title="Tidak ada reservasi ditemukan"
          description="Belum ada reservasi yang sesuai dengan kriteria filter Anda."
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
            >
              Buat Reservasi Pertama
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((res) => {
            const guestName = `${res.guestFirstName} ${res.guestLastName || ""}`.trim();
            const conf = STATUS_MAP[res.status] || {
              label: res.status,
              bg: "bg-slate-700/50 border-slate-600",
              text: "text-slate-300",
            };
            const checkInFormatted = new Date(res.checkIn).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const checkOutFormatted = new Date(res.checkOut).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <Card
                key={res.id}
                className="p-5 bg-slate-800/40 border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-300">
                      {res.bookingReference}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${conf.bg} ${conf.text}`}>
                      {conf.label}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1">{guestName}</h3>
                  <p className="text-xs text-slate-400">
                    {res.guestPhone || res.guestEmail || "Kontak tidak dicantumkan"}
                  </p>

                  {/* Dates & Rooms Info */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jadwal:</span>
                      <span className="text-slate-200 font-medium">
                        {checkInFormatted} → {checkOutFormatted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tipe Kamar:</span>
                      <span className="text-slate-200">
                        {res.items.map((it) => `${it.quantity}x ${it.roomType.name}`).join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Biaya:</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      Rp {Number(res.totalAmount).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex gap-2 justify-end text-xs">
                  <button
                    onClick={() => setSelectedRes(res)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Detail
                  </button>
                  {res.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleMarkNoShow(res.id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-300 transition-colors"
                    >
                      No-Show
                    </button>
                  )}
                  {(res.status === "CONFIRMED" || res.status === "PENDING_PAYMENT") && (
                    <button
                      onClick={() => {
                        setSelectedRes(res);
                        setShowCancelModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition-colors"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="px-3 py-1.5 text-xs text-slate-400">
            Halaman {page} dari {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}

      {/* Modal: Detail Reservasi */}
      {selectedRes && !showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-700/60 pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-300">
                  {selectedRes.bookingReference}
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedRes.guestFirstName} {selectedRes.guestLastName || ""}
                </h2>
              </div>
              <button onClick={() => setSelectedRes(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Room Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Kamar & Tarif</h4>
              {selectedRes.items.map((it) => (
                <div key={it.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">{it.quantity}x {it.roomType.name}</span>
                    <span className="block text-slate-400">Skema: {it.ratePlan.name} • {it.nights} Malam</span>
                  </div>
                  <span className="font-bold text-slate-200">
                    Rp {Number(it.subtotal).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Kamar:</span>
                <span>Rp {Number(selectedRes.subtotal).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pajak Hotel (PB1):</span>
                <span>Rp {Number(selectedRes.taxAmount).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Biaya Layanan:</span>
                <span>Rp {Number(selectedRes.serviceCharge).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-emerald-400 border-t border-slate-700 pt-2">
                <span>Total Akhir:</span>
                <span>Rp {Number(selectedRes.totalAmount).toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Special Request & Notes */}
            {selectedRes.specialRequest && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200">
                <span className="font-semibold block mb-0.5">Permintaan Khusus Tamu:</span>
                {selectedRes.specialRequest}
              </div>
            )}

            {selectedRes.cancellation && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 space-y-1">
                <span className="font-bold block">Detail Pembatalan:</span>
                <span>Alasan: {selectedRes.cancellation.reason || "-"}</span>
                <div className="flex justify-between mt-1">
                  <span>Denda Pembatalan: Rp {Number(selectedRes.cancellation.cancellationFee).toLocaleString("id-ID")}</span>
                  <span>Pengembalian: Rp {Number(selectedRes.cancellation.refundableAmount).toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRes(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batalkan Reservasi */}
      {showCancelModal && selectedRes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Batalkan Reservasi</h2>
            <p className="text-xs text-slate-400 mb-4">
              Konfirmasi pembatalan untuk <span className="text-white font-semibold">{selectedRes.bookingReference}</span> ({selectedRes.guestFirstName}). Sistem akan otomatis mengevaluasi penalti pembatalan sesuai kebijakan rate plan terkait.
            </p>

            <form onSubmit={handleCancelReservation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alasan Pembatalan</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Permintaan tamu, perubahan rencana, dsb..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                >
                  Konfirmasi Batalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Buat Reservasi Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Buat Reservasi Baru</h2>
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Check-In *</label>
                  <input
                    type="date"
                    required
                    value={newRes.checkIn}
                    onChange={(e) => setNewRes({ ...newRes, checkIn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Check-Out *</label>
                  <input
                    type="date"
                    required
                    value={newRes.checkOut}
                    onChange={(e) => setNewRes({ ...newRes, checkOut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipe Kamar *</label>
                  <select
                    required
                    value={newRes.roomTypeId}
                    onChange={(e) => setNewRes({ ...newRes, roomTypeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Tipe Kamar</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Rate Plan *</label>
                  <select
                    required
                    value={newRes.ratePlanId}
                    onChange={(e) => setNewRes({ ...newRes, ratePlanId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Rate Plan</option>
                    {ratePlans.map((rp) => (
                      <option key={rp.id} value={rp.id}>{rp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Jumlah Kamar</label>
                  <input
                    type="number"
                    min={1}
                    value={newRes.quantity}
                    onChange={(e) => setNewRes({ ...newRes, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dewasa</label>
                  <input
                    type="number"
                    min={1}
                    value={newRes.adults}
                    onChange={(e) => setNewRes({ ...newRes, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Anak</label>
                  <input
                    type="number"
                    min={0}
                    value={newRes.children}
                    onChange={(e) => setNewRes({ ...newRes, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-700/60 pt-3">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Informasi Tamu</span>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama Depan *"
                    value={newRes.firstName}
                    onChange={(e) => setNewRes({ ...newRes, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Nama Belakang"
                    value={newRes.lastName}
                    onChange={(e) => setNewRes({ ...newRes, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email Tamu"
                    value={newRes.email}
                    onChange={(e) => setNewRes({ ...newRes, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="No. Telepon / WA"
                    value={newRes.phone}
                    onChange={(e) => setNewRes({ ...newRes, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Permintaan Khusus Tamu</label>
                <input
                  type="text"
                  placeholder="Contoh: Non-smoking room, high floor"
                  value={newRes.specialRequest}
                  onChange={(e) => setNewRes({ ...newRes, specialRequest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Buat Reservasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
