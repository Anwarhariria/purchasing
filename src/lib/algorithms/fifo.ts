import type { RequestItem } from "@/types/procurement";

export const money = (val: number) => "Rp " + val.toLocaleString("id-ID");

export function daysLeft(needBy: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(needBy + "T00:00:00").getTime() - t.getTime()) / 86400000);
}

export interface FifoRankedItem extends RequestItem {
  fifoQueueNumber: number;
  waitingDays: number;
  fifoPriorityLabel: string;
}

export function calculateFIFO(items: RequestItem[]): FifoRankedItem[] {
  if (items.length === 0) return [];

  // Urutkan berdasarkan tanggal pengajuan paling awal (First-In, First-Out)
  // Permohonan yang diajukan lebih awal memiliki nomor antrean lebih kecil dan diproses lebih dulu
  const sorted = [...items].sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return sorted.map((item, index) => {
    const submitTime = new Date(item.date).getTime();
    const waitingDays = submitTime ? Math.max(0, Math.floor((now.getTime() - submitTime) / 86400000)) : 0;
    const fifoQueueNumber = index + 1;
    const fifoPriorityLabel =
      fifoQueueNumber === 1
        ? "Antrean Utama #1 (Pertama Masuk)"
        : fifoQueueNumber <= 3
        ? `Antrean Prioritas #${fifoQueueNumber}`
        : `Antrean #${fifoQueueNumber}`;

    return {
      ...item,
      fifoQueueNumber,
      waitingDays,
      fifoPriorityLabel,
    };
  });
}
