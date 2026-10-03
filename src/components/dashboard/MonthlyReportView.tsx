import React from "react";
import {
  Wallet,
  Activity,
  ShieldCheck,
  Download,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Clock3,
  Info,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/common/MetricCard";
import { money } from "@/lib/algorithms/saw";
import type { RequestItem } from "@/types/procurement";

interface MonthlyReportViewProps {
  section: string;
  requests: RequestItem[];
  reportPeriodMonths: number;
  setReportPeriodMonths: (m: number) => void;
  setSelectedId: (id: string | null) => void;
  exportExcel: () => void;
  exportPdf: () => void;
  exportSingleExcel: (r: RequestItem) => void;
  exportSinglePdf?: (r: RequestItem) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  section,
  requests,
  reportPeriodMonths,
  setReportPeriodMonths,
  setSelectedId,
  exportExcel,
  exportPdf,
  exportSingleExcel,
  exportSinglePdf,
}) => {
  // RENDER GENERAL REPORT
  if (section.includes("Laporan") && section !== "Report Bulanan") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total Belanja Terealisasi"
            value={money(
              requests
                .filter((r) => r.status === "Selesai")
                .reduce((s, r) => s + r.price, 0)
            )}
            foot="Transaksi resmi ditutup"
            icon={Wallet}
            kind="success"
          />
          <MetricCard
            label="Permohonan Berjalan"
            value={String(
              requests.filter((r) => !["Selesai", "Ditolak"].includes(r.status))
                .length
            ).padStart(2, "0")}
            foot="Masih dalam tahapan siklus"
            icon={Activity}
            kind="warning"
          />
          <MetricCard
            label="Tingkat Pemenuhan"
            value={`${Math.round(
              (requests.filter((r) => r.status === "Selesai").length /
                (requests.length || 1)) *
                100
            )}%`}
            foot="Rasio permohonan selesai"
            icon={ShieldCheck}
            kind="primary"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Unduh Rekap Laporan Pengadaan
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Laporan data pengadaan mencakup ID, nama pemohon, estimasi biaya, dan status pengadaan terkini.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportExcel}
                variant="outline"
                className="h-10 gap-2 font-bold text-xs"
              >
                <Download className="size-4" /> Unduh Excel
              </Button>
              <Button
                onClick={exportPdf}
                className="h-10 gap-2 bg-primary text-primary-foreground font-bold text-xs"
              >
                <FileText className="size-4" /> Unduh PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER REPORT BULANAN STAF / ASDOS
  const filteredPeriodRequests = requests.filter((_, idx) => {
    if (reportPeriodMonths === 1) return idx <= 3;
    if (reportPeriodMonths === 2) return idx <= 5;
    if (reportPeriodMonths === 3) return idx <= 6;
    return true;
  });

  const totalCair = filteredPeriodRequests.reduce(
    (sum, r) => sum + (r.disbursedAmount || 0),
    0
  );
  const totalBelanja = filteredPeriodRequests.reduce(
    (sum, r) => sum + (r.actualSpent || 0),
    0
  );
  const totalKembalian = filteredPeriodRequests.reduce(
    (sum, r) => sum + (r.refundAmount || 0),
    0
  );
  const totalKurang = filteredPeriodRequests.reduce(
    (sum, r) => sum + (r.deficitAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary uppercase">
                Laporan Keuangan Asdos
              </span>
              <h2 className="text-lg font-black text-foreground">
                Rekap Belanja Bahan Praktikum & Kas Lab
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Laporan periodik dana dicairkan, realisasi nota belanja, sisa uang kembalian di Asdos, dan penggantian kekurangan belanja.
            </p>
          </div>

          {/* Period Selector: 1 bulan, 2 bulan, 3 bulan, 6 bulan (1 semester) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Periode:</span>
            {[
              { label: "1 Bulan", months: 1 },
              { label: "2 Bulan", months: 2 },
              { label: "3 Bulan (Triwulan)", months: 3 },
              { label: "6 Bulan (1 Semester)", months: 6 },
              { label: "Semua", months: 12 },
            ].map((p) => (
              <Button
                key={p.months}
                variant={reportPeriodMonths === p.months ? "default" : "outline"}
                size="sm"
                onClick={() => setReportPeriodMonths(p.months)}
                className={`h-8 text-xs font-bold ${
                  reportPeriodMonths === p.months
                    ? "bg-[#800000] text-white hover:bg-[#660000]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Metric Cards for Report Bulanan */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Dana Ditransfer Keuangan"
            value={money(totalCair)}
            foot={`${
              filteredPeriodRequests.filter((r) => r.disbursedAmount).length
            } transaksi dicairkan ke rekening Asdos`}
            icon={Wallet}
            kind="primary"
          />
          <MetricCard
            label="Realisasi Belanja (Nota / Bon)"
            value={money(totalBelanja)}
            foot="Total fisik belanja riil bahan masakan"
            icon={ShoppingBag}
            kind="info"
          />
          <MetricCard
            label="Sisa Kembalian (Dipegang Asdos)"
            value={money(totalKembalian)}
            foot="Uang kas sisa tetap dipegang Asdos untuk lab"
            icon={CheckCircle2}
            trend="Kas di Asdos"
            kind="success"
          />
          <MetricCard
            label="Total Uang Kurang"
            value={money(totalKurang)}
            foot="Kekurangan dana diajukan reimburse ke Keuangan"
            icon={Clock3}
            trend={totalKurang > 0 ? "Perlu Reimburse" : "Aman"}
            kind={totalKurang > 0 ? "danger" : "success"}
          />
        </div>

        {/* Financial Note Rule Box */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          <p className="font-bold flex items-center gap-1.5">
            <Info className="size-4 shrink-0 text-blue-700 dark:text-blue-400" />
            Kebijakan Saldo Kas Belanja Laboratorium Masak:
          </p>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            <li>
              <strong>Jika ada sisa uang kembalian:</strong> Asdos tetap wajib melaporkan nominalnya pada LPJ, namun uang kembalian <u>tetap dipegang oleh Asdos</u> untuk operasional dan cadangan belanja bahan berikutnya.
            </li>
            <li>
              <strong>Jika dana belanja kurang:</strong> Asdos melaporkan nominal defisit belanja beserta foto nota agar <u>Bagian Keuangan dapat mengganti (reimburse)</u> kekurangan tersebut.
            </li>
          </ul>
        </div>

        {/* Table of Monthly Reports */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Kode PR & Menu Masak</th>
                <th className="px-4 py-3">Matakuliah & Semester</th>
                <th className="px-4 py-3 text-right">Dana Dicairkan</th>
                <th className="px-4 py-3 text-right">Realisasi (Bon)</th>
                <th className="px-4 py-3 text-center">Status Selisih Kas</th>
                <th className="px-4 py-3 text-center">Dokumen Bon</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPeriodRequests.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface/60">
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-extrabold text-primary text-xs">{r.id}</span>
                    <p className="font-bold text-foreground mt-0.5">{r.menu || r.item}</p>
                    <span className="text-[10px] text-muted-foreground">{r.date}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-foreground">{r.course || "Praktik Masak"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.prodi} · Smt {r.semester}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                    {r.disbursedAmount ? (
                      money(r.disbursedAmount)
                    ) : (
                      <span className="text-muted-foreground italic">Belum Cair</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-foreground">
                    {r.actualSpent ? (
                      money(r.actualSpent)
                    ) : (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.refundAmount && r.refundAmount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        + {money(r.refundAmount)} (Kembalian di Asdos)
                      </span>
                    ) : r.deficitAmount && r.deficitAmount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                        - {money(r.deficitAmount)} ({r.reimbursementStatus === "Telah Diganti" ? "Telah Diganti" : "Uang Kurang"})
                      </span>
                    ) : r.actualSpent ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Pas (Rp 0)
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">Menunggu Belanja</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.receiptImages && r.receiptImages.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="size-3.5" /> {r.receiptImages.length} Foto Nota
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Belum Ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-7 px-2.5 text-xs font-semibold"
                      >
                        <Eye className="size-3 mr-1" /> Detail
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportSingleExcel(r)}
                        className="h-7 px-2 text-xs text-primary font-bold hover:bg-primary/10"
                        title="Unduh Excel Laporan PR & Bon"
                      >
                        <Download className="size-3" />
                      </Button>
                      {exportSinglePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportSinglePdf(r)}
                          className="h-7 px-2 text-xs text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Unduh PDF Formulir PR"
                        >
                          <FileText className="size-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Menampilkan data belanja bahan periode {reportPeriodMonths} bulan terakhir.
          </p>
          <div className="flex gap-2">
            <Button onClick={exportExcel} variant="outline" className="h-9 gap-1.5 text-xs font-bold">
              <Download className="size-3.5" /> Unduh Rekap Excel
            </Button>
            <Button onClick={exportPdf} className="h-9 gap-1.5 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold">
              <FileText className="size-3.5" /> Unduh Laporan PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
