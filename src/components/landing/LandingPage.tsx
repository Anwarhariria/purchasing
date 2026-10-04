import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Activity,
} from "lucide-react";
import { SIKLUS_TAHAPAN, SIKLUS_DETAILS, type Role, type UserAccount } from "@/types/procurement";

interface LandingPageProps {
  onGoToLogin: () => void;
  onQuickRoleLogin?: (user: UserAccount, role: Role) => void;
  initialUsers?: UserAccount[];
}

export function LandingPage({ onGoToLogin }: LandingPageProps) {

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background font-sans text-foreground flex flex-col justify-between w-full overflow-x-hidden">
      {/* Hero Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 sm:gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-xs border border-border">
              <img
                src="/logo-asaindo.png"
                alt="Logo Universitas Asa Indonesia"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black tracking-tight text-primary leading-tight">
                SPAKE
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground hidden sm:block truncate">
                Universitas Asa Indonesia
              </div>
            </div>
          </div>

          {/* Middle Nav Links */}
          <nav aria-label="Navigasi Halaman" className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("tentang-spake");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              Tentang SPAKE
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("alur-pengadaan");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              Alur Pengadaan
            </button>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onGoToLogin();
              }}
              className="h-10 gap-2 bg-[#1e3a8a] hover:bg-[#162e5b] text-white font-extrabold text-xs sm:text-sm px-5 sm:px-6 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            >
              Login <ArrowUpRight className="size-4 shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <main className="flex-1 w-full overflow-x-hidden">
        <section className="relative overflow-hidden bg-[#0f2347] text-white py-16 sm:py-24 lg:py-28">
          {/* Background Team Photo with Gradient */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src="/hero-campus.jpg"
              alt="Tim Pengadaan Kampus ASAINDO"
              className="w-full h-full object-cover object-center lg:object-right opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f2347] via-[#0f2347]/85 via-45% to-transparent to-90%" />
          </div>

          <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 w-full">
            <div className="max-w-lg space-y-5">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 backdrop-blur px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white">
                <span className="size-1.5 rounded-full bg-white shrink-0" />
                DIGITALISASI PENGADAAN KAMPUS
              </div>

              {/* Big Title */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] drop-shadow-sm">
                SPAKE
              </h1>

              {/* Subtitle */}
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white/95 leading-snug drop-shadow-xs">
                Setiap kebutuhan kampus,<br className="sm:hidden" /> ditangani lebih pasti.
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-sm sm:max-w-xl font-normal drop-shadow-xs">
                Satu ruang kerja untuk pengajuan, persetujuan, pembelian, hingga pertanggungjawaban barang di Universitas Asa Indonesia.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onGoToLogin();
                  }}
                  className="h-11 sm:h-12 gap-2 bg-white hover:bg-slate-100 text-[#1e3a8a] font-black text-sm px-5 sm:px-6 rounded-lg shadow-xl transition-transform active:scale-95 cursor-pointer"
                >
                  Masuk ke SPAKE <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById("alur-pengadaan");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-11 sm:h-12 gap-1.5 border-white/40 bg-black/20 hover:bg-white/10 text-white font-bold text-sm px-4 sm:px-5 rounded-lg backdrop-blur-xs cursor-pointer"
                >
                  Lihat alur kerja <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Metrics Bar */}
        <div id="tentang-spake" className="border-b border-border bg-card py-5 w-full">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-primary">06 Tahap</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 leading-snug">Siklus Pengadaan End-to-End</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-primary">04 Role</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 leading-snug">Hak Akses Terintegrasi</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-primary">Antrean Belanja</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 leading-snug">Prioritas Antrean Transparan</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-primary">Real-Time</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 leading-snug">Notifikasi Antar Bagian</p>
            </div>
          </div>
        </div>

        {/* Alur Pengadaan Section */}
        <section id="alur-pengadaan" className="py-14 sm:py-16 bg-surface border-b border-border">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                <Activity className="size-3.5" /> Alur Pengadaan Terpadu
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                6 Siklus Pengadaan Kampus ASAINDO
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Dari permohonan pertama unit laboratorium hingga penutupan resmi nota SPJ.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {SIKLUS_TAHAPAN.map((step, idx) => (
                <div key={step} className="rounded-xl border border-border bg-card p-4 text-center shadow-xs">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black mb-2">
                    0{idx + 1}
                  </span>
                  <h4 className="text-xs font-black text-foreground leading-tight">{step}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                    {SIKLUS_DETAILS[step]?.desc || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">SPAKE ASAINDO</span>
            <span>· Sistem Pengadaan Kampus Terpadu</span>
          </div>
          <p>© 2026 Universitas Asa Indonesia. Hak Cipta Dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
