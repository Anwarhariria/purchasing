import type { RequestItem } from "@/types/procurement";
import { daysLeft } from "@/lib/utils";

export function DeadlineTag({ r, needBy }: { r?: RequestItem; needBy?: string }) {
  const itemNeedBy = needBy || r?.needBy;
  if (r?.status === "SELESAI") {
    return <span className="text-[11px] text-muted-foreground font-medium">Selesai</span>;
  }
  if (!itemNeedBy) {
    return null;
  }
  const d = daysLeft(itemNeedBy);
  const isLate = d < 0;
  const isWarning = d >= 0 && d <= 3;

  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold ${
        isLate
          ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
          : isWarning
            ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50"
            : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
      }`}
    >
      {d < 0 ? `Terlambat ${-d} hari` : d === 0 ? "Hari ini" : `${d} hari lagi`}
    </span>
  );
}
