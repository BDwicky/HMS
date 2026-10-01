"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, LoadingSpinner, EmptyState } from "@/components/shared";

interface GuestDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  fileUrl?: string | null;
  verifiedAt?: string | null;
}

interface GuestItem {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  notes?: string | null;
  documents: GuestDocument[];
  _count: {
    reservations: number;
    stays: number;
  };
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestItem | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Form states
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "Indonesia",
    notes: "",
  });

  const [newDoc, setNewDoc] = useState({
    documentType: "KTP",
    documentNumber: "",
    fileUrl: "",
    isVerified: true,
  });

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const q = encodeURIComponent(search);
      const res = await fetch(`/api/guests?query=${q}&page=${page}&limit=12`);
      const json = await res.json();
      if (json.data) {
        setGuests(json.data);
        if (json.meta) {
          setTotalPages(json.meta.totalPages || 1);
          setTotalCount(json.meta.total || 0);
        }
      }
    } catch {
      notify("error", "Gagal memuat data tamu");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const checkDuplicate = async (email: string, phone: string) => {
    if (!email && !phone) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await fetch(`/api/guests/duplicate-check?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (json.data?.hasDuplicate) {
        setDuplicateWarning(`Perhatian: Ditemukan ${json.data.matches.length} tamu dengan nomor telepon atau email serupa.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore background check failure
    }
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGuest),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal mendaftarkan tamu");

      notify("success", `Tamu ${newGuest.firstName} berhasil didaftarkan`);
      setShowCreateModal(false);
      setNewGuest({ firstName: "", lastName: "", email: "", phone: "", nationality: "Indonesia", notes: "" });
      setDuplicateWarning(null);
      fetchGuests();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuest) return;

    try {
      const res = await fetch(`/api/guests/${selectedGuest.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menambahkan dokumen");

      notify("success", "Dokumen identitas berhasil ditambahkan");
      setShowDocModal(false);
      setNewDoc({ documentType: "KTP", documentNumber: "", fileUrl: "", isVerified: true });
      fetchGuests();
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
        title="Direktori Data Tamu"
        description="Kelola profil tamu hotel, verifikasi dokumen identitas (KTP, SIM, Passport), dan riwayat kunjungan."
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <span>+</span> Tambah Tamu Baru
          </button>
        }
      />

      {/* Search & Stats Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari nama, email, atau telepon..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Total Terdaftar: <span className="font-semibold text-white">{totalCount} Tamu</span>
        </div>
      </div>

      {/* Guests Grid / List */}
      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner /></div>
      ) : guests.length === 0 ? (
        <EmptyState
          title="Tidak ada data tamu ditemukan"
          description={search ? "Tidak ada tamu yang cocok dengan kata kunci pencarian Anda." : "Belum ada tamu terdaftar dalam sistem."}
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
            >
              Daftarkan Tamu Pertama
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((guest) => {
            const fullName = `${guest.firstName} ${guest.lastName || ""}`.trim();
            return (
              <Card
                key={guest.id}
                className="p-5 bg-slate-800/40 border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wide">{fullName}</h3>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        🌏 {guest.nationality || "Indonesia"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGuest(guest);
                        setShowDocModal(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
                    >
                      + Dokumen
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {guest.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span>✉️</span>
                        <span className="truncate">{guest.email}</span>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center gap-1.5">
                        <span>📞</span>
                        <span>{guest.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Documents Badges */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {guest.documents.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">Belum ada dokumen</span>
                    ) : (
                      guest.documents.map((doc) => (
                        <span
                          key={doc.id}
                          className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[11px] text-blue-300 flex items-center gap-1"
                        >
                          📄 {doc.documentType}: {doc.documentNumber}
                          {doc.verifiedAt && <span className="text-emerald-400">✓</span>}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                  <span>📅 {guest._count.reservations} Reservasi</span>
                  <span>🏨 {guest._count.stays} Kunjungan / Stay</span>
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

      {/* Modal: Tambah Tamu */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Registrasi Tamu Baru</h2>

            {duplicateWarning && (
              <div className="p-3 mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                {duplicateWarning}
              </div>
            )}

            <form onSubmit={handleCreateGuest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nama Depan *</label>
                  <input
                    type="text"
                    required
                    value={newGuest.firstName}
                    onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nama Belakang</label>
                  <input
                    type="text"
                    value={newGuest.lastName}
                    onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  onBlur={() => checkDuplicate(newGuest.email, newGuest.phone)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  onBlur={() => checkDuplicate(newGuest.email, newGuest.phone)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kewarganegaraan</label>
                <input
                  type="text"
                  value={newGuest.nationality}
                  onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Catatan Khusus Tamu</label>
                <textarea
                  rows={2}
                  placeholder="Preferensi kamar, alergi, atau catatan staf..."
                  value={newGuest.notes}
                  onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end mt-5 pt-2">
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
                  Daftarkan Tamu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Dokumen Identitas */}
      {showDocModal && selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Tambah Dokumen Identitas</h2>
            <p className="text-xs text-slate-400 mb-4">
              Untuk tamu: <span className="font-semibold text-white">{selectedGuest.firstName} {selectedGuest.lastName || ""}</span>
            </p>

            <form onSubmit={handleAddDocument} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Jenis Dokumen</label>
                <select
                  value={newDoc.documentType}
                  onChange={(e) => setNewDoc({ ...newDoc, documentType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="KTP">KTP (Kartu Tanda Penduduk)</option>
                  <option value="SIM">SIM (Surat Izin Mengemudi)</option>
                  <option value="PASSPORT">Paspor Internasional</option>
                  <option value="OTHER">Lainnya / Identitas Resmi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nomor Dokumen (NIK / Paspor)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 3171xxxxxxxxxxxx"
                  value={newDoc.documentNumber}
                  onChange={(e) => setNewDoc({ ...newDoc, documentNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tautan / File Dokumen (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://storage.../doc.jpg"
                  value={newDoc.fileUrl}
                  onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newDoc.isVerified}
                    onChange={(e) => setNewDoc({ ...newDoc, isVerified: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Verifikasi identitas fisik telah dicocokkan (Verified)</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end mt-5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Simpan Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
