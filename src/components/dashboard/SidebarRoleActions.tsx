import React from "react";
import {
  Plus,
  PackageCheck,
  ListChecks,
  ClipboardCheck,
  Utensils,
  Banknote,
  Receipt,
  UserPlus,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/procurement";

interface SidebarRoleActionsProps {
  role: Role;
  workflow?: "A" | "B";
  isMini: boolean;
  firstLoad: boolean;
  setMobileOpen: (v: boolean) => void;
  SidebarTooltip: React.ComponentType<{
    label: React.ReactNode;
    children: React.ReactNode;
    enabled?: boolean | undefined;
  }>;
  onOpenCreateRequest?: (() => void) | undefined;
  onOpenAddStock?: (() => void) | undefined;
  onOpenAddUser?: (() => void) | undefined;
  onOpenAddProdi?: (() => void) | undefined;
  onOpenAddCourse?: (() => void) | undefined;
  onOpenAddMenu?: (() => void) | undefined;
  onQuickReviewFinance?: (() => void) | undefined;
  onOpenQueue?: (() => void) | undefined;
  onOpenVerify?: (() => void) | undefined;
}

interface ActionBtnConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: (() => void) | undefined;
  delayMs: number;
}

export function SidebarRoleActions({
  role,
  workflow = "A",
  isMini,
  firstLoad,
  setMobileOpen,
  SidebarTooltip,
  onOpenCreateRequest,
  onOpenAddStock,
  onOpenAddUser,
  onOpenAddProdi,
  onOpenAddCourse,
  onOpenAddMenu,
  onQuickReviewFinance,
  onOpenQueue,
  onOpenVerify,
}: SidebarRoleActionsProps) {
  const getActionsForRole = (): ActionBtnConfig[] => {
    switch (role) {
      case "Asdos Kitchen":
      case "Staf Unit":
        if (workflow === "B") {
          return [
            {
              label: "Pengajuan Barang",
              icon: Plus,
              onClick: onOpenCreateRequest,
              delayMs: 120,
            },
          ];
        }
        return [
          {
            label: "Ajukan Bahan Praktik",
            icon: Plus,
            onClick: onOpenCreateRequest,
            delayMs: 120,
          },
          {
            label: "Input Stok Barang Lab",
            icon: PackageCheck,
            onClick: onOpenAddStock,
            delayMs: 160,
          },
        ];

      case "Koordinator Lab":
      case "Koordinator Unit":
        if (workflow === "B") {
          return [
            {
              label: "Antrean Verifikasi",
              icon: ListChecks,
              onClick: onOpenQueue,
              delayMs: 120,
            },
          ];
        }
        return [
          {
            label: "Antrean Verifikasi",
            icon: ListChecks,
            onClick: onOpenQueue,
            delayMs: 120,
          },
          {
            label: "Cek & Input Stok Lab",
            icon: PackageCheck,
            onClick: onOpenAddStock,
            delayMs: 150,
          },
        ];

      case "Kaprodi":
        return [
          {
            label: "Input Menu & Resep",
            icon: Utensils,
            onClick: onOpenAddMenu,
            delayMs: 120,
          },
          {
            label: "Antrean Validasi",
            icon: ListChecks,
            onClick: onOpenQueue,
            delayMs: 160,
          },
        ];

      case "Keuangan Kitchen":
      case "Keuangan Umum":
        return [
          {
            label: "Input Pencairan Dana",
            icon: Banknote,
            onClick: onQuickReviewFinance,
            delayMs: 120,
          },
          {
            label: "Input Verifikasi Laporan Belanja",
            icon: Receipt,
            onClick: onOpenVerify,
            delayMs: 160,
          },
        ];

      case "Super Admin":
        return [
          {
            label: "Input Pengguna Baru",
            icon: UserPlus,
            onClick: onOpenAddUser,
            delayMs: 120,
          },
          {
            label: "Input Mata Kuliah",
            icon: Plus,
            onClick: onOpenAddCourse,
            delayMs: 160,
          },
          {
            label: "Input Program Studi",
            icon: Building2,
            onClick: onOpenAddProdi,
            delayMs: 200,
          },
        ];

      default:
        return [];
    }
  };

  const actions = getActionsForRole();
  if (actions.length === 0) return null;

  return (
    <div className="space-y-1">
      {actions.map((act) => {
        const IconComponent = act.icon;
        return (
          <div
            key={act.label}
            className={firstLoad ? "animate-first-load" : ""}
            style={firstLoad ? { animationDelay: `${act.delayMs}ms` } : undefined}
          >
            <SidebarTooltip label={act.label} enabled={isMini}>
              <Button
                variant="ghost"
                onClick={() => {
                  act.onClick?.();
                  setMobileOpen(false);
                }}
                className={`h-11 ${
                  isMini ? "w-11 px-0 justify-center mx-auto" : "w-full justify-start gap-3 px-3.5"
                } text-[13px] font-semibold text-blue-100/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer rounded-lg`}
              >
                <IconComponent className="size-[18px] shrink-0 text-blue-200" />
                <span
                  className={`transition-opacity duration-200 ease-in-out overflow-hidden whitespace-nowrap ${
                    isMini
                      ? "opacity-0 w-0 max-w-0 pointer-events-none"
                      : "opacity-100 flex-1 truncate text-left"
                  }`}
                >
                  {act.label}
                </span>
              </Button>
            </SidebarTooltip>
          </div>
        );
      })}
    </div>
  );
}
