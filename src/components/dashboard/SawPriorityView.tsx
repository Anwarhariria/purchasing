import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityTag } from "@/components/common/PriorityTag";
import { Download, Calendar, Eye, Check, Send, ShoppingBag, Truck } from "lucide-react";
import { money, type SawRankedItem } from "@/lib/algorithms/saw";
import type { Role, Status } from "@/types/procurement";

interface SawPriorityViewProps {
  sawRankings: SawRankedItem[];
  role: Role;
  exportCsv: () => void;
  setQuickReviewId: (id: string) => void;
  updateStatus: (id: string, newStatus: Status) => void;
  setSelectedId: (id: string) => void;
}

export function SawPriorityView({
  sawRankings,
  role,
  exportCsv,
  setQuickReviewId,
  updateStatus,
  setSelectedId,
}: SawPriorityViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                Algoritma SAW
              </span>
              <h2 className="text-lg font-black text-foreground">
                Peringkat Prioritas Belanja (Simple Additive Weighting)
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Kalkulasi multikriteria: Urgensi Kebutuhan (35%), Kepentingan Akademik (30%), Tenggat Waktu (20%), dan Efisiensi Anggaran (15%).
            </p>
          </div>
          <Button
            onClick={exportCsv}
            variant="outline"
            className="h-9 gap-2 text-xs font-bold self-start md:self-center cursor-pointer"
          >
            <Download className="size-4" /> Unduh Hasil SAW
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-center">Rank</th>
                <th className="px-4 py-3">Kode PR &amp; Barang</th>
                <th className="px-4 py-3">Unit Pemohon</th>
                <th className="px-4 py-3">Urgensi &amp; Tenggat</th>
                <th className="px-4 py-3">Estimasi Biaya</th>
                <th className="px-4 py-3 text-center">Skor SAW</th>
                <th className="px-4 py-3 text-right">Rekomendasi Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sawRankings.map((item, idx) => (
                <tr key={item.id} className="transition-colors hover:bg-surface/70">
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${
                        idx === 0
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : idx === 1
                            ? "bg-slate-200 text-slate-800"
                            : idx === 2
                              ? "bg-blue-100 text-blue-800"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-primary">{item.id}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-foreground">{item.item}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <p className="font-semibold text-foreground">{item.applicant}</p>
                    <p className="text-[10px] text-muted-foreground">{item.department}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <PriorityTag r={item} />
                    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" /> {item.deadline || item.needBy}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                    {money(item.price)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block rounded-md bg-primary/10 px-2.5 py-1 text-xs font-black text-primary font-mono">
                      {item.sawScore.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {role === "Bagian Keuangan" && item.status === "Disetujui Kaprodi" ? (
                      <Button
                        size="sm"
                        onClick={() => setQuickReviewId(item.id)}
                        className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Check className="size-3.5" /> Cairkan Dana
                      </Button>
                    ) : role === "Koordinator" && item.status === "Diajukan" ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(item.id)}
                        className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Send className="size-3.5" /> Verifikasi Qty
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedId(item.id)}
                        className="h-8 text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer"
                      >
                        <Eye className="size-3.5 mr-1" /> Detail
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
