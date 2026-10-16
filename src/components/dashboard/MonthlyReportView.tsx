import React, { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  Activity,
  ShieldCheck,
  Download,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Clock3,
  Eye,
  Calendar,
  User,
  Users,
  ChevronDown,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Receipt,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/common/MetricCard";
import { PeriodFilter, type PeriodFilterValues } from "@/components/dashboard/PeriodFilter";
import {
  money,
  parseRequestDate,
  MONTH_NAMES,
  matchesCoordinatorUnit,
  formatUnitLabel,
} from "@/lib/utils";
import { exportBatchBkkPdf, exportBkkPdf, isBkkPrintable } from "@/lib/export/bkk-pdf-export";
import {
  type RequestItem,
  type Role,
  type UserAccount,
  type WorkflowType,
  isPemohon as checkIsPemohon,
  isKoordinator as checkIsKoordinator,
} from "@/types/procurement";

/** Helper untuk render mata uang dengan 'Rp' dan nominal yang sejajar rapi */
function renderCurrencyCell(val?: number | null, prefix = "") {
  if (val === undefined || val === null || val === 0) {
    return <span className="text-muted-foreground font-normal">-</span>;
  }
  const formatted = Math.abs(val).toLocaleString("id-ID");
  return (
    <div className="inline-flex items-baseline justify-end gap-1 w-full font-mono text-xs tabular-nums text-right">
      <span className="text-[10px] font-semibold text-muted-foreground select-none shrink-0">
        {prefix}Rp
      </span>
      <span className="font-extrabold text-foreground">{formatted}</span>
    </div>
  );
}

interface MonthlyReportViewProps {
  section: string;
  requests: RequestItem[];
  reportPeriodMonths?: number;
  setReportPeriodMonths?: (m: number) => void;
  setSelectedId: (id: string | null) => void;
  exportExcel: (
    items?: RequestItem[],
    options?: { periodLabel?: string; applicantFilter?: string },
  ) => void;
  exportPdf: (
    items?: RequestItem[],
    options?: { periodLabel?: string; applicantFilter?: string },
  ) => void;
  exportSingleExcel: (r: RequestItem) => void;
  exportSinglePdf?: (r: RequestItem) => void;
  role?: Role;
  currentUser?: UserAccount | null;
  workflow?: WorkflowType;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  section: _section,
  requests,
  setSelectedId,
  exportExcel,
  exportPdf,
  exportSingleExcel,
  exportSinglePdf,
  role,
  currentUser,
  workflow = "A",
}) => {
  const isAlurB = workflow === "B";
  const isPemohon = checkIsPemohon(role);
  const isKoordinator = checkIsKoordinator(role);

  // 1. Filter pertama: Sesuai Alur A atau Alur B
  const workflowRequests = useMemo(() => {
    return requests.filter((r) => {
      if (isAlurB) return r.alur === "B";
      return !r.alur || r.alur === "A";
    });
  }, [requests, isAlurB]);

  // 2. Filter kedua: Berdasarkan Peran & Kepemilikan Akun (RBAC)
  const scopedRequests = useMemo(() => {
    // Pengaju A & Pengaju B: Hanya bisa melihat laporannya sendiri
    if (isPemohon) {
      if (!currentUser?.name) return workflowRequests;
      return workflowRequests.filter((r) => r.applicant === currentUser.name);
    }

    // Koordinator Umum (Alur B): Hanya melihat permohonan staf unitnya sendiri
    if (isKoordinator && isAlurB) {
      const coordinatorDept = currentUser?.department || "";
      return workflowRequests.filter((r) => matchesCoordinatorUnit(r, coordinatorDept));
    }

    // Koordinator Lab Kitchen (Alur A): Melihat seluruh Asdos Kitchen (sudah disaring oleh workflowRequests)
    // Keuangan & Super Admin: Melihat seluruh transaksi di alur tersebut
    return workflowRequests;
  }, [workflowRequests, isPemohon, isKoordinator, isAlurB, currentUser]);

  // State Filter Rentang Periode (Tanggal Spesifik / Bulan)
  const [filterValues, setFilterValues] = useState<PeriodFilterValues>({
    mode: "month",
    startDate: "2026-10-16",
    endDate: "2026-11-16",
    startMonth: "1",
    startYear: "2026",
    endMonth: "12",
    endYear: "2026",
  });

  const defaultApplicantLabel = isPemohon
    ? currentUser?.name || "Laporan Saya"
    : isAlurB
      ? isKoordinator
        ? `Semua Staf ${currentUser?.department || "Unit"}`
        : "Semua Staf Unit"
      : "Semua Asdos";

  // State Filter Berdasarkan Nama Asdos / Pemohon
  const [selectedApplicant, setSelectedApplicant] = useState<string>(defaultApplicantLabel);

  useEffect(() => {
    if (isPemohon && currentUser?.name) {
      setSelectedApplicant(currentUser.name);
    } else {
      setSelectedApplicant(defaultApplicantLabel);
    }
  }, [isPemohon, currentUser, defaultApplicantLabel]);

  // State Tampilan Rangkuman Asdos (Tabel / Card Rekapitulasi)
  const [showAsdosSummary, setShowAsdosSummary] = useState<boolean>(true);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);

  // Hitung daftar tahun yang tersedia dari dataset scopedRequests
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add("2026");
    years.add("2025");
    scopedRequests.forEach((r) => {
      const p =
        parseRequestDate(r.date) || parseRequestDate(r.needBy) || parseRequestDate(r.deadline);
      if (p) years.add(String(p.year));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [scopedRequests]);

  // Handler Terapkan & Reset Filter Periode
  const handleApplyFilter = (newFilter: PeriodFilterValues) => {
    setFilterValues(newFilter);
  };

  const handleResetFilter = () => {
    setFilterValues({
      mode: "month",
      startDate: "2026-10-16",
      endDate: "2026-11-16",
      startMonth: "1",
      startYear: "2026",
      endMonth: "12",
      endYear: "2026",
    });
    setSelectedApplicant(defaultApplicantLabel);
  };

  // Filter requests berdasarkan rentang tanggal spesifik (jika mode "date") atau bulan-tahun (jika mode "month")
  const filteredPeriodRequests = useMemo(() => {
    if (filterValues.mode === "date" && filterValues.startDate && filterValues.endDate) {
      const startT = new Date(filterValues.startDate + "T00:00:00").getTime();
      const endT = new Date(filterValues.endDate + "T23:59:59").getTime();
      const minT = Math.min(startT, endT);
      const maxT = Math.max(startT, endT);

      return scopedRequests.filter((r) => {
        const p =
          parseRequestDate(r.date) || parseRequestDate(r.needBy) || parseRequestDate(r.deadline);
        if (!p) return true;
        return p.timestamp >= minT && p.timestamp <= maxT;
      });
    }

    const sMonth = parseInt(filterValues.startMonth, 10);
    const sYear = parseInt(filterValues.startYear, 10);
    const eMonth = parseInt(filterValues.endMonth, 10);
    const eYear = parseInt(filterValues.endYear, 10);

    const minOrder = Math.min(sYear * 12 + sMonth, eYear * 12 + eMonth);
    const maxOrder = Math.max(sYear * 12 + sMonth, eYear * 12 + eMonth);

    return scopedRequests.filter((r) => {
      const p =
        parseRequestDate(r.date) || parseRequestDate(r.needBy) || parseRequestDate(r.deadline);
      if (!p) {
        return true;
      }
      const itemOrder = p.year * 12 + p.month;
      return itemOrder >= minOrder && itemOrder <= maxOrder;
    });
  }, [scopedRequests, filterValues]);

  // Label rentang periode yang sedang aktif
  const periodLabel = useMemo(() => {
    if (filterValues.mode === "date" && filterValues.startDate && filterValues.endDate) {
      const sParts = parseRequestDate(filterValues.startDate);
      const eParts = parseRequestDate(filterValues.endDate);
      const sStr = sParts
        ? `${sParts.day} ${MONTH_NAMES[sParts.month - 1]?.label || ""} ${sParts.year}`
        : filterValues.startDate;
      const eStr = eParts
        ? `${eParts.day} ${MONTH_NAMES[eParts.month - 1]?.label || ""} ${eParts.year}`
        : filterValues.endDate;
      return `${sStr} s/d ${eStr}`;
    }
    const sMonthName =
      MONTH_NAMES.find((m) => m.value === filterValues.startMonth)?.label || "Januari";
    const eMonthName =
      MONTH_NAMES.find((m) => m.value === filterValues.endMonth)?.label || "Desember";
    if (filterValues.startYear === filterValues.endYear && sMonthName === eMonthName) {
      return `${sMonthName} ${filterValues.startYear}`;
    }
    return `${sMonthName} ${filterValues.startYear} - ${eMonthName} ${filterValues.endYear}`;
  }, [filterValues]);

  // Daftar unik nama pemohon dari seluruh dataset yang aktif pada periode terpilih
  const availableApplicants = useMemo(() => {
    const names = new Set<string>();
    filteredPeriodRequests.forEach((r) => {
      if (r.applicant) names.add(r.applicant);
    });
    return Array.from(names).sort();
  }, [filteredPeriodRequests]);

  // Rekapitulasi per nama pemohon untuk periode terpilih
  const asdosSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        applicant: string;
        count: number;
        totalTf: number;
        totalBon: number;
        totalKembalian: number;
        totalKurang: number;
        prodi?: string;
      }
    > = {};

    filteredPeriodRequests.forEach((r) => {
      const name = r.applicant || (isAlurB ? "Staf Unit" : "Asisten Dosen");
      if (!map[name]) {
        map[name] = {
          applicant: name,
          count: 0,
          totalTf: 0,
          totalBon: 0,
          totalKembalian: 0,
          totalKurang: 0,
          prodi: r.unitKerja || r.prodi || r.department,
        };
      }
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        ([
          "SELESAI",
          "DANA_DICAIRKAN",
          "SEDANG_DIBELANJAKAN",
          "BARANG_DITERIMA",
          "LAPORAN_BELANJA_DIAJUKAN",
        ].includes(r.status)
          ? r.price
          : 0);
      map[name].count += 1;
      map[name].totalTf += tf;
      map[name].totalBon += r.actualSpent || 0;
      map[name].totalKembalian += r.refundAmount || 0;
      map[name].totalKurang += r.deficitAmount || 0;
    });

    return Object.values(map).sort((a, b) => b.totalTf - a.totalTf);
  }, [filteredPeriodRequests, isAlurB]);

  // Data transaksi yang ditampilkan (disaring berdasarkan pemohon terpilih jika ada)
  const displayedRequests = useMemo(() => {
    if (
      selectedApplicant === "Semua Asdos" ||
      selectedApplicant === "Semua Staf Unit" ||
      selectedApplicant.startsWith("Semua Staf") ||
      selectedApplicant === defaultApplicantLabel
    ) {
      return filteredPeriodRequests;
    }
    return filteredPeriodRequests.filter((r) => r.applicant === selectedApplicant);
  }, [filteredPeriodRequests, selectedApplicant, defaultApplicantLabel]);

  // Perhitungan KPI Keuangan sesuai data yang sedang aktif
  const totalCair = displayedRequests.reduce(
    (sum, r) => sum + (r.danaDiterima || r.nominalTransfer || 0),
    0,
  );
  const totalBelanja = displayedRequests.reduce((sum, r) => sum + (r.actualSpent || 0), 0);
  const totalKembalian = displayedRequests.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const totalKurang = displayedRequests.reduce((sum, r) => sum + (r.deficitAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        {/* Header & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  isAlurB
                    ? "bg-blue-600/10 text-blue-700 dark:text-blue-300"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {isPemohon
                  ? `Pemohon ${isAlurB ? "Unit" : "Kitchen"}`
                  : isKoordinator
                    ? `Koordinator ${isAlurB ? currentUser?.department || "Unit" : "Lab Kitchen"}`
                    : role === "Keuangan Kitchen" || role === "Keuangan Umum"
                      ? `Keuangan ${isAlurB ? "Umum & ATK" : "Kitchen"}`
                      : role}
              </span>
              <h2 className="text-lg font-black text-foreground">
                {selectedApplicant !== defaultApplicantLabel
                  ? `Laporan Belanja & Kasbon: ${selectedApplicant}`
                  : isPemohon
                    ? isAlurB
                      ? "Laporan Pengadaan Logistik Unit Saya"
                      : "Laporan Belanja & Rekonsiliasi Kasbon Saya"
                    : isKoordinator
                      ? isAlurB
                        ? `Rekap Laporan Logistik: ${currentUser?.department || "Unit Kerja"}`
                        : "Rekap Laporan Belanja & Kasbon Asdos Lab Kitchen"
                      : isAlurB
                        ? "Rekapitulasi Belanja & Logistik 6 Unit Kampus"
                        : "Rekap Laporan Belanja & Rekonsiliasi Kas Asdos"}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdown Nama Pemohon */}
            {!isPemohon && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <User className="size-3.5 text-primary" /> Pemohon:
                </label>
                <div className="relative">
                  <select
                    value={selectedApplicant}
                    onChange={(e) => setSelectedApplicant(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-xs"
                  >
                    <option value={defaultApplicantLabel}>
                      {defaultApplicantLabel} ({availableApplicants.length})
                    </option>
                    {availableApplicants.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Komponen Filter Periode Tanggal / Bulan */}
            <PeriodFilter
              mode={filterValues.mode}
              startDate={filterValues.startDate}
              endDate={filterValues.endDate}
              startMonth={filterValues.startMonth}
              startYear={filterValues.startYear}
              endMonth={filterValues.endMonth}
              endYear={filterValues.endYear}
              availableYears={availableYears}
              onApply={handleApplyFilter}
              onReset={handleResetFilter}
            />
          </div>
        </div>

        {/* Status Filter Label Saat Pemohon Tertentu Dipilih */}
        {!isPemohon && selectedApplicant !== defaultApplicantLabel ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">
                {selectedApplicant.charAt(0)}
              </span>
              <p className="text-foreground">
                Menampilkan laporan belanja &amp; kasbon khusus untuk:{" "}
                <strong className="text-primary font-bold">{selectedApplicant}</strong>{" "}
                <span className="text-muted-foreground">
                  ({displayedRequests.length} Transaksi pada periode {periodLabel})
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedApplicant(defaultApplicantLabel)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Tampilkan Semua Pemohon</span>
              <span>×</span>
            </button>
          </div>
        ) : null}

        {/* KOTAK STATUS REKONSILIASI KAS JIKA PEMOHON TERTENTU DIPILIH */}
        {selectedApplicant !== defaultApplicantLabel && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-indigo-50/50 p-4 dark:border-sky-900/50 dark:from-sky-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 dark:border-sky-900/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-600 text-white font-bold">
                  <Wallet className="size-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-foreground text-sm">
                    Posisi Saldo Kasbon: {selectedApplicant}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Rekonsiliasi dana diterima vs belanja riil nota pada periode {periodLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalKurang > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 px-3 py-1 font-bold text-rose-700 dark:text-rose-300 border border-rose-200 text-xs">
                    <AlertCircle className="size-3.5" /> Asdos Nombok: - {money(totalKurang)}{" "}
                    (Carry-over ke kasbon berikutnya)
                  </span>
                ) : totalKembalian > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs">
                    <CheckCircle2 className="size-3.5" /> Kas di Asdos: + {money(totalKembalian)}{" "}
                    (Sisa Uang Belanja)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 text-xs">
                    <CheckCircle2 className="size-3.5" /> Saldo Klir / Pas (Rp 0)
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/40">
                <span className="text-muted-foreground block text-[10px]">Total Transaksi</span>
                <span className="font-extrabold text-foreground text-sm">
                  {displayedRequests.length} kali belanja
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/40">
                <span className="text-muted-foreground block text-[10px]">
                  Dana Ditransfer (TF)
                </span>
                <span className="font-extrabold text-primary text-sm">{money(totalCair)}</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/40">
                <span className="text-muted-foreground block text-[10px]">Belanja Riil (Bon)</span>
                <span className="font-extrabold text-foreground text-sm">
                  {money(totalBelanja)}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/40">
                <span className="text-muted-foreground block text-[10px]">Selisih Kas Akhir</span>
                <span
                  className={`font-extrabold text-sm ${totalKurang > 0 ? "text-rose-600" : totalKembalian > 0 ? "text-emerald-600" : "text-foreground"}`}
                >
                  {totalKurang > 0
                    ? `- ${money(totalKurang)}`
                    : totalKembalian > 0
                      ? `+ ${money(totalKembalian)}`
                      : "Rp 0 (Pas)"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Metric Cards (Dinamis sesuai Asdos terpilih) */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Dana Ditransfer (TF)"
            value={money(totalCair)}
            icon={Wallet}
            kind="primary"
            className="animate-slide-up-fade stagger-1"
          />
          <MetricCard
            label="Realisasi Belanja (Bon Fisik)"
            value={money(totalBelanja)}
            icon={ShoppingBag}
            kind="info"
            className="animate-slide-up-fade stagger-2"
          />
          <MetricCard
            label="Sisa Uang Belanja (Di Asdos)"
            value={money(totalKembalian)}
            icon={CheckCircle2}
            kind="success"
            className="animate-slide-up-fade stagger-3"
          />
          <MetricCard
            label="Uang Belanja Kurang"
            value={money(totalKurang)}
            icon={Clock3}
            kind={totalKurang > 0 ? "danger" : "success"}
            className="animate-slide-up-fade stagger-4"
          />
        </div>

        {/* ============================================================== */}
        {/* REKAPITULASI DANA & KAS PER NAMA ASDOS (TABEL AGREGASI)        */}
        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* REKAPITULASI DANA & KAS PER NAMA ASDOS (TABEL AGREGASI)        */}
        {/* HANYA DITAMPILKAN JIKA MEMILIH SEMUA PEMOHON                   */}
        {/* ============================================================== */}
        {showAsdosSummary &&
          asdosSummaries.length > 0 &&
          selectedApplicant === defaultApplicantLabel && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Users className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      {isAlurB
                        ? `Rekapitulasi Belanja per Staf (${asdosSummaries.length} Pemohon)`
                        : `Rekapitulasi Kas Belanja per Nama Asdos (${asdosSummaries.length} Asisten Dosen)`}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isAlurB
                        ? "Rincian akumulasi dana disetujui, realisasi nota/kuitansi, sisa dana, dan defisit pengadaan staf unit."
                        : "Rincian akumulasi dana ditransfer, realisasi nota belanja, sisa kembalian, dan kekurangan dana masing-masing Asdos."}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void exportExcel(filteredPeriodRequests, {
                      periodLabel,
                      applicantFilter: defaultApplicantLabel,
                    })
                  }
                  className="h-8 gap-1.5 text-xs font-bold cursor-pointer"
                  title={
                    isAlurB
                      ? "Unduh Rekap Lengkap Staf ke Excel"
                      : "Unduh Rekap Lengkap Semua Asdos ke Excel"
                  }
                >
                  <Download className="size-3.5 text-emerald-600" />{" "}
                  {isAlurB ? "Unduh Rekap per Staf (Excel)" : "Unduh Rekap per Asdos (Excel)"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-3.5 py-2.5">No</th>
                      <th className="px-3.5 py-2.5">
                        {isAlurB ? "Nama Staf Pemohon (Unit)" : "Nama Asisten Dosen (Pemohon)"}
                      </th>
                      <th className="px-3.5 py-2.5 text-center">Total Pengadaan</th>
                      <th className="px-3.5 py-2.5 text-right">
                        {isAlurB ? "Dana Disetujui (TF)" : "Dana Ditransfer (TF)"}
                      </th>
                      <th className="px-3.5 py-2.5 text-right">
                        {isAlurB ? "Realisasi (Nota)" : "Realisasi (Bon)"}
                      </th>
                      <th className="px-3.5 py-2.5 text-right">
                        {isAlurB ? "Sisa Dana Belanja" : "Sisa Kembalian (Di Asdos)"}
                      </th>
                      <th className="px-3.5 py-2.5 text-right">Uang Belanja Kurang</th>
                      <th className="px-3.5 py-2.5 text-center">Status Kas Saldo</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {asdosSummaries.map((asdos, idx) => {
                      const isRowSelected = selectedApplicant === asdos.applicant;
                      return (
                        <tr
                          key={asdos.applicant}
                          className={`transition-colors hover:bg-background/80 ${
                            isRowSelected ? "bg-primary/5 font-semibold" : ""
                          }`}
                        >
                          <td className="px-3.5 py-3 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-[#0f172a] font-bold text-[11px]">
                                {asdos.applicant.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs">
                                  {asdos.applicant}
                                </p>
                                <span className="text-[10px] text-muted-foreground">
                                  {asdos.prodi ||
                                    (isAlurB
                                      ? "Unit Kerja Kampus"
                                      : "Program Studi Kuliner & Perhotelan")}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-foreground border border-border">
                              {asdos.count} {isAlurB ? "PO" : "PR"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            {renderCurrencyCell(asdos.totalTf)}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            {renderCurrencyCell(asdos.totalBon)}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            {asdos.totalKembalian > 0 ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs tabular-nums">
                                + {money(asdos.totalKembalian)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            {asdos.totalKurang > 0 ? (
                              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs tabular-nums">
                                - {money(asdos.totalKurang)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {asdos.totalKurang > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                <AlertCircle className="size-2.5" /> Carry-over
                              </span>
                            ) : asdos.totalKembalian > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="size-2.5" />{" "}
                                {isAlurB ? "Sisa Kas Unit" : "Saldo di Asdos"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                Pas / Klir
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <Button
                              variant={isRowSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setSelectedApplicant(
                                  isRowSelected ? defaultApplicantLabel : asdos.applicant,
                                )
                              }
                              className="h-7 px-2 text-[11px] font-bold cursor-pointer"
                            >
                              {isRowSelected ? "Lihat Semua" : "Filter Transaksi"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* ============================================================== */}
        {/* TABEL RINCIAN TRANSAKSI BELANJA (DETAIL PER NOTA / BON)        */}
        {/* ============================================================== */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div>
              <h3 className="text-sm font-black text-foreground">
                {selectedApplicant !== defaultApplicantLabel
                  ? `Daftar Transaksi Belanja: ${selectedApplicant} (${displayedRequests.length} Transaksi)`
                  : `Rincian Seluruh Transaksi Belanja (${displayedRequests.length} Transaksi)`}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Daftar lengkap permohonan, bahan yang dipesan, nominal uang belanja riil, dan nota
                bukti fisik.
              </p>
            </div>
            {selectedApplicant !== defaultApplicantLabel && (
              <span className="text-xs text-muted-foreground bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">
                Pemohon: {selectedApplicant}
              </span>
            )}
          </div>

          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-y border-border">
              <tr>
                <th className="px-3.5 py-3">Tanggal</th>
                <th className="px-3.5 py-3">
                  {isAlurB ? "Kode PO & Kebutuhan" : "Kode PR & Menu"}
                </th>
                {selectedApplicant === defaultApplicantLabel && (
                  <th className="px-3.5 py-3">
                    {isAlurB ? "Nama Staf Pemohon" : "Nama Asdos (Pemohon)"}
                  </th>
                )}
                <th className="px-3.5 py-3">Rincian Bahan yang Dipesan</th>
                <th className="px-3.5 py-3 text-right">
                  {isAlurB ? "Dana Disetujui (TF)" : "Dana Ditransfer (TF)"}
                </th>
                <th className="px-3.5 py-3 text-right">
                  {isAlurB ? "Realisasi (Nota)" : "Realisasi (Bon)"}
                </th>
                <th className="px-3.5 py-3 text-right">
                  {isAlurB ? "Sisa Dana Belanja" : "Sisa Kembalian (Di Asdos)"}
                </th>
                <th className="px-3.5 py-3 text-right">Uang Belanja Kurang</th>
                <th className="px-3.5 py-3 text-center">Aksi & Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedApplicant === defaultApplicantLabel ? 9 : 8}
                    className="px-4 py-12 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground mb-3">
                        <Calendar className="size-6" />
                      </div>
                      <p className="font-bold text-sm text-foreground">Tidak Ada Transaksi</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tidak ditemukan catatan belanja {isAlurB ? "logistik " : "bahan "} untuk
                        rentang <span className="font-semibold text-foreground">{periodLabel}</span>
                        {selectedApplicant !== defaultApplicantLabel
                          ? ` dari ${selectedApplicant}`
                          : ""}
                        .
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilter}
                        className="mt-3.5 h-8 text-xs font-bold cursor-pointer"
                      >
                        Reset Filter
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRequests.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="animate-row-enter transition-colors hover:bg-surface/60"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    {/* Tanggal Belanja */}
                    <td className="px-3.5 py-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {r.date || r.needBy || "-"}
                    </td>

                    {/* Kode PR & Menu */}
                    <td className="px-3.5 py-3">
                      <span className="font-mono font-extrabold text-primary text-xs">{r.id}</span>
                      <p className="font-bold text-foreground mt-0.5">{r.menu || r.item}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {isAlurB
                          ? `${formatUnitLabel(r.unitKerja || r.department) || "Unit Kerja"}`
                          : `${r.course || "Praktikum"} · Smt ${r.semester || 1}`}
                      </span>
                    </td>

                    {/* Nama Asdos (Pemohon) - hanya tampil jika mode Semua Pemohon */}
                    {selectedApplicant === defaultApplicantLabel && (
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#0f172a] font-bold text-[10px] border border-border">
                            {(r.applicant || "A").charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs">
                              {r.applicant || (isAlurB ? "Staf Unit" : "Asdos")}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {r.prodi || r.department || "Universitas"}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Rincian Bahan yang Dipesan */}
                    <td className="px-3.5 py-3 max-w-xs">
                      {r.details && r.details.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {r.details.slice(0, 3).map((d) => (
                              <span
                                key={d.id}
                                className="inline-flex items-center rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground border border-border"
                              >
                                {d.name} ({d.qty} {d.unit}
                                {d.price ? ` @ ${money(d.price)}` : ""})
                              </span>
                            ))}
                          </div>
                          {r.details.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium block">
                              +{r.details.length - 3} bahan lainnya (total {r.details.length} item)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          {r.menu || r.item || "Bahan praktikum"}
                        </span>
                      )}
                    </td>

                    {/* Nominal TF (Cair) */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      {r.danaDiterima || r.nominalTransfer ? (
                        renderCurrencyCell(r.danaDiterima || r.nominalTransfer || 0)
                      ) : (
                        <span className="text-muted-foreground italic font-normal text-[11px]">
                          Belum Cair
                        </span>
                      )}
                    </td>

                    {/* Realisasi (Bon) */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      {r.actualSpent ? (
                        renderCurrencyCell(r.actualSpent)
                      ) : (
                        <span className="text-muted-foreground italic font-normal text-[11px]">
                          -
                        </span>
                      )}
                    </td>

                    {/* Sisa Kembalian (Di Asdos) */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      {r.refundAmount && r.refundAmount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            + {money(r.refundAmount)}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                            Setor: {r.refundDate || r.date}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">-</span>
                      )}
                    </td>

                    {/* Kekurangan Belanja */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      {r.deficitAmount && r.deficitAmount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            - {money(r.deficitAmount)}
                            <span className="text-[9px] font-medium text-rose-600 block ml-1">
                              (
                              {r.penyelesaian &&
                              r.penyelesaian.some(
                                (p) => p.jenis === "carry_over" && p.kasbon_tujuan_id,
                              )
                                ? "Tercatat"
                                : "Pending"}
                              )
                            </span>
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                            Carry-over berikutnya
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedId(r.id)}
                          className="h-7 px-2.5 text-xs font-bold cursor-pointer hover:bg-primary/5 hover:border-primary/50"
                        >
                          <Eye className="size-3.5 mr-1 text-primary" /> Detail
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportSingleExcel(r)}
                          className="h-7 px-2 text-xs text-foreground font-bold hover:bg-slate-100 cursor-pointer"
                          title="Unduh Excel Laporan PR &amp; Bon"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {isBkkPrintable(r.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportBkkPdf(r)}
                            className="h-7 px-2 text-xs text-rose-700 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Unduh Bukti Kas Keluar (BKK) PDF"
                          >
                            <FileText className="size-3.5 text-rose-600" />
                          </Button>
                        )}
                        {exportSinglePdf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportSinglePdf(r)}
                            className="h-7 px-2 text-xs text-[#0f172a] font-bold hover:bg-slate-100 cursor-pointer"
                            title="Unduh PDF Formulir PR"
                          >
                            <FileText className="size-3.5" />
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
            Menampilkan data belanja {isAlurB ? "logistik & ATK: " : "bahan: "}
            <span className="font-bold text-foreground">{periodLabel}</span>
            {selectedApplicant !== defaultApplicantLabel ? (
              <>
                {" "}
                · {isAlurB ? "Staf" : "Asdos"}:{" "}
                <span className="font-bold text-primary">{selectedApplicant}</span>
              </>
            ) : null}{" "}
            <span className="text-muted-foreground">
              ({displayedRequests.length} transaksi ditemukan)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                try {
                  setIsDownloadingExcel(true);
                  await exportExcel(displayedRequests, {
                    periodLabel,
                    applicantFilter: selectedApplicant,
                  });
                } catch (e) {
                  console.error("Gagal mengunduh Excel:", e);
                } finally {
                  setIsDownloadingExcel(false);
                }
              }}
              variant="outline"
              disabled={isDownloadingExcel}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer"
            >
              {isDownloadingExcel ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Mengunduh Excel...
                </>
              ) : (
                <>
                  <Download className="size-3.5" /> Unduh Rekap Excel
                </>
              )}
            </Button>
            <Button
              onClick={() =>
                exportBatchBkkPdf(displayedRequests, periodLabel, undefined, selectedApplicant)
              }
              variant="outline"
              className="h-9 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer"
              title="Unduh berkas PDF gabungan Bukti Kas Keluar (BKK) untuk pengajuan yang dicairkan/selesai"
            >
              <FileText className="size-3.5 text-rose-600" /> Unduh Rekap BKK (PDF)
            </Button>
            <Button
              onClick={() =>
                exportPdf(displayedRequests, {
                  periodLabel,
                  applicantFilter: selectedApplicant,
                })
              }
              className="h-9 gap-1.5 bg-primary hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <FileText className="size-3.5" /> Unduh Laporan PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
