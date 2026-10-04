import type { Status } from "@/types/procurement";
import { Check, ShoppingBag, Truck, CheckCircle2, X } from "lucide-react";

export function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "Diajukan":
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          Diajukan
        </span>
      );
    case "Diverifikasi Koordinator":
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          Diverifikasi Koordinator
        </span>
      );
    case "Disetujui Kaprodi":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Check className="size-3 text-emerald-700 stroke-[3]" />
          Disetujui Kaprodi
        </span>
      );
    case "Dana Dicairkan":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Check className="size-3 text-purple-700 stroke-[3]" />
          Dana Dicairkan
        </span>
      );
    case "Proses Pembelian":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <ShoppingBag className="size-3 text-sky-700" />
          Proses Pembelian
        </span>
      );
    case "Laporan Belanja Diajukan":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Truck className="size-3 text-indigo-700" />
          Laporan Belanja Diajukan
        </span>
      );
    case "Selesai":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-green-100 text-green-900 border border-green-300">
          <CheckCircle2 className="size-3 text-green-700" />
          Selesai
        </span>
      );
    case "Ditolak":
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-900 border border-slate-300">
          <X className="size-3 text-slate-900 stroke-[2.5]" />
          Ditolak
        </span>
      );
    default:
      return null;
  }
}
