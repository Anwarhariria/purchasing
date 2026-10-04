import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/common/Mark";
import {
  ChevronLeft,
  X,
  Download,
  FileText,
  CircleHelp,
  Plus,
  PackageCheck,
  UserPlus,
  Building2,
  ChefHat,
  Scale,
  ClipboardCheck,
  Banknote,
  Receipt,
} from "lucide-react";
import type { Role, UserAccount } from "@/types/procurement";

interface NavItem {
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface SidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  role: Role;
  section: string;
  setSection: (s: string) => void;
  sidebarNav: NavItem[];
  exportExcel: () => void;
  exportPdf: () => void;
  notify: (msg: string) => void;
  currentUser: UserAccount | null;
  // Role Input Action Handlers
  onOpenCreateRequest?: () => void;
  onOpenAddStock?: () => void;
  onOpenAddUser?: () => void;
  onOpenAddProdi?: () => void;
  onOpenAddCourse?: () => void;
  onOpenAddMenu?: () => void;
  onQuickReviewFinance?: () => void;
  onOpenFifoPriority?: () => void;
  onOpenSawPriority?: () => void;
  onOpenVerify?: () => void;
}

export function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileOpen,
  setMobileOpen,
  role,
  section,
  setSection,
  sidebarNav,
  exportExcel,
  exportPdf,
  notify,
  currentUser,
  onOpenCreateRequest,
  onOpenAddStock,
  onOpenAddUser,
  onOpenAddProdi,
  onOpenAddCourse,
  onOpenAddMenu,
  onQuickReviewFinance,
  onOpenFifoPriority,
  onOpenSawPriority,
  onOpenVerify,
}: SidebarProps) {
  const handleOpenFifo = () => {
    if (onOpenFifoPriority) onOpenFifoPriority();
    else if (onOpenSawPriority) onOpenSawPriority();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ====== SIDEBAR (FIXED) ====== */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[265px] flex flex-col border-r border-blue-900/50 bg-[#1e3a8a] text-white overflow-hidden shadow-2xl sidebar-transition animate-sidebar-enter",
          mobileOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-full opacity-0 pointer-events-none lg:pointer-events-auto",
          sidebarCollapsed
            ? "lg:-translate-x-full lg:opacity-0 lg:pointer-events-none"
            : "lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto",
        ].join(" ")}
      >
        {/* Logo Brand */}
        <div
          className="animate-sidebar-item flex h-[84px] shrink-0 items-center gap-3 border-b border-white/10 px-5"
          style={{ animationDelay: "50ms" }}
        >
          <Mark />
          <div className="min-w-0 flex-1">
            <div className="text-[20px] font-black tracking-tight text-white">
              SPAKE
            </div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-blue-200">
              Pengadaan ASAINDO
            </div>
          </div>
          {/* Desktop collapse button (inside the left menu) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex shrink-0 size-8 text-blue-200 hover:text-white hover:bg-white/10 rounded-md cursor-pointer"
            onClick={() => setSidebarCollapsed(true)}
            title="Ciutkan Menu"
            aria-label="Ciutkan Menu"
          >
            <ChevronLeft className="size-5" />
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 size-8 text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Nav Items & Fitur Input */}
        <div className="flex-1 overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Fitur Input · Sesuai Dashboard Peran */}
          <div className="mb-4 space-y-2">
            <div
              className="animate-sidebar-item px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/80"
              style={{ animationDelay: "80ms" }}
            >
              Fitur Input · {role}
            </div>

            {/* STAF / ASDOS */}
            {role === "Staf / Asdos" && (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenCreateRequest?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "130ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Plus className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Ajukan Bahan Praktik</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenAddStock?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "190ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <PackageCheck className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Stok Barang Lab</span>
                </Button>
              </div>
            )}

            {/* KOORDINATOR LAB */}
            {role === "Koordinator" && (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleOpenFifo();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "130ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Scale className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Prioritas FIFO Belanja</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenVerify?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "190ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <ClipboardCheck className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Verifikasi Berkas</span>
                </Button>
              </div>
            )}

            {/* KAPRODI */}
            {role === "Kaprodi" && (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenAddMenu?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "130ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <ChefHat className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Menu &amp; Resep</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleOpenFifo();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "190ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Scale className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Prioritas FIFO Belanja</span>
                </Button>
              </div>
            )}

            {/* BAGIAN KEUANGAN */}
            {role === "Bagian Keuangan" && (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onQuickReviewFinance?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "130ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Banknote className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Pencairan Dana</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenVerify?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "190ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Receipt className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Verifikasi LPJ</span>
                </Button>
              </div>
            )}

            {/* SUPER ADMIN */}
            {role === "Super Admin" && (
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenAddUser?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "130ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <UserPlus className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Pengguna Baru</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenAddCourse?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "190ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Plus className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Mata Kuliah</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onOpenAddProdi?.();
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: "250ms" }}
                  className="animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg"
                >
                  <Building2 className="size-[18px] shrink-0 text-blue-200" />
                  <span className="truncate">Input Program Studi</span>
                </Button>
              </div>
            )}
          </div>

          <div
            className="animate-sidebar-item h-px bg-white/10 my-3"
            style={{ animationDelay: "220ms" }}
          />

          <div
            className="animate-sidebar-item px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75"
            style={{ animationDelay: "250ms" }}
          >
            Menu Utama · {role}
          </div>
          <nav className="space-y-1">
            {sidebarNav.map(({ label, icon: Icon, count }, idx) => {
              const isActive = section === label;
              const itemDelay = 290 + idx * 70;
              return (
                <Button
                  key={label}
                  variant="ghost"
                  onClick={() => {
                    setSection(label);
                    setMobileOpen(false);
                  }}
                  style={{ animationDelay: `${itemDelay}ms` }}
                  className={`animate-sidebar-item h-11 w-full justify-start gap-3 px-3.5 text-[13px] font-semibold transition-colors cursor-pointer rounded-lg ${
                    isActive
                      ? "bg-white/20 text-white font-bold shadow-xs hover:bg-white/25 border border-white/20"
                      : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`size-[18px] shrink-0 ${isActive ? "text-sky-300" : "text-blue-200"}`} />
                  <span className="truncate">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="ml-auto rounded-full bg-white/20 text-white border border-white/25 px-2 py-0.5 text-[10px] font-extrabold shadow-xs">
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>

          <div
            className="animate-sidebar-item mt-7 px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75"
            style={{ animationDelay: `${290 + sidebarNav.length * 70}ms` }}
          >
            Utilitas
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={exportExcel}
              style={{ animationDelay: `${290 + sidebarNav.length * 70 + 60}ms` }}
              className="animate-sidebar-item h-10 w-full justify-start gap-3 px-3.5 text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg"
            >
              <Download className="size-[17px] shrink-0 text-blue-200" /> Rekap (Excel)
            </Button>
            <Button
              variant="ghost"
              onClick={exportPdf}
              style={{ animationDelay: `${290 + sidebarNav.length * 70 + 120}ms` }}
              className="animate-sidebar-item h-10 w-full justify-start gap-3 px-3.5 text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg"
            >
              <FileText className="size-[17px] shrink-0 text-blue-200" /> Rekap (PDF)
            </Button>
            <Button
              variant="ghost"
              onClick={() => notify("SPAKE Demo - Dokumentasi dan Alur Siklus 6 Tahap Pengadaan ASAINDO.")}
              style={{ animationDelay: `${290 + sidebarNav.length * 70 + 180}ms` }}
              className="animate-sidebar-item h-10 w-full justify-start gap-3 px-3.5 text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg"
            >
              <CircleHelp className="size-[17px] shrink-0 text-blue-200" /> Bantuan &amp; Alur
            </Button>
          </div>
        </div>

        {/* User profile footer */}
        <div
          className="animate-sidebar-item border-t border-white/10 p-4 bg-black/15 shrink-0"
          style={{ animationDelay: `${290 + sidebarNav.length * 70 + 240}ms` }}
        >
          <div className="rounded-lg border border-white/15 bg-white/10 p-3 shadow-xs backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-500 text-xs font-bold text-white shadow-xs">
                {(currentUser?.name || role).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {currentUser?.name || (role === "Staf / Asdos" ? "Staf Lab Perhotelan & Kuliner" : `Staf ${role}`)}
                </p>
                <p className="truncate text-[10px] font-medium text-blue-200/80">
                  {currentUser?.email || role}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-center text-[10px] text-blue-200/60">© 2026 Universitas Asa Indonesia</p>
        </div>
      </aside>
    </>
  );
}
