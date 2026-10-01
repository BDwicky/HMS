"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LoadingSpinner, EmptyState } from "@/components/shared";

interface HousekeepingTaskItem {
  id: string;
  roomId: string;
  status: string;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  inspectedAt?: string | null;
  room: {
    roomNumber: string;
    status: string;
    floor?: number | null;
    roomType: { name: string };
  };
  assignedTo?: { name: string; email: string } | null;
}

interface MaintenanceItem {
  id: string;
  roomId: string;
  category?: string | null;
  description: string;
  priority: string;
  status: string;
  resolvedAt?: string | null;
  room: {
    roomNumber: string;
    status: string;
  };
}

const TASK_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Menunggu Pembersihan", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400" },
  IN_PROGRESS: { label: "Sedang Dibersihkan", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  DONE: { label: "Selesai & Bersih", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  FAILED_INSPECTION: { label: "Inspeksi Gagal", bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
};

const PRIORITY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  LOW: { label: "Rendah", bg: "bg-slate-700/50 border-slate-600", text: "text-slate-300" },
  MEDIUM: { label: "Sedang", bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400" },
  HIGH: { label: "Tinggi", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  URGENT: { label: "Mendesak", bg: "bg-rose-500/20 border-rose-500/40", text: "text-rose-400" },
};

export default function HousekeepingPage() {
  const [activeTab, setActiveTab] = useState<"cleaning" | "maintenance">("cleaning");
  const [tasks, setTasks] = useState<HousekeepingTaskItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Maintenance form
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [rooms, setRooms] = useState<Array<{ id: string; roomNumber: string }>>([]);
  const [newMaint, setNewMaint] = useState({
    roomId: "",
    category: "FASILITAS",
    description: "",
    priority: "MEDIUM",
    takeOutOfService: false,
  });

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/housekeeping/tasks?limit=50").then((r) => r.json()),
        fetch("/api/maintenance?limit=50").then((r) => r.json()),
      ]);

      if (tRes.data) setTasks(tRes.data);
      if (mRes.data) setMaintenance(mRes.data);
    } catch {
      notify("error", "Gagal mengambil data tugas housekeeping");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setRooms(json.data);
      })
      .catch(() => {});
  }, []);

  const handleTaskAction = async (taskId: string, action: string, notes?: string) => {
    try {
      const res = await fetch(`/api/housekeeping/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal memperbarui status tugas");

      notify("success", "Status tugas berhasil diperbarui");
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMaint),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal melaporkan kerusakan");

      notify("success", "Laporan perbaikan berhasil dibuat");
      setShowMaintModal(false);
      setNewMaint({ roomId: "", category: "FASILITAS", description: "", priority: "MEDIUM", takeOutOfService: false });
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleResolveMaintenance = async (maintId: string) => {
    try {
      const res = await fetch(`/api/maintenance/${maintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menyelesaikan perbaikan");

      notify("success", "Perbaikan diselesaikan; kamar dialihkan ke status Dirty untuk dibersihkan");
      fetchData();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  // Stats
  const pendingCleaning = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCleaning = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inspectionReady = tasks.filter((t) => t.room.status === "INSPECTION").length;
  const activeRepairs = maintenance.filter((m) => m.status === "OPEN" || m.status === "IN_PROGRESS").length;

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
        title="Housekeeping & Perawatan Kamar"
        description="Kelola alur siklus kamar: Kotor (Dirty) → Pembersihan → Inspeksi Kebersihan → Siap Dijual (Available)."
        action={
          <button
            onClick={() => setShowMaintModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
          >
            <span>🔧</span> Laporkan Perbaikan
          </button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-rose-950/20 border-rose-500/30 flex flex-col">
          <span className="text-xs text-rose-400 font-medium">Kamar Perlu Dibersihkan</span>
          <span className="text-2xl font-bold text-rose-300 mt-1">{pendingCleaning}</span>
        </Card>
        <Card className="p-4 bg-amber-950/20 border-amber-500/30 flex flex-col">
          <span className="text-xs text-amber-400 font-medium">Sedang Dibersihkan</span>
          <span className="text-2xl font-bold text-amber-300 mt-1">{inProgressCleaning}</span>
        </Card>
        <Card className="p-4 bg-blue-950/20 border-blue-500/30 flex flex-col">
          <span className="text-xs text-blue-400 font-medium">Siap Diinspeksi</span>
          <span className="text-2xl font-bold text-blue-300 mt-1">{inspectionReady}</span>
        </Card>
        <Card className="p-4 bg-purple-950/20 border-purple-500/30 flex flex-col">
          <span className="text-xs text-purple-400 font-medium">Laporan Perbaikan Aktif</span>
          <span className="text-2xl font-bold text-purple-300 mt-1">{activeRepairs}</span>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700/60 space-x-2">
        <button
          onClick={() => setActiveTab("cleaning")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "cleaning"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🧹 Antrean Tugas Kebersihan ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "maintenance"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🔧 Perawatan & Maintenance ({maintenance.length})
        </button>
      </div>

      {/* Tab 1: Cleaning Tasks */}
      {activeTab === "cleaning" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center"><LoadingSpinner /></div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="Semua kamar dalam kondisi bersih"
              description="Tidak ada antrean pembersihan aktif saat ini. Kamar siap dioperasikan."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => {
                const conf = TASK_STATUS_MAP[task.status] || {
                  label: task.status,
                  bg: "bg-slate-700/50 border-slate-600",
                  text: "text-slate-300",
                };

                return (
                  <Card
                    key={task.id}
                    className="p-5 bg-slate-800/40 border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-2xl font-black text-white tracking-wide">
                            Kamar {task.room.roomNumber}
                          </span>
                          <span className="block text-xs text-slate-400 mt-0.5">
                            Lantai {task.room.floor ?? 1} • {task.room.roomType.name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${conf.bg} ${conf.text}`}>
                          {conf.label}
                        </span>
                      </div>

                      {task.notes && (
                        <p className="text-xs text-slate-300 mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                          {task.notes}
                        </p>
                      )}

                      <div className="mt-3 text-xs text-slate-400 space-y-1">
                        <div>
                          Staf: <span className="text-slate-200">{task.assignedTo?.name || "Belum ditugaskan"}</span>
                        </div>
                        <div>
                          Status Kamar Fisik: <span className="font-semibold text-white">{task.room.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Flow */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2 justify-end text-xs">
                      {task.status === "PENDING" && (
                        <button
                          onClick={() => handleTaskAction(task.id, "START")}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                        >
                          Mulai Bersihkan
                        </button>
                      )}

                      {task.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleTaskAction(task.id, "COMPLETE")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                        >
                          Selesai (Siap Inspeksi)
                        </button>
                      )}

                      {task.room.status === "INSPECTION" && (
                        <>
                          <button
                            onClick={() => handleTaskAction(task.id, "INSPECT_FAIL", "Perlu perapian ulang")}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-medium transition-colors"
                          >
                            Inspeksi Gagal
                          </button>
                          <button
                            onClick={() => handleTaskAction(task.id, "INSPECT_PASS", "Lulus inspeksi bersih")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                          >
                            Lulus (Set Available)
                          </button>
                        </>
                      )}

                      {task.status === "FAILED_INSPECTION" && task.room.status === "CLEANING" && (
                        <button
                          onClick={() => handleTaskAction(task.id, "COMPLETE")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                        >
                          Selesai Perbaikan
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Maintenance Requests */}
      {activeTab === "maintenance" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center"><LoadingSpinner /></div>
          ) : maintenance.length === 0 ? (
            <EmptyState
              title="Tidak ada laporan kerusakan aktif"
              description="Seluruh fasilitas kamar dalam kondisi optimal."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maintenance.map((m) => {
                const prio = PRIORITY_MAP[m.priority] || { label: m.priority, bg: "bg-slate-700/50", text: "text-slate-300" };
                const isClosed = m.status === "RESOLVED" || m.status === "CLOSED";

                return (
                  <Card
                    key={m.id}
                    className="p-5 bg-slate-800/40 border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-xl font-bold text-white">
                          Kamar {m.room.roomNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${prio.bg} ${prio.text}`}>
                          {prio.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 mt-2 font-medium">
                        {m.description}
                      </p>

                      <div className="mt-3 text-xs text-slate-400 space-y-1">
                        <div>Kategori: {m.category || "Fasilitas"}</div>
                        <div>
                          Status:{" "}
                          <span className={`font-semibold ${isClosed ? "text-emerald-400" : "text-amber-400"}`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end text-xs">
                      {!isClosed && (
                        <button
                          onClick={() => handleResolveMaintenance(m.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                        >
                          Selesaikan Perbaikan
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Laporkan Perbaikan */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Laporkan Kerusakan / Perawatan</h2>
            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pilih Kamar *</label>
                <select
                  required
                  value={newMaint.roomId}
                  onChange={(e) => setNewMaint({ ...newMaint, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Kamar</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Kamar {r.roomNumber}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prioritas</label>
                <select
                  value={newMaint.priority}
                  onChange={(e) => setNewMaint({ ...newMaint, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="LOW">Rendah (Kosmetik)</option>
                  <option value="MEDIUM">Sedang (Standar)</option>
                  <option value="HIGH">Tinggi (Perlu Segera Diperbaiki)</option>
                  <option value="URGENT">Mendesak (Kamar Tidak Boleh Dijual)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deskripsi Kerusakan *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: AC tidak dingin, keran wastafel bocor, lampu balkon putus..."
                  value={newMaint.description}
                  onChange={(e) => setNewMaint({ ...newMaint, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newMaint.takeOutOfService}
                    onChange={(e) => setNewMaint({ ...newMaint, takeOutOfService: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tutup kamar dari penjualan (Out of Service)</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
