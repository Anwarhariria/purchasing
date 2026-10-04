import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityTag } from "@/components/common/PriorityTag";
import { Download, Calendar, Eye, Check, Send, Clock, Layers, Timer } from "lucide-react";
import { money, type FifoRankedItem } from "@/lib/algorithms/fifo";
import type { Role, Status } from "@/types/procurement";

export interface FifoPriorityViewProps {
  fifoRankings: FifoRankedItem[];
  role: Role;
  exportCsv: () => void;
  setQuickReviewId: (id: string) => void;
  updateStatus: (id: string, newStatus: Status) => void;
  setSelectedId: (id: string) => void;
}

export function FifoPriorityView({
  fifoRankings,
  role,
  exportCsv,
  setQuickReviewId,
  updateStatus: _updateStatus,
  setSelectedId,
}: FifoPriorityViewProps) {
  const avgWaitDays =
    fifoRankings.length > 0
      ? Math.round(fifoRankings.reduce((acc, r) => acc + (r.waitingDays || 0), 0) / fifoRankings.length)
      : 0;

  const firstItem = fifoRankings[0];

  return (
    <div className="space-y-6">
      {/* FIFO Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs animate-slide-up-fade stagger-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Antrean FIFO</p>
              <p className="text-xl font-black text-foreground">{fifoRankings.length} Permohonan</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs animate-slide-up-fade stagger-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Prioritas Utama (#1)</p>
              <p className="text-sm font-black text-foreground truncate">
                {firstItem ? `${firstItem.item} (${firstItem.id})` : "Tidak ada antrean"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs animate-slide-up-fade stagger-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
              <Timer className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Rata-rata Waktu Tunggu</p>
              <p className="text-xl font-black text-foreground">{avgWaitDays} Hari Mengantre</p>
            </div>
          </div>
        </div>
      </div>

      {/* FIFO Main Table View */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs animate-slide-up-fade stagger-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                Metode FIFO (First-In, First-Out)
              </span>
              <h2 className="text-lg font-black text-foreground">
                Peringkat Prioritas Belanja (FIFO)
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Urutan pemrosesan berkas disusun secara berurutan sesuai tanggal pengajuan paling awal. Permohonan yang masuk lebih awal dilayani terlebih dahulu untuk menjamin transparansi dan keadilan jadwal praktik.
            </p>
          </div>
          <Button
            onClick={exportCsv}
            variant="outline"
            className="h-9 gap-2 text-xs font-bold self-start md:self-center cursor-pointer"
          >
            <Download className="size-4" /> Unduh Antrean FIFO
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-center">No. Antrean</th>
                <th className="px-4 py-3">Kode PR &amp; Bahan</th>
                <th className="px-4 py-3">Unit Pemohon</th>
                <th className="px-4 py-3">Tgl Diajukan &amp; Waktu Tunggu</th>
                <th className="px-4 py-3">Estimasi Biaya</th>
                <th className="px-4 py-3 text-center">Status Antrean FIFO</th>
                <th className="px-4 py-3 text-right">Rekomendasi Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fifoRankings.map((item, idx) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-surface/70 animate-row-enter"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${
                        idx === 0
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : idx === 1
                            ? "bg-blue-100 text-blue-900 font-bold"
                            : idx === 2
                              ? "bg-slate-200 text-slate-800 font-bold"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      #{item.fifoQueueNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-foreground font-mono">{item.id}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-foreground">{item.item}</p>
                    {item.course && (
                      <p className="text-[11px] text-muted-foreground">{item.course}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <p className="font-semibold text-foreground">{item.applicant}</p>
                    <p className="text-[10px] text-muted-foreground">{item.department}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      <span>{item.date}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> Mengantre {item.waitingDays} hari
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                    {money(item.price)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-block rounded-md px-2.5 py-1 text-xs font-black border ${
                        idx === 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : idx <= 2
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {item.fifoPriorityLabel}
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
