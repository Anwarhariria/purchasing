import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (pass: string) => void;
  loginError: string;
  onLogin: (e: React.FormEvent) => void;
}

export function LoginPage({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  onLogin,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = React.useState(false);

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
              <h2 className="text-xl font-extrabold text-white drop-shadow-sm">
                Masuk ke Akun Anda
              </h2>
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
                <label className="block text-xs font-bold text-white mb-1.5">Email Institusi</label>
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
                <label className="block text-xs font-bold text-white mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 size-4 text-blue-200" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-10 pr-11 h-11 text-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-blue-100/40 focus-visible:ring-blue-400 focus-visible:border-white/50 backdrop-blur-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl transition-all mt-2 rounded-xl border border-blue-400/30 cursor-pointer active:scale-[0.98]"
              >
                Masuk ke Sistem
              </Button>
            </form>
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
