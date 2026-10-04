import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/common/Mark";
import {
  ChevronLeft,
  Menu,
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
  enabled = true,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  enabled?: boolean;
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
  // First load state: animasi entrance dijalankan SEKALI SAJA di awal
  const [firstLoad, setFirstLoad] = useState(true);
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

    // Matikan status firstLoad setelah 700ms agar saat toggle tidak ada animasi berulang
    const timer = setTimeout(() => {
      setFirstLoad(false);
    }, 700);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
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
          mobileOpen ? "mobile-open" : ""
        } ${
          isMini ? "w-[72px]" : "w-[265px]"
        }`}
      >
        {/* Header: Logo Kampus ASAINDO & Tombol Toggle 'Tutup Menu' */}
        {!isMini ? (
          <div
            className={`flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-4 ${
              firstLoad ? "animate-first-load" : ""
            }`}
            style={firstLoad ? { animationDelay: "40ms" } : undefined}
          >
            {/* Logo Kampus ASAINDO & SPAKE (Berfungsi murni sebagai navigasi beranda) */}
            <button
              type="button"
              onClick={() => {
                setSection("Ringkasan");
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
              title="Beranda SPAKE"
            >
              <div className="shrink-0 transition-transform group-hover:scale-105">
                <Mark />
              </div>
              <div className="min-w-0 transition-opacity duration-200 ease-in-out">
                <div className="text-[19px] font-black tracking-tight text-white leading-tight">
                  SPAKE
                </div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-blue-200 leading-tight">
                  Pengadaan ASAINDO
                </div>
              </div>
            </button>

            {/* Tombol Toggle Buka-Tutup khusus di sebelah kanan header dengan tooltip 'Tutup Menu' */}
            <div className="flex items-center gap-1">
              <SidebarTooltip label="Tutup Menu" enabled={true}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex size-8 text-blue-200 hover:text-white hover:bg-white/15 rounded-lg cursor-pointer transition-colors"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label="Tutup Menu"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              </SidebarTooltip>

              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden size-8 text-blue-200 hover:text-white hover:bg-white/15 rounded-lg cursor-pointer"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`flex h-[76px] shrink-0 items-center justify-center border-b border-white/10 px-2 ${
              firstLoad ? "animate-first-load" : ""
            }`}
          >
            {/* Logo Kampus saat mini: Tetap sebagai identitas kampus & navigasi beranda */}
            <SidebarTooltip label="Beranda SPAKE" enabled={true}>
              <button
                type="button"
                onClick={() => {
                  setSection("Ringkasan");
                }}
                className="flex size-11 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer group focus:outline-none"
                aria-label="Beranda SPAKE"
              >
                <div className="transition-transform group-hover:scale-105">
                  <Mark />
                </div>
              </button>
            </SidebarTooltip>
          </div>
        )}

        {/* Nav Items & Fitur Input */}
        <div
          className={`flex-1 overflow-y-auto ${
            isMini ? "px-2 py-3" : "px-3 py-4"
          } [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent`}
        >
          {/* Tombol Toggle Khusus 'Buka Menu' di bagian paling atas deretan ikon saat mini sidebar */}
          {isMini && (
            <div className="mb-3 flex justify-center">
              <SidebarTooltip label="Buka Menu" enabled={true}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-xs cursor-pointer flex items-center justify-center transition-all hover:scale-105"
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Buka Menu"
                >
                  <Menu className="size-5 text-sky-200" />
                </Button>
              </SidebarTooltip>
            </div>
          )}

          {/* Fitur Input · Sesuai Dashboard Peran */}
          <div className="mb-3 space-y-1.5">
            {!isMini ? (
              <div
                className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/80 ${
                  firstLoad ? "animate-first-load" : ""
                }`}
                style={firstLoad ? { animationDelay: "80ms" } : undefined}
              >
                Fitur Input · {role}
              </div>
            ) : (
              <div className="h-px bg-white/10 my-2 mx-2" />
            )}

            {/* STAF / ASDOS */}
            {role === "Staf / Asdos" && (
              <div className="space-y-1">
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "120ms" } : undefined}>
                  <SidebarTooltip label="Ajukan Bahan Praktik" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenCreateRequest?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Plus className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Ajukan Bahan Praktik
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "160ms" } : undefined}>
                  <SidebarTooltip label="Input Stok Barang Lab" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenAddStock?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <PackageCheck className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Stok Barang Lab
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
              </div>
            )}

            {/* KOORDINATOR LAB */}
            {role === "Koordinator" && (
              <div className="space-y-1">
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "120ms" } : undefined}>
                  <SidebarTooltip label="Kelola Antrean" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleOpenFifo();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Scale className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Kelola Antrean
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "160ms" } : undefined}>
                  <SidebarTooltip label="Input Verifikasi Berkas" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenVerify?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <ClipboardCheck className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Verifikasi Berkas
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
              </div>
            )}

            {/* KAPRODI */}
            {role === "Kaprodi" && (
              <div className="space-y-1">
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "120ms" } : undefined}>
                  <SidebarTooltip label="Input Menu & Resep" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenAddMenu?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <ChefHat className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Menu &amp; Resep
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "160ms" } : undefined}>
                  <SidebarTooltip label="Kelola Antrean" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleOpenFifo();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Scale className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Kelola Antrean
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
              </div>
            )}

            {/* BAGIAN KEUANGAN */}
            {role === "Bagian Keuangan" && (
              <div className="space-y-1">
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "120ms" } : undefined}>
                  <SidebarTooltip label="Input Pencairan Dana" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onQuickReviewFinance?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Banknote className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Pencairan Dana
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "160ms" } : undefined}>
                  <SidebarTooltip label="Input Verifikasi LPJ" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenVerify?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Receipt className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Verifikasi LPJ
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
              </div>
            )}

            {/* SUPER ADMIN */}
            {role === "Super Admin" && (
              <div className="space-y-1">
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "120ms" } : undefined}>
                  <SidebarTooltip label="Input Pengguna Baru" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenAddUser?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <UserPlus className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Pengguna Baru
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "160ms" } : undefined}>
                  <SidebarTooltip label="Input Mata Kuliah" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenAddCourse?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Plus className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Mata Kuliah
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
                <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "200ms" } : undefined}>
                  <SidebarTooltip label="Input Program Studi" enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onOpenAddProdi?.();
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
                    >
                      <Building2 className="size-[18px] shrink-0 text-blue-200" />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        Input Program Studi
                      </span>
                    </Button>
                  </SidebarTooltip>
                </div>
              </div>
            )}
          </div>

          <div className={`h-px bg-white/10 ${isMini ? "my-2 mx-2" : "my-3"}`} />

          {!isMini && (
            <div
              className={`px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75 ${
                firstLoad ? "animate-first-load" : ""
              }`}
              style={firstLoad ? { animationDelay: "220ms" } : undefined}
            >
              Menu Utama · {role}
            </div>
          )}

          <nav className="space-y-1">
            {sidebarNav.map(({ label, icon: Icon, count }, idx) => {
              const isActive = section === label;
              const tooltipLabel = count !== undefined && count > 0 ? `${label} (${count})` : label;
              return (
                <div
                  key={label}
                  className={firstLoad ? "animate-first-load" : ""}
                  style={firstLoad ? { animationDelay: `${240 + idx * 40}ms` } : undefined}
                >
                  <SidebarTooltip label={tooltipLabel} enabled={isMini}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSection(label);
                        setMobileOpen(false);
                      }}
                      className={`h-11 ${
                        isMini ? "w-11 px-0 justify-center mx-auto relative" : "w-full justify-start gap-3 px-3.5"
                      } text-[13px] font-semibold transition-colors cursor-pointer rounded-lg ${
                        isActive
                          ? "bg-white/20 text-white font-bold shadow-xs hover:bg-white/25 border border-white/20"
                          : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-[18px] shrink-0 ${isActive ? "text-sky-300" : "text-blue-200"}`} />
                      <span
                        className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                          isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                        }`}
                      >
                        {label}
                      </span>
                      {count !== undefined && count > 0 && (
                        !isMini ? (
                          <span className="ml-auto rounded-full bg-white/20 text-white border border-white/25 px-2 py-0.5 text-[10px] font-extrabold shadow-xs transition-opacity duration-200">
                            {count}
                          </span>
                        ) : (
                          <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-sky-300 ring-2 ring-[#1e3a8a]" />
                        )
                      )}
                    </Button>
                  </SidebarTooltip>
                </div>
              );
            })}
          </nav>

          {!isMini ? (
            <div
              className={`mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200/75 ${
                firstLoad ? "animate-first-load" : ""
              }`}
              style={firstLoad ? { animationDelay: "420ms" } : undefined}
            >
              Utilitas
            </div>
          ) : (
            <div className="h-px bg-white/10 my-3 mx-2" />
          )}

          <div className="space-y-1">
            <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "460ms" } : undefined}>
              <SidebarTooltip label="Rekap (Excel)" enabled={isMini}>
                <Button
                  variant="ghost"
                  onClick={exportExcel}
                  className={`h-10 ${
                    isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                  } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
                >
                  <Download className="size-[17px] shrink-0 text-blue-200" />
                  <span
                    className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                      isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                    }`}
                  >
                    Rekap (Excel)
                  </span>
                </Button>
              </SidebarTooltip>
            </div>

            <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "500ms" } : undefined}>
              <SidebarTooltip label="Rekap (PDF)" enabled={isMini}>
                <Button
                  variant="ghost"
                  onClick={exportPdf}
                  className={`h-10 ${
                    isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                  } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
                >
                  <FileText className="size-[17px] shrink-0 text-blue-200" />
                  <span
                    className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                      isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                    }`}
                  >
                    Rekap (PDF)
                  </span>
                </Button>
              </SidebarTooltip>
            </div>

            <div className={firstLoad ? "animate-first-load" : ""} style={firstLoad ? { animationDelay: "540ms" } : undefined}>
              <SidebarTooltip label="Bantuan & Alur Siklus" enabled={isMini}>
                <Button
                  variant="ghost"
                  onClick={() => notify("SPAKE Demo - Dokumentasi dan Alur Siklus 6 Tahap Pengadaan ASAINDO.")}
                  className={`h-10 ${
                    isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                  } text-[13px] font-medium text-blue-100/80 hover:bg-white/10 hover:text-white cursor-pointer rounded-lg`}
                >
                  <CircleHelp className="size-[17px] shrink-0 text-blue-200" />
                  <span
                    className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                      isMini ? "opacity-0 w-0 max-w-0 pointer-events-none" : "opacity-100 flex-1 truncate text-left"
                    }`}
                  >
                    Bantuan &amp; Alur
                  </span>
                </Button>
              </SidebarTooltip>
            </div>
          </div>
        </div>

        {/* User profile footer */}
        <div
          className={`border-t border-white/10 ${
            isMini ? "p-3" : "p-4"
          } bg-black/15 shrink-0 ${firstLoad ? "animate-first-load" : ""}`}
          style={firstLoad ? { animationDelay: "580ms" } : undefined}
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
