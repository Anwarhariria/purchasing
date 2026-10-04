import type { Status } from "@/types/procurement";
import { Check, ShoppingBag, Truck, CheckCircle2, X } from "lucide-react";

export function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "Diajukan":
      return (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40">
          Diajukan
        </span>
      );
    case "Diverifikasi Koordinator":
      return (
        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
          Diverifikasi Koordinator
        </span>
      );
    case "Disetujui Kaprodi":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
          <Check className="size-3 text-emerald-600 stroke-[2.5]" />
          Disetujui Kaprodi
        </span>
      );
    case "Dana Dicairkan":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-violet-50 text-violet-800 border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40">
          <Check className="size-3 text-violet-600 stroke-[2.5]" />
          Dana Dicairkan
        </span>
      );
    case "Proses Pembelian":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-blue-50 text-blue-800 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
          <ShoppingBag className="size-3 text-blue-600" />
          Proses Pembelian
        </span>
      );
    case "Laporan Belanja Diajukan":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-indigo-50 text-indigo-800 border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
          <Truck className="size-3 text-indigo-600" />
          Laporan Belanja Diajukan
        </span>
      );
    case "Selesai":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold border shadow-2xs bg-emerald-50 text-emerald-900 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="size-3 text-emerald-600" />
          Selesai
        </span>
      );
    case "Ditolak":
      return (
        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border shadow-2xs bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
          <X className="size-3 text-rose-600 stroke-[2.5]" />
          Ditolak
        </span>
      );
    default:
      return null;
  }
}
