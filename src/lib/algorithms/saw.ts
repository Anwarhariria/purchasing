import type { RequestItem } from "@/types/procurement";
import { money, daysLeft, calculateFIFO } from "./fifo";

export { money, daysLeft };

export interface SawRankedItem extends RequestItem {
  sawScore: number;
  daysRemaining: number;
}

export function calculateSAW(items: RequestItem[]): SawRankedItem[] {
  // Backward compatibility alias forwarding to FIFO (First-In, First-Out)
  const fifo = calculateFIFO(items);
  return fifo.map((item, idx) => ({
    ...item,
    sawScore: Number((1.0 - idx * 0.05).toFixed(3)),
    daysRemaining: daysLeft(item.needBy),
  }));
}
