import type { RequestItem } from "@/types/procurement";

export const money = (val: number) => "Rp " + val.toLocaleString("id-ID");

export function daysLeft(needBy: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(needBy + "T00:00:00").getTime() - t.getTime()) / 86400000);
}

export interface SawRankedItem extends RequestItem {
  sawScore: number;
  daysRemaining: number;
}

export function calculateSAW(items: RequestItem[]): SawRankedItem[] {
  if (items.length === 0) return [];
  const minDays = Math.max(1, Math.min(...items.map((i) => Math.max(1, daysLeft(i.needBy)))));
  const minPrice = Math.min(...items.map((i) => i.price));

  return items
    .map((item) => {
      const c1 = item.urgency === "Mendesak" ? 1.0 : 0.5;
      const c2 = item.academicImportance === "Tinggi" ? 1.0 : item.academicImportance === "Sedang" ? 0.7 : 0.4;
      const itemDays = Math.max(1, daysLeft(item.needBy));
      const c3 = minDays / itemDays;
      const c4 = minPrice / item.price;
      const sawScore = Number((c1 * 0.35 + c2 * 0.3 + c3 * 0.2 + c4 * 0.15).toFixed(3));
      return { ...item, sawScore, daysRemaining: itemDays };
    })
    .sort((a, b) => b.sawScore - a.sawScore);
}
