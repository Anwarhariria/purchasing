import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { type DummyCredential } from "@/types/procurement";
import { DUMMY_ACCOUNTS } from "@/data/procurement-data";

interface LoginPageProps {
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (pass: string) => void;
  loginError: string;
  onLogin: (e: React.FormEvent) => void;
  onQuickLogin: (acc: DummyCredential) => void;
  onBackToLanding: () => void;
}

export function LoginPage({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  onLogin,
  onQuickLogin,
  onBackToLanding,
}: LoginPageProps) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans text-foreground">
      {/* ====== FULLSCREEN HERO BACKGROUND ASSET ====== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src="/login-campus.jpg"
          alt="Gedung Pasca Sarjana Universitas Asa Indonesia"
          className="h-full w-full object-cover object-center"
        />
        {/* Navy gradient overlay for balanced readability and vivid background visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071326]/65 via-[#091a38]/55 to-[#071326]/75" />
      </div>

      {/* ====== TOP HEADER OVER HERO ====== */}
      <header className="relative z-10 mx-auto w-full max-w-[1400px] flex items-center justify-between p-4 sm:p-6">
        <button
          type="button"
          onClick={() => {
            onBackToLanding();
            if (typeof window !== "undefined") {
              window.location.hash = "";
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/30 hover:bg-black/50 text-white backdrop-blur-md px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-md"
        >
          <ArrowLeft className="size-4" /> Kembali ke Beranda
        </button>

        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 backdrop-blur-md px-3.5 py-1.5 shadow-md">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            Gedung Pascasarjana ASAINDO
          </span>
        </div>
      </header>

      {/* ====== MAIN LOGIN CARD (CENTERED OVER HERO) ====== */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-2">
        <div className="w-full max-w-lg min-w-0">
          {/* Brand Header */}
          <div className="text-center mb-5">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-2xl border border-white/30 mb-3 drop-shadow-md backdrop-blur-xs">
              <img
                src="/logo-asaindo.png"
                alt="Logo Universitas Asa Indonesia"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              SPAKE
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1 leading-snug drop-shadow-xs">
              Sistem Pengadaan Kampus Terpadu · Universitas Asa Indonesia
            </p>
          </div>

          {/* Transparent Frosted Glass Login Card */}
          <div className="rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-white">
            <div className="mb-5 text-center">
              <h2 className="text-xl font-extrabold text-white drop-shadow-sm">Masuk ke Akun Anda</h2>
              <p className="text-xs text-blue-100/80 mt-1">
                Silakan masukkan email &amp; kata sandi institusi Anda.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/25 backdrop-blur-md p-3 text-xs font-semibold text-rose-100 shadow-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Email Institusi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 size-4 text-blue-200" />
                  <Input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="pl-10 h-11 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-blue-100/40 focus-visible:ring-blue-400 focus-visible:border-white/50 backdrop-blur-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 size-4 text-blue-200" />
                  <Input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-blue-100/40 focus-visible:ring-blue-400 focus-visible:border-white/50 backdrop-blur-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl transition-all mt-2 rounded-xl border border-blue-400/30 cursor-pointer active:scale-[0.98]"
              >
                Masuk ke Sistem
              </Button>
            </form>

            {/* Note Informasi Akun Dummy per Role */}
            <div className="mt-6 border-t border-white/15 pt-5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <KeyRound className="size-4 text-sky-400 shrink-0" />
                <span className="text-xs font-extrabold text-white uppercase tracking-wide leading-tight">
                  Pilihan Akun Cepat (Demo):
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 mb-3">
                Pilih salah satu peran di bawah untuk langsung mencoba alur kerja:
              </p>

              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {DUMMY_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => onQuickLogin(acc)}
                    className="text-left rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 hover:border-white/30 p-3 transition-all cursor-pointer group shadow-sm backdrop-blur-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white group-hover:text-sky-300 transition-colors truncate flex-1 min-w-0">
                        {acc.label}
                      </span>
                      <span className="shrink-0 rounded-full bg-blue-500/30 text-sky-200 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap">
                        Pilih Akun →
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-blue-200/90 font-mono">
                      <span>Email: <strong className="text-white">{acc.email}</strong></span>
                      <span>Pass: <strong className="text-white">{acc.pass}</strong></span>
                    </div>
                    <p className="mt-1 text-[10px] text-blue-100/70 leading-snug">
                      {acc.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ====== FOOTER OVER HERO ====== */}
      <footer className="relative z-10 border-t border-white/15 bg-black/30 backdrop-blur-md py-3 text-center text-[11px] text-blue-200">
        © 2026 Universitas Asa Indonesia · Sistem Pengadaan Kampus Terpadu (SPAKE)
      </footer>
    </div>
  );
}
