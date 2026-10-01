"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from "@/components/shared";

interface RoomType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  maxOccupancy: number;
  basePrice: number | string;
  amenities: string[];
  imageUrls: string[];
  isActive: boolean;
}

interface Room {
  id: string;
  roomNumber: string;
  floor?: number | null;
  description?: string | null;
  status: string;
  isActive: boolean;
  roomTypeId: string;
  roomType: {
    id: string;
    code: string;
    name: string;
  };
}

interface RatePlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isRefundable: boolean;
  includesBreakfast: boolean;
  isActive: boolean;
  cancellationPolicy?: { name: string } | null;
  modificationPolicy?: { name: string } | null;
  noShowPolicy?: { name: string } | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "warning" | "error" | "info" | "default"; bg: string; text: string }
> = {
  AVAILABLE: { label: "Tersedia", variant: "success", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  RESERVED: { label: "Dipesan", variant: "info", bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400" },
  OCCUPIED: { label: "Terisi", variant: "warning", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  DIRTY: { label: "Kotor", variant: "error", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400" },
  CLEANING: { label: "Dibersihkan", variant: "warning", bg: "bg-yellow-500/15 border-yellow-500/30", text: "text-yellow-400" },
  INSPECTION: { label: "Inspeksi", variant: "info", bg: "bg-cyan-500/15 border-cyan-500/30", text: "text-cyan-400" },
  MAINTENANCE: { label: "Perawatan", variant: "default", bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
  OUT_OF_SERVICE: { label: "Tidak Beroperasi", variant: "default", bg: "bg-slate-700/50 border-slate-600", text: "text-slate-400" },
};

export default function RoomsPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "types" | "rates" | "calendar">("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showBulkRateModal, setShowBulkRateModal] = useState(false);

  // Form states
  const [newRoom, setNewRoom] = useState({ roomNumber: "", roomTypeId: "", floor: 1, description: "" });
  const [newType, setNewType] = useState({ code: "", name: "", description: "", maxOccupancy: 2, basePrice: 500000, amenities: "WiFi, AC, TV" });
  const [newRatePlan, setNewRatePlan] = useState({ code: "", name: "", description: "", isRefundable: true, includesBreakfast: true });
  const [bulkRate, setBulkRate] = useState({ roomTypeId: "", ratePlanId: "", startDate: "", endDate: "", price: 500000 });

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRooms, resTypes, resRates] = await Promise.all([
        fetch("/api/rooms?includeInactive=true").then((r) => r.json()),
        fetch("/api/room-types?includeInactive=true").then((r) => r.json()),
        fetch("/api/rate-plans?includeInactive=true").then((r) => r.json()),
      ]);

      if (resRooms.data) setRooms(resRooms.data);
      if (resTypes.data) setRoomTypes(resTypes.data);
      if (resRates.data) setRatePlans(resRates.data);
    } catch {
      notify("error", "Gagal mengambil data dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: newRoom.roomNumber,
          roomTypeId: newRoom.roomTypeId,
          floor: Number(newRoom.floor),
          description: newRoom.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menambah kamar");
      notify("success", `Kamar ${newRoom.roomNumber} berhasil ditambahkan`);
      setShowRoomModal(false);
      setNewRoom({ roomNumber: "", roomTypeId: "", floor: 1, description: "" });
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal menambah kamar");
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui status kamar");
      notify("success", "Status kamar berhasil diperbarui");
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal memperbarui status kamar");
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amenitiesArr = newType.amenities.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newType.code.toUpperCase(),
          name: newType.name,
          description: newType.description || undefined,
          maxOccupancy: Number(newType.maxOccupancy),
          basePrice: Number(newType.basePrice),
          amenities: amenitiesArr,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menambah tipe kamar");
      notify("success", `Tipe kamar ${newType.name} berhasil dibuat`);
      setShowTypeModal(false);
      setNewType({ code: "", name: "", description: "", maxOccupancy: 2, basePrice: 500000, amenities: "WiFi, AC, TV" });
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal menambah tipe kamar");
    }
  };

  const handleCreateRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/rate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newRatePlan.code.toUpperCase(),
          name: newRatePlan.name,
          description: newRatePlan.description || undefined,
          isRefundable: newRatePlan.isRefundable,
          includesBreakfast: newRatePlan.includesBreakfast,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat rate plan");
      notify("success", `Rate plan ${newRatePlan.name} berhasil dibuat`);
      setShowRateModal(false);
      setNewRatePlan({ code: "", name: "", description: "", isRefundable: true, includesBreakfast: true });
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal membuat rate plan");
    }
  };

  const handleBulkRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/room-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: bulkRate.roomTypeId,
          ratePlanId: bulkRate.ratePlanId,
          startDate: bulkRate.startDate,
          endDate: bulkRate.endDate,
          price: Number(bulkRate.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengatur tarif");
      notify("success", `Tarif berhasil diperbarui untuk ${data.data?.updatedDays || "beberapa"} hari`);
      setShowBulkRateModal(false);
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal mengatur tarif");
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchType = typeFilter === "ALL" || r.roomTypeId === typeFilter;
    const matchSearch =
      !searchQuery ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomType.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  // KPI stats
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupiedCount = rooms.filter((r) => r.status === "OCCUPIED" || r.status === "RESERVED").length;
  const dirtyCount = rooms.filter((r) => r.status === "DIRTY" || r.status === "CLEANING").length;
  const maintenanceCount = rooms.filter((r) => r.status === "MAINTENANCE" || r.status === "OUT_OF_SERVICE").length;

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
        title="Manajemen Kamar & Tarif"
        description="Kelola unit fisik kamar, tipe kamar, skema tarif, dan penetapan harga musiman."
        action={
          <div className="flex gap-2">
            {activeTab === "rooms" && (
              <button
                onClick={() => setShowRoomModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <span>+</span> Tambah Kamar
              </button>
            )}
            {activeTab === "types" && (
              <button
                onClick={() => setShowTypeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <span>+</span> Tambah Tipe Kamar
              </button>
            )}
            {activeTab === "rates" && (
              <button
                onClick={() => setShowRateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <span>+</span> Tambah Rate Plan
              </button>
            )}
            {activeTab === "calendar" && (
              <button
                onClick={() => setShowBulkRateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <span>📅</span> Atur Tarif Rentang Tanggal
              </button>
            )}
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-slate-800/40 border-slate-700/60 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">Total Kamar</span>
          <span className="text-2xl font-bold text-white mt-1">{totalCount}</span>
        </Card>
        <Card className="p-4 bg-emerald-950/20 border-emerald-500/20 flex flex-col">
          <span className="text-xs text-emerald-400 font-medium">Tersedia</span>
          <span className="text-2xl font-bold text-emerald-300 mt-1">{availableCount}</span>
        </Card>
        <Card className="p-4 bg-amber-950/20 border-amber-500/20 flex flex-col">
          <span className="text-xs text-amber-400 font-medium">Terisi / Reservasi</span>
          <span className="text-2xl font-bold text-amber-300 mt-1">{occupiedCount}</span>
        </Card>
        <Card className="p-4 bg-rose-950/20 border-rose-500/20 flex flex-col">
          <span className="text-xs text-rose-400 font-medium">Kotor / Cleaning</span>
          <span className="text-2xl font-bold text-rose-300 mt-1">{dirtyCount}</span>
        </Card>
        <Card className="p-4 bg-purple-950/20 border-purple-500/20 flex flex-col">
          <span className="text-xs text-purple-400 font-medium">Perawatan</span>
          <span className="text-2xl font-bold text-purple-300 mt-1">{maintenanceCount}</span>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700/60 space-x-2">
        <button
          onClick={() => setActiveTab("rooms")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "rooms"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🛏️ Kamar Fisik ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "types"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🏷️ Tipe Kamar ({roomTypes.length})
        </button>
        <button
          onClick={() => setActiveTab("rates")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "rates"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          📋 Rate Plans & Kebijakan ({ratePlans.length})
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "calendar"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          📅 Penyesuaian Tarif Musiman
        </button>
      </div>

      {/* Tab 1: Rooms List */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center flex-1 max-w-2xl">
              <input
                type="text"
                placeholder="Cari nomor kamar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status</option>
                {Object.keys(STATUS_CONFIG).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Tipe Kamar</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400">
              Menampilkan {filteredRooms.length} dari {rooms.length} kamar
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><LoadingSpinner /></div>
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              title="Tidak ada kamar ditemukan"
              description="Belum ada kamar yang sesuai dengan kriteria filter Anda."
              action={
                <button
                  onClick={() => setShowRoomModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
                >
                  Tambah Kamar Pertama
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRooms.map((room) => {
                const conf = STATUS_CONFIG[room.status] || {
                  label: room.status,
                  bg: "bg-slate-700/40 border-slate-600",
                  text: "text-slate-300",
                };
                return (
                  <Card key={room.id} className="p-4 bg-slate-800/40 border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-2xl font-black text-white tracking-wide">
                            {room.roomNumber}
                          </span>
                          <span className="block text-xs text-slate-400 mt-0.5">
                            Lantai {room.floor ?? 1} • {room.roomType.name}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${conf.bg} ${conf.text}`}>
                          {conf.label}
                        </span>
                      </div>

                      {room.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-1 italic">
                          &ldquo;{room.description}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Ubah Status:</span>
                      <select
                        value={room.status}
                        onChange={(e) => handleUpdateRoomStatus(room.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="AVAILABLE">Tersedia</option>
                        <option value="DIRTY">Kotor</option>
                        <option value="CLEANING">Cleaning</option>
                        <option value="INSPECTION">Inspeksi</option>
                        <option value="MAINTENANCE">Perawatan</option>
                        <option value="OUT_OF_SERVICE">Out of Service</option>
                      </select>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Room Types */}
      {activeTab === "types" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 flex justify-center"><LoadingSpinner /></div>
          ) : roomTypes.length === 0 ? (
            <EmptyState
              title="Belum ada tipe kamar"
              description="Buat tipe kamar seperti Standard, Deluxe, Suite untuk mulai mengatur inventaris."
              action={
                <button
                  onClick={() => setShowTypeModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
                >
                  Tambah Tipe Kamar
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roomTypes.map((rt) => (
                <Card key={rt.id} className="p-5 bg-slate-800/40 border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="info">{rt.code}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        👥 Kapasitas: {rt.maxOccupancy} org
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{rt.name}</h3>
                    {rt.description && <p className="text-xs text-slate-400 mb-3">{rt.description}</p>}

                    <div className="mb-4">
                      <span className="text-xs text-slate-500 block">Tarif Dasar / Malam</span>
                      <span className="text-xl font-extrabold text-emerald-400">
                        Rp {Number(rt.basePrice).toLocaleString("id-ID")}
                      </span>
                    </div>

                    {rt.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {rt.amenities.map((am, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-700/50 text-[11px] text-slate-300">
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span>Status: {rt.isActive ? "🟢 Aktif" : "⚪ Nonaktif"}</span>
                    <span>{rooms.filter((r) => r.roomTypeId === rt.id).length} Kamar Terhubung</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Rate Plans & Policies */}
      {activeTab === "rates" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 flex justify-center"><LoadingSpinner /></div>
          ) : ratePlans.length === 0 ? (
            <EmptyState
              title="Belum ada Rate Plan"
              description="Tambahkan rencana tarif dasar seperti Room Only atau Termasuk Sarapan."
              action={
                <button
                  onClick={() => setShowRateModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
                >
                  Tambah Rate Plan
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ratePlans.map((rp) => (
                <Card key={rp.id} className="p-5 bg-slate-800/40 border-slate-700/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">{rp.code}</Badge>
                      <span className="text-xs text-slate-400">
                        {rp.isActive ? "🟢 Aktif" : "⚪ Nonaktif"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{rp.name}</h3>
                    {rp.description && <p className="text-xs text-slate-400 mb-4">{rp.description}</p>}

                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                        <span className="text-slate-400">Sarapan:</span>
                        <span className={`font-semibold ${rp.includesBreakfast ? "text-emerald-400" : "text-slate-400"}`}>
                          {rp.includesBreakfast ? "Termasuk (Free Breakfast)" : "Room Only"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                        <span className="text-slate-400">Refundable:</span>
                        <span className={`font-semibold ${rp.isRefundable ? "text-blue-400" : "text-amber-400"}`}>
                          {rp.isRefundable ? "Dapat Dikembalikan" : "Non-Refundable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-700/50 text-xs text-slate-500 flex justify-between">
                    <span>Kebijakan Pembatalan: {rp.cancellationPolicy?.name || "Standar"}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Seasonal Rates Adjustment */}
      {activeTab === "calendar" && (
        <Card className="p-6 bg-slate-800/40 border-slate-700/80">
          <div className="max-w-xl">
            <h3 className="text-base font-bold text-white mb-1">Pengaturan Tarif Musiman / Weekend</h3>
            <p className="text-xs text-slate-400 mb-6">
              Tentukan harga khusus per malam untuk tipe kamar dan skema tarif tertentu pada rentang tanggal (misalnya libur hari raya atau musim ramai).
            </p>

            <form onSubmit={handleBulkRateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipe Kamar</label>
                <select
                  required
                  value={bulkRate.roomTypeId}
                  onChange={(e) => setBulkRate({ ...bulkRate, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Tipe Kamar</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rate Plan</label>
                <select
                  required
                  value={bulkRate.ratePlanId}
                  onChange={(e) => setBulkRate({ ...bulkRate, ratePlanId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Rate Plan</option>
                  {ratePlans.map((rp) => (
                    <option key={rp.id} value={rp.id}>{rp.name} ({rp.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={bulkRate.startDate}
                    onChange={(e) => setBulkRate({ ...bulkRate, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={bulkRate.endDate}
                    onChange={(e) => setBulkRate({ ...bulkRate, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Harga Per Malam (IDR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={bulkRate.price}
                  onChange={(e) => setBulkRate({ ...bulkRate, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all mt-4"
              >
                Terapkan Tarif Musiman
              </button>
            </form>
          </div>
        </Card>
      )}

      {/* Modal: Tambah Kamar */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Tambah Kamar Baru</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 101, 201A"
                  value={newRoom.roomNumber}
                  onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipe Kamar</label>
                <select
                  required
                  value={newRoom.roomTypeId}
                  onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Tipe Kamar</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lantai</label>
                  <input
                    type="number"
                    min={1}
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Keterangan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pemandangan taman"
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Simpan Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Tipe Kamar */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Tambah Tipe Kamar Baru</h2>
            <form onSubmit={handleCreateRoomType} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kode Unik (Kapital)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: DLX-KNG"
                    value={newType.code}
                    onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nama Tipe Kamar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Deluxe King"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Kapasitas Maksimal (Tamu)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={newType.maxOccupancy}
                    onChange={(e) => setNewType({ ...newType, maxOccupancy: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tarif Dasar / Malam (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    required
                    value={newType.basePrice}
                    onChange={(e) => setNewType({ ...newType, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fasilitas (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  placeholder="WiFi, AC, TV 50 inch, Bathtub, Mini bar"
                  value={newType.amenities}
                  onChange={(e) => setNewType({ ...newType, amenities: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Kamar luas dengan kasur king-size dan pemandangan kolam renang..."
                  value={newType.description}
                  onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Simpan Tipe Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Rate Plan */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Tambah Skema Tarif (Rate Plan)</h2>
            <form onSubmit={handleCreateRatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kode Rate Plan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BAR-BF, RO-PROMO"
                  value={newRatePlan.code}
                  onChange={(e) => setNewRatePlan({ ...newRatePlan, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Rate Plan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Best Available Rate with Breakfast"
                  value={newRatePlan.name}
                  onChange={(e) => setNewRatePlan({ ...newRatePlan, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newRatePlan.includesBreakfast}
                    onChange={(e) => setNewRatePlan({ ...newRatePlan, includesBreakfast: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Termasuk Sarapan (Breakfast Included)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newRatePlan.isRefundable}
                    onChange={(e) => setNewRatePlan({ ...newRatePlan, isRefundable: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Dapat Dikembalikan (Refundable)</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Simpan Rate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Atur Tarif Rentang Tanggal */}
      {showBulkRateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Atur Tarif Rentang Tanggal</h2>
            <form onSubmit={handleBulkRateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipe Kamar</label>
                <select
                  required
                  value={bulkRate.roomTypeId}
                  onChange={(e) => setBulkRate({ ...bulkRate, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Tipe Kamar</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rate Plan</label>
                <select
                  required
                  value={bulkRate.ratePlanId}
                  onChange={(e) => setBulkRate({ ...bulkRate, ratePlanId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Rate Plan</option>
                  {ratePlans.map((rp) => (
                    <option key={rp.id} value={rp.id}>{rp.name} ({rp.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={bulkRate.startDate}
                    onChange={(e) => setBulkRate({ ...bulkRate, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={bulkRate.endDate}
                    onChange={(e) => setBulkRate({ ...bulkRate, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Harga Per Malam (IDR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={bulkRate.price}
                  onChange={(e) => setBulkRate({ ...bulkRate, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulkRateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Terapkan Tarif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
