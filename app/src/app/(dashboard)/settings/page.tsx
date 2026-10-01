"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, LoadingSpinner } from "@/components/shared";

interface HotelSettingsData {
  id?: string;
  hotelName: string;
  address?: string | null;
  city?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  currency: string;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
  taxPercent: number | string;
  serviceChargePercent: number | string;
  allowOutstandingCheckout: boolean;
  generateInvoiceOnCheckout: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<HotelSettingsData>({
    hotelName: "",
    address: "",
    city: "",
    country: "Indonesia",
    phone: "",
    email: "",
    website: "",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    taxPercent: 0,
    serviceChargePercent: 0,
    allowOutstandingCheckout: false,
    generateInvoiceOnCheckout: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setSettings({
            ...json.data,
            taxPercent: Number(json.data.taxPercent || 0),
            serviceChargePercent: Number(json.data.serviceChargePercent || 0),
          });
        }
      })
      .catch(() => {
        notify("error", "Gagal memuat pengaturan properti");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          taxPercent: Number(settings.taxPercent),
          serviceChargePercent: Number(settings.serviceChargePercent),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyimpan pengaturan");
      notify("success", "Pengaturan hotel berhasil diperbarui");
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
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
        title="Pengaturan Properti & Hotel"
        description="Kelola profil hotel, jam operasional check-in/out, mata uang, dan kebijakan keuangan dasar."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Properti */}
        <Card className="p-6 bg-slate-800/40 border-slate-700/80 space-y-4">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white">Identitas & Kontak Hotel</h2>
            <p className="text-xs text-slate-400">Informasi ini dicantumkan pada konfirmasi reservasi dan faktur tamu.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama Hotel / Properti</label>
              <input
                type="text"
                required
                value={settings.hotelName}
                onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Resmi</label>
              <input
                type="email"
                value={settings.email || ""}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={settings.phone || ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={settings.address || ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Kota</label>
              <input
                type="text"
                value={settings.city || ""}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Website</label>
              <input
                type="text"
                value={settings.website || ""}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Waktu Operasional & Lokalisasi */}
        <Card className="p-6 bg-slate-800/40 border-slate-700/80 space-y-4">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white">Operasional & Lokalisasi</h2>
            <p className="text-xs text-slate-400">Aturan standar check-in / check-out dan format regional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Waktu Check-In Standar</label>
              <input
                type="text"
                placeholder="14:00"
                value={settings.checkInTime}
                onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Waktu Check-Out Standar</label>
              <input
                type="text"
                placeholder="12:00"
                value={settings.checkOutTime}
                onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mata Uang</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Zona Waktu</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Pajak & Biaya Layanan */}
        <Card className="p-6 bg-slate-800/40 border-slate-700/80 space-y-4">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white">Pajak, Layanan & Billing</h2>
            <p className="text-xs text-slate-400">Persentase pajak daerah dan biaya pelayanan yang diaplikasikan ke folio tamu.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Pajak Hotel / PB1 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.taxPercent}
                onChange={(e) => setSettings({ ...settings, taxPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Biaya Layanan / Service Charge (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.serviceChargePercent}
                onChange={(e) => setSettings({ ...settings, serviceChargePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2 space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.generateInvoiceOnCheckout}
                  onChange={(e) => setSettings({ ...settings, generateInvoiceOnCheckout: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Otomatis terbitkan Faktur / Invoice saat proses checkout selesai</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.allowOutstandingCheckout}
                  onChange={(e) => setSettings({ ...settings, allowOutstandingCheckout: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Izinkan checkout dengan sisa tagihan belum lunas (Outstanding balance)</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <LoadingSpinner className="w-4 h-4 text-white" /> : "💾 Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
