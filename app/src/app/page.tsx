"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/currency";

interface AvailableRoomType {
  roomTypeId: string;
  code: string;
  name: string;
  description?: string | null;
  maxOccupancy: number;
  basePrice: number;
  amenities: string[];
  totalRooms: number;
  availableRooms: number;
  ratePlanId?: string;
  ratePlanName?: string;
}

interface ReservationConfirmation {
  id: string;
  bookingReference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  roomTypeName?: string;
}

interface LookupResult {
  bookingReference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: { firstName: string; lastName?: string | null; email?: string | null };
  totalAmount: number;
  folio?: { balanceAmount: number; status: string } | null;
}

export default function GuestBookingPortal() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Search filter
  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(dayAfterTomorrow);
  const [adults, setAdults] = useState(2);

  // States
  const [searching, setSearching] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomType[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Booking Modal
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoomType | null>(null);
  const [bookingForm, setBookingForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    identityNumber: "",
    specialRequest: "",
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationConfirmation | null>(null);

  // Lookup Modal
  const [showLookup, setShowLookup] = useState(false);
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // Search availability
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setConfirmedReservation(null);

    try {
      const res = await fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mencari ketersediaan kamar");
      }
      setAvailableRooms(json.data?.roomTypes || []);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa kamar");
    } finally {
      setSearching(false);
    }
  };

  // Submit booking
  const handleBookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const payload = {
        source: "ONLINE",
        checkIn,
        checkOut,
        adults,
        children: 0,
        specialRequest: bookingForm.specialRequest || undefined,
        guest: {
          firstName: bookingForm.firstName,
          lastName: bookingForm.lastName || undefined,
          email: bookingForm.email,
          phone: bookingForm.phone,
          identityNumber: bookingForm.identityNumber || undefined,
        },
        items: [
          {
            roomTypeId: selectedRoom.roomTypeId,
            ratePlanId: selectedRoom.ratePlanId || undefined,
            quantity: 1,
          },
        ],
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal memproses pemesanan");
      }

      setConfirmedReservation({
        id: json.data.id,
        bookingReference: json.data.bookingReference,
        status: json.data.status,
        checkIn: json.data.checkIn,
        checkOut: json.data.checkOut,
        totalAmount: Number(json.data.totalAmount),
        roomTypeName: selectedRoom.name,
      });

      setSelectedRoom(null);
      // Reset form
      setBookingForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        identityNumber: "",
        specialRequest: "",
      });
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Gagal memesan kamar");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Handle self-service lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch(
        `/api/reservations/lookup?bookingReference=${encodeURIComponent(lookupRef)}&email=${encodeURIComponent(lookupEmail)}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Reservasi tidak ditemukan atau data tidak cocok");
      }
      setLookupResult(json.data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Gagal mencari data reservasi");
    } finally {
      setLookupLoading(false);
    }
  };

  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">Grand Horizon</span>
              <span className="text-xs text-blue-400 block leading-none font-medium">Hotel &amp; Resort</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowLookup(true);
                setLookupResult(null);
                setLookupError(null);
              }}
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Cek Pemesanan
            </button>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3.5 py-1.5 rounded-xl hover:bg-blue-500/10 transition"
            >
              Masuk Staf →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Search Engine */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            ★ Kenyamanan &amp; Kemewahan Terbaik
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Pesan Kamar Nyaman untuk <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Pengalaman Menginap Terbaik
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base">
            Nikmati fasilitas premium, pelayanan ramah 24 jam, dan jaminan harga terbaik dengan konfirmasi instan.
          </p>

          {/* Search Box Widget */}
          <form
            onSubmit={handleSearch}
            className="mt-8 bg-slate-900/90 border border-slate-700/80 p-4 sm:p-5 rounded-2xl shadow-2xl backdrop-blur-xl grid grid-cols-1 sm:grid-cols-4 gap-4 text-left"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Check-in
              </label>
              <input
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Check-out (Eksklusif)
              </label>
              <input
                type="date"
                required
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Tamu Dewasa
              </label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} Orang
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={searching}
                className="w-full h-10 sm:h-11 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Cari Kamar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        {/* Booking Confirmation Banner */}
        {confirmedReservation && (
          <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pemesanan Berhasil Dibuat!</h2>
                <p className="text-sm text-emerald-300">
                  Konfirmasi telah dikirim ke email Anda. Simpan nomor referensi berikut.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Nomor Referensi</span>
                <span className="font-mono font-bold text-white text-base">
                  {confirmedReservation.bookingReference}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Jadwal Menginap</span>
                <span className="font-medium text-slate-200">
                  {confirmedReservation.checkIn} s/d {confirmedReservation.checkOut}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Kamar</span>
                <span className="font-medium text-slate-200">
                  {confirmedReservation.roomTypeName || "Kamar Pilihan"}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Total Biaya</span>
                <span className="font-bold text-emerald-400 text-base">
                  {formatRupiah(confirmedReservation.totalAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Metode pembayaran dapat diselesaikan melalui transfer atau langsung di meja resepsionis saat check-in.
            </p>
          </div>
        )}

        {searchError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
            {searchError}
          </div>
        )}

        {/* Results List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                {availableRooms !== null
                  ? `Hasil Pencarian Kamar (${calculateNights()} Malam)`
                  : "Pilihan Tipe Kamar Populer"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tarif sudah termasuk pajak &amp; biaya layanan standar
              </p>
            </div>
            {availableRooms !== null && (
              <span className="text-xs text-blue-400 font-medium">
                {availableRooms.length} tipe kamar tersedia
              </span>
            )}
          </div>

          {availableRooms !== null && availableRooms.length === 0 && (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <p className="text-slate-400 text-sm">
                Maaf, tidak ada kamar yang tersedia pada rentang tanggal tersebut.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Silakan coba ubah tanggal check-in atau check-out Anda.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(availableRooms || [
              {
                roomTypeId: "demo-1",
                code: "STD",
                name: "Standard Double Room",
                description: "Kamar nyaman dengan tempat tidur Queen-size, AC, WiFi cepat, dan shower air panas.",
                maxOccupancy: 2,
                basePrice: 450000,
                amenities: ["WiFi", "AC", "Smart TV", "Shower"],
                totalRooms: 10,
                availableRooms: 5,
              },
              {
                roomTypeId: "demo-2",
                code: "DLX",
                name: "Deluxe King Room",
                description: "Kamar luas dengan tempat tidur King-size, pemandangan kota, dan sarapan lezat.",
                maxOccupancy: 2,
                basePrice: 750000,
                amenities: ["WiFi", "AC", "King Bed", "Sarapan", "Bathtub"],
                totalRooms: 8,
                availableRooms: 4,
              },
              {
                roomTypeId: "demo-3",
                code: "STE",
                name: "Executive Family Suite",
                description: "Suite mewah dengan ruang tamu terpisah, 2 tempat tidur besar, dan akses lounge eksekutif.",
                maxOccupancy: 4,
                basePrice: 1350000,
                amenities: ["WiFi", "Ruang Tamu", "Kulkas", "2 Bed", "Balkon"],
                totalRooms: 4,
                availableRooms: 2,
              },
            ]).map((room) => (
              <div
                key={room.roomTypeId}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col transition duration-200 group"
              >
                {/* Room visual card banner */}
                <div className="h-44 bg-gradient-to-tr from-slate-800 to-slate-700 relative p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900/80 text-white backdrop-blur">
                      Kapasitas {room.maxOccupancy} Tamu
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur">
                      Tersedia: {room.availableRooms} Kamar
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono tracking-wider text-blue-400 font-bold">
                      {room.code}
                    </span>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                      {room.name}
                    </h3>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-400 text-xs line-clamp-2">
                    {room.description || "Kamar berkualitas dengan fasilitas lengkap untuk kenyamanan tidur Anda."}
                  </p>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 4).map((a, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">Mulai dari</span>
                      <div className="text-lg font-bold text-white">
                        {formatRupiah(room.basePrice)}
                        <span className="text-xs font-normal text-slate-400"> /malam</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setBookingError(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-blue-500/20"
                    >
                      Pilih &amp; Pesan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Reservasi: {selectedRoom.name}</h3>
                <p className="text-xs text-slate-400">
                  {checkIn} s/d {checkOut} ({calculateNights()} malam) • {adults} Tamu
                </p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Depan *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingForm.firstName}
                    onChange={(e) => setBookingForm({ ...bookingForm, firstName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Budi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nama Belakang</label>
                  <input
                    type="text"
                    value={bookingForm.lastName}
                    onChange={(e) => setBookingForm({ ...bookingForm, lastName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Santoso"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="budi@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">No. WhatsApp/HP *</label>
                  <input
                    type="tel"
                    required
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nomor Identitas (KTP / Paspor)
                </label>
                <input
                  type="text"
                  value={bookingForm.identityNumber}
                  onChange={(e) => setBookingForm({ ...bookingForm, identityNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="3201xxxxxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Permintaan Khusus</label>
                <textarea
                  rows={2}
                  value={bookingForm.specialRequest}
                  onChange={(e) => setBookingForm({ ...bookingForm, specialRequest: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Non-smoking room, lantai atas..."
                />
              </div>

              {/* Price Estimation */}
              <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>
                    Tarif Kamar ({formatRupiah(selectedRoom.basePrice)} × {calculateNights()} malam)
                  </span>
                  <span className="text-white font-medium">
                    {formatRupiah(selectedRoom.basePrice * calculateNights())}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Pajak &amp; Layanan (10%)</span>
                  <span className="text-white font-medium">
                    {formatRupiah(selectedRoom.basePrice * calculateNights() * 0.1)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-700 text-sm">
                  <span>Estimasi Total</span>
                  <span>
                    {formatRupiah(selectedRoom.basePrice * calculateNights() * 1.1)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 py-2.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex-1 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {bookingSubmitting ? "Memproses..." : "Konfirmasi & Pesan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self-Service Lookup Modal */}
      {showLookup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Cari Status Pemesanan</h3>
              <button
                onClick={() => setShowLookup(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLookup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nomor Referensi Booking
                </label>
                <input
                  type="text"
                  required
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value.toUpperCase())}
                  placeholder="BK-20261001-XXXX"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Pemesan
                </label>
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {lookupError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                  {lookupError}
                </div>
              )}

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-md shadow-blue-500/25"
              >
                {lookupLoading ? "Mencari data..." : "Periksa Pemesanan"}
              </button>
            </form>

            {lookupResult && (
              <div className="mt-4 p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="font-mono font-bold text-white">{lookupResult.bookingReference}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {lookupResult.status}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Nama Tamu</span>
                  <span className="text-white font-medium">
                    {lookupResult.guest.firstName} {lookupResult.guest.lastName || ""}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Check-in / Out</span>
                  <span className="text-white font-medium">
                    {new Date(lookupResult.checkIn).toLocaleDateString("id-ID")} -{" "}
                    {new Date(lookupResult.checkOut).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Tagihan</span>
                  <span className="text-emerald-400 font-bold">
                    {formatRupiah(lookupResult.totalAmount)}
                  </span>
                </div>
                {lookupResult.folio && (
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-700">
                    <span>Sisa Tagihan (Balance)</span>
                    <span className="text-amber-400 font-bold">
                      {formatRupiah(lookupResult.folio.balanceAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Grand Horizon Hotel &amp; Resort. All rights reserved.</p>
        <p className="mt-1">Sistem Manajemen Hotel Terpadu (HMS Enterprise v1.0)</p>
      </footer>
    </div>
  );
}
