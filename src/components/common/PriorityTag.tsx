import type { RequestItem } from "@/types/procurement";
import { daysLeft } from "@/lib/algorithms/saw";

export function PriorityTag({
  r,
  urgency,
  needBy,
}: {
  r?: RequestItem;
  urgency?: RequestItem["urgency"];
  needBy?: string;
}) {
  const itemUrgency = urgency || r?.urgency || "Normal";
  const itemNeedBy = needBy || r?.needBy;
  const d = itemNeedBy ? daysLeft(itemNeedBy) : 0;
  if (r?.status === "Selesai") {
    return <span className="text-[11px] text-muted-foreground font-medium">Selesai</span>;
  }
  const isUrgent = itemUrgency === "Mendesak" || d <= 3;
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold ${
          isUrgent
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        {itemNeedBy ? (d < 0 ? `Terlambat ${-d} hari` : d === 0 ? "Hari ini" : `${d} hari lagi`) : itemUrgency}
      </span>
      {itemUrgency === "Mendesak" && (
        <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">
          Urgensi Tinggi
        </span>
      )}
    </div>
  );
}
