"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils/currency";

interface LookupResult {
  bookingReference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: { firstName: string; lastName?: string | null; email?: string | null; phone?: string | null };
  totalAmount: number;
  folio?: { balanceAmount: number; status: string } | null;
}

export default function MarinaBaySandsLanding() {
  const router = useRouter();

  // Helper date generators
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getDayAfterTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  };

  // Search parameters for dynamic island bar
  const [checkIn, setCheckIn] = useState(getTomorrowDate());
  const [checkOut, setCheckOut] = useState(getDayAfterTomorrowDate());
  const [adults, setAdults] = useState(2);
  const [ratePlan, setRatePlan] = useState("BEST-FLEX");

  // Sidebar Menu Drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Video State & Controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const videoSources = [
    {
      src: "/videos/mbs-skypark.webm",
      title: "Sands SkyPark Infinity Pool 57F",
      subtitle: "200m di atas cakrawala Singapura",
    },
    {
      src: "/videos/singapore-city.webm",
      title: "Panorama Cakrawala Marina Bay",
      subtitle: "Pemandangan spektakuler teluk dan kota",
    },
  ];

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const switchVideo = () => {
    setActiveVideoIndex((prev) => (prev + 1) % videoSources.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [activeVideoIndex]);

  // Reservation Lookup State
  const [showLookup, setShowLookup] = useState(false);
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const q = new URLSearchParams({ bookingReference: lookupRef.trim() });
      if (lookupEmail.trim()) q.set("email", lookupEmail.trim());

      const res = await fetch(`/api/reservations/lookup?${q.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Reservasi tidak ditemukan.");
      }

      setLookupResult(json.data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Gagal mencari reservasi.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle redirect to dedicated 4-step booking page
  const handleSearchBooking = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    router.push(`/booking/search.html?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&step=2`);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 selection:bg-[#c5a059]/30 selection:text-stone-900 font-sans">
      {/* ── 1. TOP UTILITY BAR (EXACT MODEL FROM media_1790839169866.png) ── */}
      <div className="bg-[#0a0a0c] text-stone-300 text-[11px] border-b border-white/10 hidden md:block">
        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-2 flex items-center justify-between">
          {/* Left: Quick Links */}
          <div className="flex items-center gap-4 text-stone-400">
            <span className="hover:text-white transition-colors cursor-pointer uppercase tracking-wider text-[10px] font-semibold">
              Sands LifeStyle
            </span>
            <span className="text-stone-700">|</span>
            <span className="hover:text-white transition-colors cursor-pointer uppercase tracking-wider text-[10px] font-semibold">
              Acara &amp; Atraksi
            </span>
            <span className="text-stone-700">|</span>
            <span className="text-[10px] text-stone-500">10 Bayfront Avenue, Singapore 018956</span>
          </div>

          {/* Right: Cek Reservasi & Portal Staf */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowLookup(true)}
              className="text-stone-300 hover:text-[#dfb76c] transition-colors flex items-center gap-1.5 cursor-pointer uppercase text-[10px] tracking-wider font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-[#dfb76c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Cek Reservasi</span>
            </button>
            <span className="text-stone-700">|</span>
            <Link
              href="/login"
              className="text-[#dfb76c] hover:underline uppercase text-[10px] tracking-wider font-semibold flex items-center gap-1"
            >
              <span>Portal Staf</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. PRIMARY NAVBAR (EXACT MODEL FROM media_1790839169866.png) ── */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-md border-b border-white/10 transition-all duration-300">
        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 h-20 flex items-center justify-between">
          {/* Left: Hamburger Menu Trigger + Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-white hover:text-[#dfb76c] flex items-center gap-2.5 transition cursor-pointer"
            >
              <span className="flex flex-col gap-1 w-5">
                <span className="h-[2px] w-full bg-white transition-colors" />
                <span className="h-[2px] w-full bg-white transition-colors" />
                <span className="h-[2px] w-3 bg-white transition-colors" />
              </span>
              <span className="text-xs uppercase font-bold tracking-[0.2em]">Menu</span>
            </button>

            <span className="h-6 w-[1px] bg-white/20 hidden sm:block" />

            <Link href="/" className="flex items-center gap-3 group">
              <svg className="w-7 h-5 text-[#dfb76c]" viewBox="0 0 24 16" fill="currentColor">
                <path d="M2 14V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11H2zm7 0V1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13H9zm7 0V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11h-4z" />
                <path d="M1 2.5C3 1.2 9 .5 12 .5s9 .7 11 2v1c-2-1.3-8-2-11-2S3 2.2 1 3.5v-1z" />
              </svg>
              <div className="flex flex-col">
                <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.25em] text-white">
                  MARINA BAY SANDS
                </span>
                <span className="text-[8px] uppercase tracking-[0.35em] text-[#dfb76c] -mt-1 font-semibold">
                  SINGAPORE
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-stone-300">
            <Link href="/booking/search.html" className="hover:text-[#dfb76c] transition-colors">
              Menginap
            </Link>
            <a href="#skypark" className="hover:text-[#dfb76c] transition-colors">
              SkyPark &amp; Kolam
            </a>
            <a href="#dining" className="hover:text-[#dfb76c] transition-colors">
              Kuliner
            </a>
            <a href="#attractions" className="hover:text-[#dfb76c] transition-colors">
              Atraksi
            </a>
            <a href="#rewards" className="hover:text-[#dfb76c] transition-colors">
              Rewards
            </a>
          </nav>

          {/* Right: PESAN KAMAR CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/booking/search.html"
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfb76c] hover:text-white transition-colors underline underline-offset-8 decoration-1 decoration-[#dfb76c]/60 hover:decoration-white flex items-center gap-1.5"
            >
              <span>Pesan Kamar</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 3. SIDEBAR DRAWER MENU ────────────────────────────── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#0d0d10] text-white p-8 sm:p-10 shadow-2xl flex flex-col justify-between z-10 border-r border-stone-800">
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-stone-800 pb-6">
                <span className="font-cinzel text-lg font-bold text-[#dfb76c] tracking-widest">
                  MARINA BAY SANDS
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-stone-400 hover:text-white transition-colors text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-4">
                {[
                  { name: "Koleksi Kamar & Suite", href: "/booking/search.html" },
                  { name: "Sands SkyPark & Infinity Pool", href: "#skypark" },
                  { name: "Restoran & Fine Dining", href: "#dining" },
                  { name: "Atraksi & ArtScience Museum", href: "#attractions" },
                  { name: "Sands LifeStyle Rewards", href: "#rewards" },
                  { name: "Portal Operasional Staf", href: "/login" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className="block text-base font-cinzel font-semibold text-stone-300 hover:text-[#dfb76c] hover:translate-x-2 transition-all py-1.5"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-6 border-t border-stone-800 space-y-3">
              <Link
                href="/booking/search.html"
                onClick={() => setIsSidebarOpen(false)}
                className="w-full py-3.5 rounded-full bg-[#dfb76c] hover:bg-[#c5a059] text-black font-bold text-xs uppercase tracking-[0.25em] text-center block transition-all"
              >
                Pesan Kamar Sekarang
              </Link>
              <p className="text-center text-[10px] text-stone-500 uppercase tracking-widest">
                10 Bayfront Avenue, Singapore 018956
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. HERO SECTION WITH LUXURY VIDEO & DOCK (HEIGHT ~80VH / 800PX) ─ */}
      <section className="relative w-full h-[80vh] min-h-[650px] max-h-[850px] flex items-center justify-center overflow-hidden bg-black text-white">
        {/* Fullscreen Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            key={videoSources[activeVideoIndex].src}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            poster="/images/mbs-night.jpg"
            className="w-full h-full object-cover object-center scale-[1.02] transition-transform duration-1000 brightness-[0.78] contrast-[1.05]"
          >
            <source src={videoSources[activeVideoIndex].src} type="video/webm" />
            <source src="/videos/mbs-skypark.webm" type="video/webm" />
          </video>
          {/* Gradients overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50 pointer-events-none" />
        </div>

        {/* Video Perspective Dock (Top Badges & Switcher from media_1790839169866.png) */}
        <div className="absolute top-6 left-0 right-0 z-20 w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 flex items-center justify-between text-xs">
          {/* Top-Left Live Video Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#dfb76c] animate-pulse" />
            <span>{videoSources[activeVideoIndex].title}</span>
          </div>

          {/* Top-Right Video Controls */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-full text-white text-[11px] font-semibold">
            <button
              type="button"
              onClick={switchVideo}
              title="Ganti Sudut Pandang Video"
              className="px-3 py-1 rounded-full hover:text-[#dfb76c] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>↺ Ganti Sudut</span>
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? "Jeda Video" : "Putar Video"}
              className="px-2 py-1 hover:text-[#dfb76c] transition-colors cursor-pointer"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? "Aktifkan Suara" : "Bisukan"}
              className="px-2 py-1 hover:text-[#dfb76c] transition-colors cursor-pointer"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        {/* Hero Typography (from media_1790839169866.png) */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.35em] text-[#dfb76c] uppercase drop-shadow-md">
            Where Extraordinary Happens
          </p>
          <h1 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-light tracking-[0.1em] text-white leading-tight drop-shadow-xl">
            AN ICON REIMAGINED
          </h1>
          <div className="pt-4 flex items-center justify-center gap-6 text-xs uppercase font-bold tracking-[0.25em] text-stone-300">
            <Link
              href="/booking/search.html"
              className="text-[#dfb76c] hover:underline hover:text-white transition-colors"
            >
              Jelajahi Suite →
            </Link>
            <span className="text-stone-500">•</span>
            <a
              href="#skypark"
              className="hover:underline hover:text-white transition-colors"
            >
              The SkyPark →
            </a>
          </div>
        </div>
      </section>

      {/* ── 5. DYNAMIC ISLAND BOOKING BAR (DIRECTS TO 4-STEP FLOW) ── */}
      <div className="relative z-20 -mt-10 sm:-mt-12 max-w-[1300px] mx-auto px-4 w-full">
        <form
          onSubmit={handleSearchBooking}
          className="bg-black/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/70 text-white flex flex-col lg:flex-row items-center justify-between gap-4"
        >
          {/* Check-In */}
          <div className="w-full lg:w-1/4 px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#dfb76c] mb-1">
              Check-In
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Check-Out */}
          <div className="w-full lg:w-1/4 px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#dfb76c] mb-1">
              Check-Out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Tamu */}
          <div className="w-full lg:w-1/4 px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#dfb76c] mb-1">
              Tamu & Kamar
            </label>
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-stone-900"
            >
              <option value={1}>1 Dewasa, 1 Kamar</option>
              <option value={2}>2 Dewasa, 1 Kamar</option>
              <option value={3}>3 Dewasa, 1 Kamar</option>
              <option value={4}>4 Dewasa, 2 Kamar</option>
            </select>
          </div>

          {/* Pilihan Tarif */}
          <div className="w-full lg:w-1/4 px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#dfb76c] mb-1">
              Pilihan Tarif
            </label>
            <select
              value={ratePlan}
              onChange={(e) => setRatePlan(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer [&>option]:bg-stone-900"
            >
              <option value="BEST-FLEX">Best Available Rate</option>
              <option value="MEMBER-15">Sands LifeStyle (-15%)</option>
              <option value="PAIZA-VIP">Paiza Club VIP Rate</option>
            </select>
          </div>

          {/* Search CTA Button */}
          <div className="w-full lg:w-auto flex items-center px-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#dfb76c] hover:bg-[#c5a059] text-black font-bold text-xs uppercase tracking-[0.25em] transition-all duration-200 shadow-lg shadow-[#dfb76c]/20 flex items-center justify-center gap-2 group whitespace-nowrap cursor-pointer"
            >
              <span>Cari Ketersediaan</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 6. EDITORIAL SPOTLIGHT: BERBAGAI KISAH ────────────── */}
      <section className="py-24 sm:py-32 max-w-[1300px] mx-auto px-6 sm:px-12 text-center space-y-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8c6d37]">
          Kemewahan yang Didefinisikan Ulang
        </span>
        <h2 className="font-cinzel text-3xl sm:text-5xl font-light text-stone-900 max-w-3xl mx-auto leading-tight">
          Berbagai Kisah yang Melampaui Segalanya
        </h2>
        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Nikmati pengalaman menginap tak tertandingi di puncak Singapura. Dari infinity pool tertinggi di dunia
          hingga santapan bintang Michelin dan suite mewah berbalut marmer Italia.
        </p>
      </section>

      {/* ── 7. SIGNATURE SUITES SHOWCASE (3 CLEAN LUXURY CARDS) ─ */}
      <section className="py-12 bg-[#faf9f7] border-y border-stone-200">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-12 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8c6d37]">
                The Sands &amp; Paiza Collections
              </span>
              <h2 className="font-cinzel text-3xl sm:text-4xl font-bold text-stone-900">
                Koleksi Kamar &amp; Suite Ikonik
              </h2>
            </div>
            <Link
              href="/booking/search.html"
              className="text-xs uppercase font-bold tracking-[0.2em] text-[#8c6d37] hover:text-stone-900 flex items-center gap-2"
            >
              <span>Lihat Seluruh Koleksi Kamar</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Sands Premier */}
            <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src="/images/suite-deluxe.jpg"
                    alt="Sands Premier Room"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#dfb76c] text-[10px] font-bold uppercase tracking-wider">
                    The Sands Collection
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-cinzel text-xl font-bold text-stone-900">
                    Sands Premier King Room
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Kamar seluas 47m² yang baru direnovasi dengan pemandangan Marina Bay, bathtub marmer berendam, serta akses harian ke Infinity Pool lantai 57.
                  </p>
                  <div className="text-[11px] text-[#8c6d37] font-semibold pt-1">
                    ✓ 47 m² • 1 King Bed • Infinity Pool Access
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 border-t border-stone-100 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] uppercase text-stone-400 font-bold block">Mulai Dari</span>
                  <span className="font-cinzel text-lg font-bold text-stone-900">Rp 1.850.000</span>
                </div>
                <Link
                  href="/booking/search.html"
                  className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-[#c5a059] text-white hover:text-black text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Pesan →
                </Link>
              </div>
            </div>

            {/* Card 2: Sands Grand Club Suite */}
            <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src="/images/suite-premier.jpg"
                    alt="Sands Grand Club Suite"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#dfb76c] text-[10px] font-bold uppercase tracking-wider">
                    VIP Club Access
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-cinzel text-xl font-bold text-stone-900">
                    Sands Grand Club Suite
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Suite 75m² dengan ruang tamu terpisah, balkon privat menghadap teluk, dan akses eksklusif VIP ke Club55 Lounge (sarapan, afternoon tea &amp; koktail).
                  </p>
                  <div className="text-[11px] text-[#8c6d37] font-semibold pt-1">
                    ✓ 75 m² • Ruang Tamu Terpisah • Club55 VIP Lounge
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 border-t border-stone-100 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] uppercase text-stone-400 font-bold block">Mulai Dari</span>
                  <span className="font-cinzel text-lg font-bold text-stone-900">Rp 3.450.000</span>
                </div>
                <Link
                  href="/booking/search.html"
                  className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-[#c5a059] text-white hover:text-black text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Pesan →
                </Link>
              </div>
            </div>

            {/* Card 3: Chairman Presidential Suite */}
            <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src="/images/suite-family.jpg"
                    alt="Chairman Presidential Suite"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#dfb76c] text-[10px] font-bold uppercase tracking-wider">
                    The Paiza Collection
                  </span>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-cinzel text-xl font-bold text-stone-900">
                    Chairman Presidential Suite
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Kemewahan 145m² dengan 2 master bedroom, grand piano, sauna pribadi, butler 24 jam, dan penjemputan bandara Limousine Rolls-Royce.
                  </p>
                  <div className="text-[11px] text-[#8c6d37] font-semibold pt-1">
                    ✓ 145 m² • Dedicated Butler 24 Jam • Limousine Bandara
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 border-t border-stone-100 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] uppercase text-stone-400 font-bold block">Mulai Dari</span>
                  <span className="font-cinzel text-lg font-bold text-stone-900">Rp 7.950.000</span>
                </div>
                <Link
                  href="/booking/search.html"
                  className="px-5 py-2.5 rounded-full bg-stone-900 hover:bg-[#c5a059] text-white hover:text-black text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Pesan →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. SKYPARK & INFINITY POOL SPOTLIGHT ──────────────── */}
      <section id="skypark" className="py-24 max-w-[1300px] mx-auto px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl">
          <img
            src="/images/skypark.jpg"
            alt="Sands SkyPark Infinity Pool"
            className="w-full h-[450px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 text-white space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#dfb76c]">
              Lantai 57 • 200 Meter di Atas Cakrawala
            </span>
            <h4 className="font-cinzel text-xl font-bold">Sands SkyPark Infinity Pool</h4>
          </div>
        </div>

        <div className="space-y-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8c6d37]">
            Ikon Dunia Tak Tertandingi
          </span>
          <h2 className="font-cinzel text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
            Berenang di Puncak Cakrawala Singapura
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Berada 200 meter di udara, kolam renang infinity rooftop terbesar di dunia ini menawarkan pemandangan
            spektakuler tanpa batas melintasi teluk dan gemerlap cakrawala kota. Akses eksklusif hanya untuk tamu hotel terdaftar.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-200">
            <div>
              <span className="font-cinzel text-2xl font-bold text-stone-900">146 m</span>
              <span className="text-xs text-stone-500 block">Panjang Kolam Renang</span>
            </div>
            <div>
              <span className="font-cinzel text-2xl font-bold text-stone-900">57F</span>
              <span className="text-xs text-stone-500 block">Lantai Tertinggi</span>
            </div>
          </div>
          <Link
            href="/booking/search.html"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-stone-900 hover:bg-[#c5a059] text-white hover:text-black font-bold text-xs uppercase tracking-[0.2em] transition-all"
          >
            <span>Pesan Kamar &amp; Dapatkan Akses</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── 9. FINE DINING & CULINARY HIGHLIGHTS ──────────────── */}
      <section id="dining" className="py-20 bg-stone-900 text-white">
        <div className="max-w-[1300px] mx-auto px-6 sm:px-12 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#dfb76c]">
              Kuliner Bertaraf Dunia
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold">
              Restoran Selebriti &amp; Bintang Michelin
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm max-w-xl mx-auto">
              Jelajahi perpaduan rasa istimewa yang diciptakan oleh koki ternama dunia di lebih dari 45 destinasi gastronomi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Spago by Wolfgang Puck",
                cuisine: "California Cuisine Kontemporer",
                floor: "Lantai 57 Sands SkyPark",
                desc: "Santapan santai di tepi kolam renang dengan latar panorama spektakuler.",
              },
              {
                name: "WAKUDA by Tetsuya Wakuda",
                cuisine: "Modern Japanese Omakase",
                floor: "Hotel Lobby Tower 2",
                desc: "Harmonisasi seni tradisional Jepang dengan cita rasa modern berkelas.",
              },
              {
                name: "CÉ LA VI Restaurant & SkyBar",
                cuisine: "Modern Asian & Cocktails",
                floor: "Lantai 57 Sands SkyPark",
                desc: "Restoran dan lounge atap ikonik dengan pemandangan 360 derajat teluk.",
              },
            ].map((resto) => (
              <div
                key={resto.name}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors space-y-3"
              >
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#dfb76c]">
                  {resto.floor}
                </span>
                <h3 className="font-cinzel text-lg font-bold text-white">{resto.name}</h3>
                <p className="text-xs text-[#dfb76c]/80 font-medium">{resto.cuisine}</p>
                <p className="text-xs text-stone-400 leading-relaxed">{resto.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. ATTRACTIONS & REWARDS ──────────────────────────── */}
      <section id="attractions" className="py-24 max-w-[1300px] mx-auto px-6 sm:px-12 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8c6d37]">
              Seni, Budaya &amp; Atraksi
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              ArtScience Museum &amp; Atraksi Ikonik
            </h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Kunjungi ArtScience Museum berarsitektur teratai yang memukau, tonton pertunjukan cahaya dan air Spectra
              di tepi teluk, atau nikmati pengalaman berbelanja mewah di The Shoppes at Marina Bay Sands.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <span className="px-4 py-2 rounded-full bg-stone-100 text-xs font-bold text-stone-800">
                Museum Seni Teratai
              </span>
              <span className="px-4 py-2 rounded-full bg-stone-100 text-xs font-bold text-stone-800">
                Spectra Light &amp; Water Show
              </span>
              <span className="px-4 py-2 rounded-full bg-stone-100 text-xs font-bold text-stone-800">
                Sampan Rides The Shoppes
              </span>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl border border-stone-200">
            <img
              src="/images/artscience.jpg"
              alt="ArtScience Museum"
              className="w-full h-[400px] object-cover"
            />
          </div>
        </div>

        {/* Sands LifeStyle Rewards Banner */}
        <div id="rewards" className="bg-gradient-to-r from-stone-900 via-black to-stone-900 text-white rounded-3xl p-8 sm:p-12 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#dfb76c]">
              Keanggotaan Eksklusif
            </span>
            <h3 className="font-cinzel text-2xl sm:text-3xl font-bold">
              Bergabung dengan Sands LifeStyle
            </h3>
            <p className="text-stone-400 text-xs max-w-lg leading-relaxed">
              Dapatkan diskon kamar eksklusif hingga 15%, reward dollar belanja dan makan hingga 10%, serta tiket VIP atraksi.
            </p>
          </div>
          <Link
            href="/booking/search.html"
            className="px-8 py-4 rounded-full bg-[#dfb76c] hover:bg-[#c5a059] text-black font-bold text-xs uppercase tracking-[0.25em] transition-all whitespace-nowrap shadow-lg cursor-pointer"
          >
            Pesan dengan Tarif Member →
          </Link>
        </div>
      </section>

      {/* ── 11. RESERVATION LOOKUP MODAL ───────────────────────── */}
      {showLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-stone-900 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8c6d37] block">
                  Layanan Mandiri Tamu
                </span>
                <h3 className="font-cinzel text-xl font-bold">Cek Status Reservasi</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLookup(false);
                  setLookupResult(null);
                  setLookupError(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Kode Referensi Booking *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: MBS-2026-XXXXX"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Email Pemesan (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="nama@example.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                />
              </div>

              {lookupError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {lookupError}
                </div>
              )}

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-3.5 rounded-full bg-stone-900 hover:bg-[#c5a059] text-white hover:text-black font-bold text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
              >
                {lookupLoading ? "Mencari Data..." : "Cek Reservasi"}
              </button>
            </form>

            {/* Lookup Result Box */}
            {lookupResult && (
              <div className="p-5 rounded-2xl bg-[#faf9f7] border border-stone-200 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-bold font-cinzel text-sm text-[#8c6d37]">
                    {lookupResult.bookingReference}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                    {lookupResult.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Tamu</span>
                    <span className="font-semibold text-stone-900">
                      {lookupResult.guest.firstName} {lookupResult.guest.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Total Biaya</span>
                    <span className="font-semibold text-stone-900">
                      {formatRupiah(lookupResult.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Check-in</span>
                    <span className="font-semibold text-stone-900">
                      {new Date(lookupResult.checkIn).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Check-out</span>
                    <span className="font-semibold text-stone-900">
                      {new Date(lookupResult.checkOut).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 12. LUXURY FOOTER ─────────────────────────────────── */}
      <footer className="bg-black text-stone-400 text-xs py-16 border-t border-stone-800">
        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4 md:col-span-2">
            <span className="font-cinzel text-lg font-bold text-white tracking-widest block">
              MARINA BAY SANDS
            </span>
            <p className="text-stone-500 text-xs max-w-sm leading-relaxed">
              Destinasi perhotelan terkemuka di Asia yang menyatukan kenyamanan suite mewah, hiburan kelas dunia, dan pusat kuliner internasional.
            </p>
            <p className="text-[11px] text-[#dfb76c]">
              10 Bayfront Avenue, Singapore 018956
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Navigasi Tamu</h4>
            <ul className="space-y-2 text-stone-400">
              <li><Link href="/booking/search.html" className="hover:text-white">Reservasi Kamar</Link></li>
              <li><a href="#skypark" className="hover:text-white">Infinity Pool</a></li>
              <li><a href="#dining" className="hover:text-white">Restoran</a></li>
              <li><a href="#attractions" className="hover:text-white">Atraksi</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Staf &amp; Manajemen</h4>
            <ul className="space-y-2 text-stone-400">
              <li><Link href="/login" className="hover:text-white">Portal Staf Hotel</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard Operasional</Link></li>
              <li><Link href="/reservations" className="hover:text-white">Front Desk Reservasi</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <p>© 2026 Marina Bay Sands Singapore. All Rights Reserved.</p>
          <p>Hospitality Operations Suite v1.0 • Authorized Deployment</p>
        </div>
      </footer>
    </div>
  );
}
