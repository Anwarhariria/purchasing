import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/common/Mark";
import {
  ChevronLeft,
  ChevronRight,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function SidebarTooltip({
  label,
  children,
  enabled,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={60}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={14}
        className="z-[999] rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-white shadow-xl border border-slate-700/80 backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[side=right]:slide-in-from-left-2"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
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
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);

    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const isMini = isDesktop && sidebarCollapsed;

  const handleOpenFifo = () => {
    if (onOpenFifoPriority) onOpenFifoPriority();
    else if (onOpenSawPriority) onOpenSawPriority();
  };

  return (
    <TooltipProvider delayDuration={60} skipDelayDuration={40}>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-foreground/30 backdrop-blur-xs lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ====== COLLAPSIBLE SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-blue-900/50 bg-[#1e3a8a] text-white shadow-2xl sidebar-collapsible ${
          mobileOpen ? "mobile-open" : "sidebar-mobile-drawer"
        } ${
          isMini ? "w-[72px] mini-sidebar" : "w-[265px] open"
        }`}
      >
        {/* Logo Brand Header */}
        {!isMini ? (
          <div
            className="sidebar-nav-item flex h-[84px] shrink-0 items-center gap-3 border-b border-white/10 px-5"
            style={{ transitionDelay: "40ms" }}
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
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex shrink-0 size-8 text-blue-200 hover:text-white hover:bg-white/10 rounded-md cursor-pointer"
              onClick={() => setSidebarCollapsed(true)}
              title="Ciutkan Menu (Mini Sidebar)"
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
        ) : (
          <div className="flex h-[84px] shrink-0 items-center justify-center border-b border-white/10 px-2">
            <SidebarTooltip label="Perluas Sidebar" enabled={isMini}>
              <Button
                variant="ghost"
                size="icon"
                className="relative flex size-11 items-center justify-center text-blue-200 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer group"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Perluas Sidebar"
              >
                <Mark />
                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs group-hover:scale-110 transition-transform">
                  <ChevronRight className="size-3" />
                </span>
              </Button>
            </SidebarTooltip>
          </div>
        )}

        {/* Nav Items & Fitur Input */}
        <div
          className={`flex-1 overflow-y-auto ${
            isMini ? "px-2 py-3" : "px-3 py-4"
          } [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent`}
        >
          {/* Fitur Input · Sesuai Dashboard Peran */}
          <div className="mb-3 space-y-1.5">
            {!isMini ? (
              <div
                className="sidebar-nav-item px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/80"
                style={{ transitionDelay: "80ms" }}
              >
                Fitur Input · {role}
              </div>
            ) : (
              <div className="h-px bg-white/10 my-2 mx-2" />
            )}

            {/* STAF / ASDOS */}
            {role === "Staf / Asdos" && (
              <div className="space-y-1">
                <SidebarTooltip label="Ajukan Bahan Praktik" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenCreateRequest?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "130ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Plus className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Ajukan Bahan Praktik</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Input Stok Barang Lab" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenAddStock?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "190ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <PackageCheck className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Stok Barang Lab</span>}
                  </Button>
                </SidebarTooltip>
              </div>
            )}

            {/* KOORDINATOR LAB */}
            {role === "Koordinator" && (
              <div className="space-y-1">
                <SidebarTooltip label="Prioritas FIFO Belanja" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleOpenFifo();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "130ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Scale className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Prioritas FIFO Belanja</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Input Verifikasi Berkas" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenVerify?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "190ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <ClipboardCheck className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Verifikasi Berkas</span>}
                  </Button>
                </SidebarTooltip>
              </div>
            )}

            {/* KAPRODI */}
            {role === "Kaprodi" && (
              <div className="space-y-1">
                <SidebarTooltip label="Input Menu & Resep" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenAddMenu?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "130ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <ChefHat className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Menu &amp; Resep</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Prioritas FIFO Belanja" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleOpenFifo();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "190ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Scale className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Prioritas FIFO Belanja</span>}
                  </Button>
                </SidebarTooltip>
              </div>
            )}

            {/* BAGIAN KEUANGAN */}
            {role === "Bagian Keuangan" && (
              <div className="space-y-1">
                <SidebarTooltip label="Input Pencairan Dana" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onQuickReviewFinance?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "130ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Banknote className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Pencairan Dana</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Input Verifikasi LPJ" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenVerify?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "190ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Receipt className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Verifikasi LPJ</span>}
                  </Button>
                </SidebarTooltip>
              </div>
            )}

            {/* SUPER ADMIN */}
            {role === "Super Admin" && (
              <div className="space-y-1">
                <SidebarTooltip label="Input Pengguna Baru" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenAddUser?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "130ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <UserPlus className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Pengguna Baru</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Input Mata Kuliah" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenAddCourse?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "190ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Plus className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Mata Kuliah</span>}
                  </Button>
                </SidebarTooltip>
                <SidebarTooltip label="Input Program Studi" enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onOpenAddProdi?.();
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: "250ms" }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                  >
                    <Building2 className="size-[18px] shrink-0 text-blue-200" />
                    {!isMini && <span className="truncate">Input Program Studi</span>}
                  </Button>
                </SidebarTooltip>
              </div>
            )}
          </div>

          <div
            className={`sidebar-nav-item h-px bg-white/10 ${isMini ? "my-2 mx-2" : "my-3"}`}
            style={{ transitionDelay: "220ms" }}
          />

          {!isMini && (
            <div
              className="sidebar-nav-item px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75"
              style={{ transitionDelay: "250ms" }}
            >
              Menu Utama · {role}
            </div>
          )}

          <nav className="space-y-1">
            {sidebarNav.map(({ label, icon: Icon, count }, idx) => {
              const isActive = section === label;
              const itemDelay = 280 + idx * 60;
              const tooltipLabel = count !== undefined && count > 0 ? `${label} (${count})` : label;
              return (
                <SidebarTooltip key={label} label={tooltipLabel} enabled={isMini}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSection(label);
                      setMobileOpen(false);
                    }}
                    style={{ transitionDelay: `${itemDelay}ms` }}
                    className={`sidebar-nav-item h-11 ${
                      isMini ? "w-11 px-0 justify-center mx-auto relative" : "w-full justify-start gap-3 px-3.5"
                    } text-[13px] font-semibold transition-colors cursor-pointer rounded-lg ${
                      isActive
                        ? "bg-white/20 text-white font-bold shadow-xs hover:bg-white/25 border border-white/20"
                        : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className={`size-[18px] shrink-0 ${isActive ? "text-sky-300" : "text-blue-200"}`} />
                    {!isMini && <span className="truncate">{label}</span>}
                    {count !== undefined && count > 0 && (
                      !isMini ? (
                        <span className="ml-auto rounded-full bg-white/20 text-white border border-white/25 px-2 py-0.5 text-[10px] font-extrabold shadow-xs">
                          {count}
                        </span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-sky-300 ring-2 ring-[#1e3a8a]" />
                      )
                    )}
                  </Button>
                </SidebarTooltip>
              );
            })}
          </nav>

          {!isMini ? (
            <div
              className="sidebar-nav-item mt-7 px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75"
              style={{ transitionDelay: `${280 + sidebarNav.length * 60 + 20}ms` }}
            >
              Utilitas
            </div>
          ) : (
            <div className="h-px bg-white/10 my-3 mx-2" />
          )}

          <div className="space-y-1">
            <SidebarTooltip label="Rekap (Excel)" enabled={isMini}>
              <Button
                variant="ghost"
                onClick={exportExcel}
                style={{ transitionDelay: `${280 + sidebarNav.length * 60 + 70}ms` }}
                className={`sidebar-nav-item h-10 ${
                  isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
              >
                <Download className="size-[17px] shrink-0 text-blue-200" />
                {!isMini && <span>Rekap (Excel)</span>}
              </Button>
            </SidebarTooltip>
            <SidebarTooltip label="Rekap (PDF)" enabled={isMini}>
              <Button
                variant="ghost"
                onClick={exportPdf}
                style={{ transitionDelay: `${280 + sidebarNav.length * 60 + 120}ms` }}
                className={`sidebar-nav-item h-10 ${
                  isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
              >
                <FileText className="size-[17px] shrink-0 text-blue-200" />
                {!isMini && <span>Rekap (PDF)</span>}
              </Button>
            </SidebarTooltip>
            <SidebarTooltip label="Bantuan & Alur Siklus" enabled={isMini}>
              <Button
                variant="ghost"
                onClick={() => notify("SPAKE Demo - Dokumentasi dan Alur Siklus 6 Tahap Pengadaan ASAINDO.")}
                style={{ transitionDelay: `${280 + sidebarNav.length * 60 + 170}ms` }}
                className={`sidebar-nav-item h-10 ${
                  isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
              >
                <CircleHelp className="size-[17px] shrink-0 text-blue-200" />
                {!isMini && <span>Bantuan &amp; Alur</span>}
              </Button>
            </SidebarTooltip>
          </div>
        </div>

        {/* User profile footer */}
        <div
          className={`sidebar-nav-item border-t border-white/10 ${
            isMini ? "p-3" : "p-4"
          } bg-black/15 shrink-0`}
          style={{ transitionDelay: `${280 + sidebarNav.length * 60 + 220}ms` }}
        >
          {!isMini ? (
            <>
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
            </>
          ) : (
            <SidebarTooltip
              label={
                <div className="text-left space-y-0.5 py-0.5">
                  <p className="font-bold text-white text-xs">
                    {currentUser?.name || (role === "Staf / Asdos" ? "Staf Lab Perhotelan & Kuliner" : `Staf ${role}`)}
                  </p>
                  <p className="text-[10px] text-blue-200/80">
                    {currentUser?.email || role}
                  </p>
                </div>
              }
              enabled={isMini}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white shadow-xs mx-auto cursor-default hover:ring-2 hover:ring-white/30 transition-all">
                {(currentUser?.name || role).slice(0, 2).toUpperCase()}
              </div>
            </SidebarTooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
