import React, { useState, useMemo } from "react";
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
  Calendar,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/common/MetricCard";
import { money } from "@/lib/algorithms/saw";
import type { RequestItem } from "@/types/procurement";

interface MonthlyReportViewProps {
  section: string;
  requests: RequestItem[];
  reportPeriodMonths?: number;
  setReportPeriodMonths?: (m: number) => void;
  setSelectedId: (id: string | null) => void;
  exportExcel: (items?: RequestItem[]) => void;
  exportPdf: (items?: RequestItem[]) => void;
  exportSingleExcel: (r: RequestItem) => void;
  exportSinglePdf?: (r: RequestItem) => void;
}

const MONTH_OPTIONS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9, sept: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

function parseRequestDate(dateStr?: string): { month: number; year: number } | null {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();

  // 1. ISO format YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
    };
  }

  // 2. Format DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return {
      year: parseInt(dmyMatch[3], 10),
      month: parseInt(dmyMatch[2], 10),
    };
  }

  // 3. Text tokens like "29 Sep 2026" or "01 Okt 2026"
  const tokens = s.split(/[\s,.-]+/);
  let year: number | null = null;
  let month: number | null = null;

  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      year = parseInt(token, 10);
    } else if (MONTH_MAP[token]) {
      month = MONTH_MAP[token];
    }
  }

  if (year && month) {
    return { year, month };
  }

  // 4. Native Date fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    };
  }

  return null;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  section,
  requests,
  setSelectedId,
  exportExcel,
  exportPdf,
  exportSingleExcel,
  exportSinglePdf,
}) => {
  // State Filter Dropdown Bulan & Tahun
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2026");

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
            className="animate-slide-up-fade stagger-1"
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
            className="animate-slide-up-fade stagger-2"
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
            className="animate-slide-up-fade stagger-3"
          />
        </div>

        <div className="animate-slide-up-fade stagger-4 rounded-xl border border-border bg-card p-6 shadow-xs">
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
                onClick={() => exportExcel(requests)}
                variant="outline"
                className="h-10 gap-2 font-bold text-xs cursor-pointer"
              >
                <Download className="size-4" /> Unduh Excel
              </Button>
              <Button
                onClick={() => exportPdf(requests)}
                className="h-10 gap-2 bg-primary text-primary-foreground font-bold text-xs cursor-pointer"
              >
                <FileText className="size-4" /> Unduh PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hitung daftar tahun yang tersedia dari dataset requests
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add("2026");
    requests.forEach((r) => {
      const p = parseRequestDate(r.date) || parseRequestDate(r.needBy) || parseRequestDate(r.deadline);
      if (p) years.add(String(p.year));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [requests]);

  // Filter requests berdasarkan Bulan & Tahun yang dipilih
  const filteredPeriodRequests = useMemo(() => {
    return requests.filter((r) => {
      const p = parseRequestDate(r.date) || parseRequestDate(r.needBy) || parseRequestDate(r.deadline);
      if (!p) {
        return selectedMonth === "all";
      }

      if (selectedYear !== "all" && String(p.year) !== selectedYear) {
        return false;
      }

      if (selectedMonth !== "all" && String(p.month) !== selectedMonth) {
        return false;
      }

      return true;
    });
  }, [requests, selectedMonth, selectedYear]);

  const selectedMonthLabel =
    MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || "Semua Bulan";

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

          {/* Filter Periode: Dropdown Bulan & Tahun */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-card/70 border border-border p-1.5 sm:p-2 rounded-xl shadow-xs">
            <div className="flex items-center gap-1.5 px-1.5 text-xs font-bold text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>Periode:</span>
            </div>

            {/* Dropdown Pilihan Bulan (Januari - Desember + Semua Bulan) */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Pilih Bulan"
                className="h-8.5 rounded-lg border border-input bg-card pl-3 pr-8 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            </div>

            {/* Dropdown Pemilih Tahun */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Pilih Tahun"
                className="h-8.5 rounded-lg border border-input bg-card pl-3 pr-8 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
                <option value="all">Semua Tahun</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            </div>

            {/* Tombol Reset Filter jika bukan default */}
            {(selectedMonth !== "all" || selectedYear !== "2026") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedMonth("all");
                  setSelectedYear("2026");
                }}
                className="h-8.5 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                title="Reset ke Semua Bulan (2026)"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
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
            className="animate-slide-up-fade stagger-2"
          />
          <MetricCard
            label="Realisasi Belanja (Nota / Bon)"
            value={money(totalBelanja)}
            foot="Total fisik belanja riil bahan masakan"
            icon={ShoppingBag}
            kind="info"
            className="animate-slide-up-fade stagger-3"
          />
          <MetricCard
            label="Sisa Kembalian (Dipegang Asdos)"
            value={money(totalKembalian)}
            foot="Uang kas sisa tetap dipegang Asdos untuk lab"
            icon={CheckCircle2}
            trend="Kas di Asdos"
            kind="success"
            className="animate-slide-up-fade stagger-4"
          />
          <MetricCard
            label="Total Uang Kurang"
            value={money(totalKurang)}
            foot="Kekurangan dana diajukan reimburse ke Keuangan"
            icon={Clock3}
            trend={totalKurang > 0 ? "Perlu Reimburse" : "Aman"}
            kind={totalKurang > 0 ? "danger" : "success"}
            className="animate-slide-up-fade stagger-5"
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
              {filteredPeriodRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground mb-3">
                        <Calendar className="size-6" />
                      </div>
                      <p className="font-bold text-sm text-foreground">Tidak Ada Transaksi</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tidak ditemukan catatan belanja bahan untuk periode{" "}
                        <span className="font-semibold text-foreground">
                          {selectedMonthLabel} {selectedYear !== "all" ? selectedYear : ""}
                        </span>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMonth("all");
                          setSelectedYear("2026");
                        }}
                        className="mt-3.5 h-8 text-xs font-bold cursor-pointer"
                      >
                        Lihat Semua Transaksi
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPeriodRequests.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="animate-row-enter transition-colors hover:bg-surface/60"
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
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
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-[#0f172a] border border-slate-300">
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
                          className="h-7 px-2 text-xs text-foreground font-bold hover:bg-slate-100"
                          title="Unduh Excel Laporan PR & Bon"
                        >
                          <Download className="size-3" />
                        </Button>
                        {exportSinglePdf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportSinglePdf(r)}
                            className="h-7 px-2 text-xs text-[#0f172a] font-bold hover:bg-slate-100"
                            title="Unduh PDF Formulir PR"
                          >
                            <FileText className="size-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Export Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Menampilkan data belanja bahan:{" "}
            <span className="font-bold text-foreground">
              {selectedMonthLabel} {selectedYear !== "all" ? selectedYear : "(Semua Tahun)"}
            </span>{" "}
            <span className="text-muted-foreground">({filteredPeriodRequests.length} transaksi ditemukan)</span>
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => exportExcel(filteredPeriodRequests)}
              variant="outline"
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Download className="size-3.5" /> Unduh Rekap Excel
            </Button>
            <Button
              onClick={() => exportPdf(filteredPeriodRequests)}
              className="h-9 gap-1.5 bg-primary hover:bg-blue-900 text-white text-xs font-bold cursor-pointer"
            >
              <FileText className="size-3.5" /> Unduh Laporan PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
