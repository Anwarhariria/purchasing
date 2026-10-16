import {
  LayoutDashboard,
  ClipboardList,
  PackageCheck,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Clock3,
  ShieldCheck,
  Utensils,
  Wallet,
  Building2,
  Users,
  BookOpen,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Role, WorkflowType } from "@/types/procurement";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  count?: number | undefined;
}

export interface NavBadgeCounts {
  requestsCount?: number;
  stockCount?: number;
  pendingReviewCount?: number;
  pendingKaprodiCount?: number;
  pendingFinanceCount?: number;
  pendingLpjCount?: number;
  userCount?: number;
  kasbonPendingCount?: number;
}

/**
 * Menghasilkan daftar menu navigasi sidebar sesuai peran (Role) dan alur kerja aktif (Alur A vs Alur B).
 */
export function getSidebarNav(
  role: Role | null,
  counts: NavBadgeCounts = {},
  workflow: WorkflowType = "A",
): NavItem[] {
  if (!role) return [];
  if (workflow === "B") {
    // Navigasi Khusus Alur B: Umum & ATK (7 Unit Kerja Kampus)
    switch (role) {
      case "Staf Unit":
      case "Asdos Kitchen":
        return [
          { label: "Ringkasan Logistik", icon: LayoutDashboard },
          { label: "Pengajuan Unit Kerja", icon: ClipboardList, count: counts.requestsCount },
          { label: "Rekomendasi Kebutuhan", icon: TrendingUp },
          { label: "Laporan Logistik Unit", icon: FileText },
        ];

      case "Koordinator Unit":
      case "Koordinator Lab":
        return [
          { label: "Ringkasan Logistik", icon: LayoutDashboard },
          {
            label: "Verifikasi Pengajuan Unit",
            icon: ClipboardCheck,
            count: counts.pendingReviewCount,
          },
          { label: "Peramalan Kebutuhan Unit", icon: TrendingUp },
          { label: "Laporan Logistik Unit", icon: FileText },
        ];

      case "Keuangan Umum":
      case "Keuangan Kitchen":
        return [
          { label: "Ringkasan Logistik", icon: LayoutDashboard },
          { label: "Peramalan Kebutuhan Barang", icon: TrendingUp },
          {
            label: "Alokasi & Penugasan Belanja",
            icon: Wallet,
            count: counts.pendingFinanceCount,
          },
          {
            label: "Rekonsiliasi Bon & Serah Terima",
            icon: Truck,
            count: counts.pendingLpjCount,
          },
          { label: "Laporan Logistik Unit", icon: FileText },
        ];

      case "Super Admin":
        return [
          { label: "Ringkasan Logistik", icon: LayoutDashboard },
          { label: "Model Peramalan", icon: TrendingUp },
          { label: "Pengajuan Unit Kerja", icon: ClipboardList },
          { label: "Pengguna & Peran", icon: Users, count: counts.userCount },
          { label: "Laporan Logistik Unit", icon: FileText },
        ];

      default:
        return [{ label: "Ringkasan Logistik", icon: LayoutDashboard }];
    }
  }

  // Navigasi Khusus Alur A: Kitchen & Praktikum (D3 Perhotelan)
  switch (role) {
    case "Asdos Kitchen":
    case "Staf Unit":
      return [
        { label: "Ringkasan", icon: LayoutDashboard },
        { label: "Permohonan", icon: ClipboardList, count: counts.requestsCount },
        { label: "Buku Kasbon Asdos", icon: Wallet, count: counts.kasbonPendingCount },
        {
          label: "Inventaris Stok Lab",
          icon: PackageCheck,
          count: counts.stockCount,
        },
        { label: "Laporan", icon: FileText },
      ];

    case "Koordinator Lab":
    case "Koordinator Unit":
      return [
        { label: "Ringkasan", icon: LayoutDashboard },
        {
          label: "Verifikasi Standar Bahan",
          icon: ClipboardCheck,
          count: counts.pendingReviewCount,
        },
        {
          label: "Cek Stok Bahan Lab",
          icon: PackageCheck,
          count: counts.stockCount,
        },
        { label: "Buku Kasbon Asdos", icon: Wallet },
        { label: "Antrean Belanja", icon: Clock3 },
        { label: "Laporan", icon: FileText },
      ];

    case "Kaprodi":
      return [
        { label: "Ringkasan", icon: LayoutDashboard },
        {
          label: "Persetujuan Kurikulum",
          icon: ShieldCheck,
          count: counts.pendingKaprodiCount,
        },
        { label: "Kelola Menu & Bahan", icon: Utensils },
        { label: "Antrean Belanja", icon: Clock3 },
        { label: "Laporan", icon: FileText },
      ];

    case "Keuangan Kitchen":
    case "Keuangan Umum":
      return [
        { label: "Ringkasan", icon: LayoutDashboard },
        {
          label: "Pencairan Dana",
          icon: Wallet,
          count: counts.pendingFinanceCount,
        },
        {
          label: "Buku Kasbon Asdos",
          icon: BookOpen,
          count: counts.kasbonPendingCount,
        },
        {
          label: "Verifikasi Laporan Belanja",
          icon: FileText,
          count: counts.pendingLpjCount,
        },
        { label: "Laporan", icon: FileText },
      ];

    case "Super Admin":
      return [
        { label: "Ringkasan", icon: LayoutDashboard },
        { label: "Master Permohonan", icon: ClipboardList },
        { label: "Buku Kasbon Asdos", icon: Wallet },
        { label: "Master Prodi & Matakuliah", icon: Building2 },
        { label: "Pengguna & Peran", icon: Users, count: counts.userCount },
        { label: "Laporan", icon: FileText },
      ];

    default:
      return [{ label: "Ringkasan", icon: LayoutDashboard }];
  }
}
