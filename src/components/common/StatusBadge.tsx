import type { Status } from "@/types/procurement";
import {
  Check,
  ShoppingBag,
  Truck,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  PackageCheck,
} from "lucide-react";

export function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "DIAJUKAN":
      return (
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40">
          <Clock className="size-3 text-sky-600" />
          Diajukan
        </span>
      );
    case "DIVERIFIKASI_KOORD":
      return (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
          Diverifikasi Koordinator
        </span>
      );
    case "DITOLAK_KOORD":
      return (
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
          <X className="size-3 text-rose-600 stroke-[2.5]" />
          Ditolak Koordinator
        </span>
      );
    case "DISETUJUI_KAPRODI":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
          <Check className="size-3 text-emerald-600 stroke-[2.5]" />
          Disetujui Kaprodi
        </span>
      );
    case "DITOLAK_KAPRODI":
      return (
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
          <X className="size-3 text-rose-600 stroke-[2.5]" />
          Ditolak Kaprodi
        </span>
      );
    case "DITOLAK_KEUANGAN":
      return (
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
          <AlertTriangle className="size-3 text-rose-600" />
          Ditolak Keuangan
        </span>
      );
    case "DANA_DICAIRKAN":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-blue-50 text-blue-800 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
          <Check className="size-3 text-blue-600 stroke-[2.5]" />
          Dana Dicairkan
        </span>
      );
    case "SEDANG_DIBELANJAKAN":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-blue-50 text-blue-800 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
          <ShoppingBag className="size-3 text-blue-600" />
          Sedang Dibelanjakan
        </span>
      );
    case "BARANG_DITERIMA":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-purple-50 text-purple-800 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
          <PackageCheck className="size-3 text-purple-600" />
          Barang Diterima
        </span>
      );
    case "LAPORAN_BELANJA_DIAJUKAN":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40">
          <Truck className="size-3 text-sky-600" />
          Laporan Belanja Diajukan
        </span>
      );
    case "SELESAI":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold border shadow-2xs bg-emerald-50 text-emerald-900 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="size-3 text-emerald-600" />
          Selesai
        </span>
      );
    default:
      return null;
  }
}
