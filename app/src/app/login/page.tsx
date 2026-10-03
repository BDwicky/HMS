"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const schema = z.object({
  email: z.string().min(1, "Username atau Email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormErrors = { email?: string; password?: string; general?: string };

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  // Clean stale error query params from address bar
  useEffect(() => {
    if (authError && typeof window !== "undefined") {
      const cleanUrl = "/login" + (callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [authError, callbackUrl]);

  // Quick fill helper for staff testing
  const handleQuickFill = (userVal: string, passVal: string) => {
    setEmail(userVal);
    setPassword(passVal);
    setErrors({});
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrors({ general: "Kredensial tidak valid. Silakan periksa username atau password Anda." });
      } else {
        window.location.href = callbackUrl;
      }
    });
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0c] text-white selection:bg-[#c5a059]/30 selection:text-white font-sans flex flex-col lg:grid lg:grid-cols-12">
      {/* ── LEFT VISUAL HERO SHOWCASE (7 COLS ON DESKTOP, 100VH) ── */}
      <div className="hidden lg:relative lg:col-span-7 lg:flex flex-col justify-between p-12 xl:p-16 h-full overflow-hidden bg-black">
        {/* Full-bleed Luxury Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/mbs-night.jpg"
            alt="Marina Bay Sands Skyline"
            className="w-full h-full object-cover object-center scale-105 brightness-[0.72] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <svg className="w-8 h-6 text-[#dfb76c]" viewBox="0 0 24 16" fill="currentColor">
            <path d="M2 14V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11H2zm7 0V1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13H9zm7 0V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v11h-4z" />
            <path d="M1 2.5C3 1.2 9 .5 12 .5s9 .7 11 2v1c-2-1.3-8-2-11-2S3 2.2 1 3.5v-1z" />
          </svg>
          <div className="flex flex-col">
            <span className="font-cinzel text-lg font-bold tracking-[0.25em] text-white">
              MARINA BAY SANDS
            </span>
            <span className="text-[9px] uppercase tracking-[0.35em] text-[#dfb76c] font-semibold">
              SINGAPORE
            </span>
          </div>
        </div>

        {/* Center Editorial Quote */}
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[#dfb76c] text-[10px] uppercase font-bold tracking-[0.25em]">
            Operational Hospitality Suite
          </span>
          <h2 className="font-cinzel text-3xl xl:text-4xl font-light text-white leading-tight">
            Di Mana Kemewahan Bertemu Tata Kelola Operasional Kelas Dunia
          </h2>
          <p className="text-stone-300 text-xs xl:text-sm leading-relaxed">
            Sistem manajemen terintegrasi untuk pemesanan kamar, resepsionis, housekeeping, pelaporan pendapatan, dan layanan tamu eksklusif.
          </p>
        </div>

        {/* Bottom Metadata Badges */}
        <div className="relative z-10 flex items-center gap-6 text-[11px] text-stone-400 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-medium">Gateway Operasional Aktif</span>
          </div>
          <span>•</span>
          <span>Enkripsi TLS 1.3 256-Bit</span>
          <span>•</span>
          <span>Versi 1.0.0</span>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANEL (5 COLS ON DESKTOP, 100VH NO SCROLL) ── */}
      <div className="relative col-span-12 lg:col-span-5 h-full flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-[#0e0e12] border-l border-white/5 overflow-y-auto lg:overflow-hidden">
        {/* Top Bar: Return Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors group text-xs uppercase tracking-wider font-semibold"
          >
            <span className="p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              ←
            </span>
            <span>Kembali ke Beranda</span>
          </Link>

          <span className="text-[10px] font-bold uppercase tracking-widest text-[#dfb76c] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Staf Portal
          </span>
        </div>

        {/* Center: Login Form Card */}
        <div className="my-auto w-full max-w-sm mx-auto space-y-6">
          {/* Header Title */}
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#c5a059]/15 border border-[#dfb76c]/30 mb-3">
              <svg className="w-6 h-6 text-[#dfb76c]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 21V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12H4zm6 0V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16h-4zm6 0V8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v13h-4z" />
                <path d="M2 5.5C4 4 10 3 12 3s8 1 10 2.5v1c-2-1.3-8-2-11-2S3 2.2 1 3.5v-1z" />
              </svg>
            </div>
            <h1 className="font-cinzel text-2xl font-bold text-white tracking-wide">
              Masuk Portal Staf
            </h1>
            <p className="text-stone-400 text-xs mt-1">
              Gunakan akun staf resmi untuk mengakses panel kontrol hotel.
            </p>
          </div>

          {/* Quick Fill Credentials Chips (Requested Testing Account) */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-400 font-medium">Akun Pengujian (1-Klik):</span>
              <span className="text-[10px] font-bold text-[#dfb76c] uppercase">Instan</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("Testing", "123123")}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[#dfb76c] text-xs font-semibold transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-[11px]">Testing</div>
                  <div className="text-[10px] text-stone-400 font-mono">123123</div>
                </div>
                <span className="text-stone-400 group-hover:text-amber-400">↳</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("admin@hotel.dev", "admin123!")}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 text-xs font-semibold transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-[11px] truncate">Admin Dev</div>
                  <div className="text-[10px] text-stone-400 font-mono">admin123!</div>
                </div>
                <span className="text-stone-400 group-hover:text-white">↳</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Username atau Email Staf
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                placeholder="Testing atau admin@hotel.dev"
                className={`w-full px-4 py-3 rounded-xl bg-stone-900 border text-white placeholder-stone-500 text-xs
                  focus:outline-none focus:ring-2 focus:ring-[#dfb76c]/40 focus:border-[#dfb76c] transition-colors
                  disabled:opacity-50
                  ${errors.email ? "border-red-500" : "border-stone-800"}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="••••••••"
                  className={`w-full pl-4 pr-10 py-3 rounded-xl bg-stone-900 border text-white placeholder-stone-500 text-xs
                    focus:outline-none focus:ring-2 focus:ring-[#dfb76c]/40 focus:border-[#dfb76c] transition-colors
                    disabled:opacity-50
                    ${errors.password ? "border-red-500" : "border-stone-800"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#c5a059] to-[#b38a42] hover:brightness-110 active:brightness-95
                text-black font-bold text-xs uppercase tracking-[0.25em] transition-all
                focus:outline-none focus:ring-2 focus:ring-[#dfb76c]
                disabled:opacity-50 shadow-md shadow-[#c5a059]/20 cursor-pointer"
            >
              {isPending ? "Mengautentikasi..." : "Masuk ke Portal Staf →"}
            </button>
          </form>
        </div>

        {/* Bottom Footer Note */}
        <div className="text-center text-[11px] text-stone-500 border-t border-white/5 pt-4">
          <p>© 2026 Marina Bay Sands Singapore. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0a0a0c]" />}>
      <LoginForm />
    </Suspense>
  );
}

