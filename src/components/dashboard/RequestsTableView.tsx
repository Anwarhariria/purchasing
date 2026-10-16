import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ArrowRight,
  Box,
  Calendar,
  ClipboardCheck,
  Award,
  Wallet,
  FileText,
  ShoppingBag,
  Receipt,
  Send,
  Eye,
  ClipboardList,
  User,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DeadlineTag } from "@/components/common/DeadlineTag";
import {
  SIKLUS_TAHAPAN,
  SIKLUS_DETAILS,
  isPemohon,
  isKoordinator,
  isKeuangan,
} from "@/types/procurement";
import { money, formatUnitLabel } from "@/lib/utils";
import { exportBkkPdf, isBkkPrintable } from "@/lib/export/bkk-pdf-export";
import type { Role, Status, RequestItem, UserAccount } from "@/types/procurement";

interface RequestsTableViewProps {
  role: Role;
  section: string;
  visibleRequests: RequestItem[];
  requests: RequestItem[];
  query: string;
  setQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  currentUser: UserAccount | null;
  setSelectedId: (id: string | null) => void;
  setQuickReviewId: (id: string | null) => void;
  setReportingRequestId: (id: string | null) => void;
  setReportSpentAmount: (amt: number) => void;
  updateStatus: (id: string, newStatus: Status, note: string) => void;
  workflow?: "A" | "B";
}

export const RequestsTableView: React.FC<RequestsTableViewProps> = ({
  role,
  section,
  visibleRequests,
  requests,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  currentUser,
  setSelectedId,
  setQuickReviewId,
  setReportingRequestId,
  setReportSpentAmount,
  updateStatus,
  workflow = "A",
}) => {
  const [applicantFilter, setApplicantFilter] = useState<string>("Semua");

  const workflowScopedRequests = useMemo(() => {
    return visibleRequests.filter((r) => {
      if (workflow === "B") return r.alur === "B";
      return !r.alur || r.alur === "A";
    });
  }, [visibleRequests, workflow]);

  const availableApplicants = useMemo(() => {
    const setNames = new Set<string>();
    workflowScopedRequests.forEach((r) => {
      if (r.applicant) setNames.add(r.applicant);
    });
    return Array.from(setNames).sort();
  }, [workflowScopedRequests]);

  const displayedRequests = useMemo(() => {
    if (applicantFilter === "Semua") return workflowScopedRequests;
    return workflowScopedRequests.filter((r) => r.applicant === applicantFilter);
  }, [workflowScopedRequests, applicantFilter]);

  return (
    <section className="animate-slide-up-fade stagger-2 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {/* Table Header Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-foreground">
            {isPemohon(role) &&
              (section === "Permohonan"
                ? "Daftar Pengajuan Bahan Praktik Masak"
                : "Riwayat Pengajuan Bahan")}
            {isKoordinator(role) &&
              (section === "Verifikasi Standar Bahan" ||
              section === "Antrean Verifikasi" ||
              section === "Verifikasi Pengajuan Unit"
                ? workflow === "B"
                  ? "Antrean Verifikasi Pengajuan Unit"
                  : "Antrean Verifikasi Standar Porsi Bahan"
                : "Daftar Pengajuan Bahan Praktik")}
            {role === "Kaprodi" &&
              (section === "Persetujuan Kurikulum" || section === "Antrean Validasi"
                ? "Antrean Validasi Kurikulum Praktik"
                : "Pengajuan Bahan Praktik Mahasiswa")}
            {isKeuangan(role) &&
              (section === "Pencairan Dana"
                ? "Antrean Pencairan / Transfer Dana ke Asdos"
                : section === "Verifikasi Laporan Belanja"
                  ? "Verifikasi Laporan Belanja & Bon Asdos"
                  : "Daftar Pengadaan Bahan Lab")}
            {role === "Super Admin" && "Master Permohonan Pengadaan Terpadu"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Menampilkan {displayedRequests.length} dari {requests.length} pengajuan terdaftar
            {applicantFilter !== "Semua Asdos" ? ` · Pemohon: ${applicantFilter}` : ""}
          </p>
        </div>

        <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari PR, menu, resep..."
              aria-label="Cari pengajuan"
              className="h-9 pl-9 text-xs w-full"
            />
          </div>

          {/* Filter Nama Asdos / Pemohon */}
          <div className="relative w-full sm:w-auto">
            <select
              aria-label="Filter asisten dosen pemohon"
              value={applicantFilter}
              onChange={(e) => setApplicantFilter(e.target.value)}
              className="h-9 w-full sm:w-auto appearance-none rounded-md border border-input bg-card pl-3 pr-7 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-xs"
            >
              <option value="Semua">
                {workflow === "B" ? "Semua Pemohon Unit" : "Semua Asdos"} (
                {availableApplicants.length})
              </option>
              {availableApplicants.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-3 text-muted-foreground" />
          </div>

          {/* Filter Status */}
          <div className="relative w-full sm:w-auto">
            <select
              aria-label="Filter status pengajuan"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full sm:w-auto appearance-none rounded-md border border-input bg-card pl-3 pr-7 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-xs"
            >
              <option value="Semua Status">Semua Status</option>
              {Object.entries(SIKLUS_DETAILS).map(([statusKey, detail]) => (
                <option key={statusKey} value={statusKey}>
                  {detail.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <div className="sm:hidden px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] text-muted-foreground flex items-center justify-between">
          <span>
            Tabel Pengadaan {workflow === "B" ? "Logistik Unit Kerja" : "Praktikum Kitchen"}
          </span>
          <span className="font-semibold flex items-center gap-1 text-foreground">
            Geser ke samping <ArrowRight className="size-3" />
          </span>
        </div>
        <table className="w-full min-w-[780px] text-left">
          <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">Kode Pengajuan</th>
              <th className="px-5 py-3.5">
                {workflow === "B" ? "Kebutuhan Barang & Unit Kerja" : "Menu Praktik & Matakuliah"}
              </th>
              <th className="px-5 py-3.5">Tenggat Waktu</th>
              <th className="px-5 py-3.5">Estimasi Biaya</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedRequests.map((r, idx) => (
              <tr
                key={r.id}
                className="animate-row-enter transition-colors hover:bg-surface/70"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                {/* Kode PR */}
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-foreground font-mono">{r.id}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{r.date}</p>
                </td>

                {/* Nama Permohonan & Unit */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0f172a] border border-slate-200">
                      <Box className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {r.menu || r.item}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>
                          {r.alur === "B"
                            ? formatUnitLabel(r.unitKerja || r.department)
                            : r.course
                              ? `${r.course} · Smt ${r.semester}`
                              : r.department}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] border border-primary/20">
                          <User className="size-3" />
                          {r.applicant}
                        </span>
                        {r.petugasPembelanja && (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] border border-blue-200 dark:border-blue-800">
                            Pembelanja: {r.petugasPembelanja}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Tenggat Waktu */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {r.deadline || r.needBy}
                  </div>
                  <div className="mt-1">
                    <DeadlineTag r={r} />
                  </div>
                </td>

                {/* Estimasi Biaya & Rincian Keuangan */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="text-xs font-black text-foreground">{money(r.price)}</div>
                  {/* Rincian Finansial Asdos jika sudah dicairkan atau memiliki data belanja */}
                  {(r.status === "DANA_DICAIRKAN" ||
                    r.status === "SEDANG_DIBELANJAKAN" ||
                    r.status === "BARANG_DITERIMA" ||
                    r.status === "LAPORAN_BELANJA_DIAJUKAN" ||
                    r.status === "SELESAI" ||
                    (r.actualSpent !== undefined && r.actualSpent > 0)) && (
                    <div className="mt-1 space-y-0.5 text-[10px]">
                      <div className="text-blue-600 dark:text-blue-400 font-semibold">
                        TF: {money(r.danaDiterima || r.nominalTransfer || r.price)}
                      </div>
                      {r.actualSpent !== undefined && r.actualSpent > 0 && (
                        <>
                          <div className="text-slate-600 dark:text-slate-400 font-medium">
                            Bon: {money(r.actualSpent)}
                          </div>
                          {(r.danaDiterima || r.nominalTransfer || r.price) - r.actualSpent > 0 && (
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                              + Sisa:{" "}
                              {money(
                                (r.danaDiterima || r.nominalTransfer || r.price) - r.actualSpent,
                              )}
                            </div>
                          )}
                          {(r.danaDiterima || r.nominalTransfer || r.price) - r.actualSpent < 0 && (
                            <div className="text-rose-600 dark:text-rose-400 font-bold">
                              - Kurang:{" "}
                              {money(
                                r.actualSpent - (r.danaDiterima || r.nominalTransfer || r.price),
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-5 py-4 whitespace-nowrap text-center align-middle">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <StatusBadge status={r.status} />
                    {r.status.startsWith("DITOLAK_") &&
                      (r.rejectionReason || r.rejection_reason || r.note) && (
                        <span
                          className="max-w-36 truncate text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50"
                          title={r.rejectionReason || r.rejection_reason || r.note}
                        >
                          Alasan: {r.rejectionReason || r.rejection_reason || r.note}
                        </span>
                      )}
                  </div>
                </td>

                {/* Aksi Berdasarkan Peran */}
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Aksi Koordinator: Cek Bahan & Edit Qty (Alur A & B) */}
                    {isKoordinator(role) && r.status === "DIAJUKAN" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <ClipboardCheck className="size-3" /> Cek & Edit Qty
                      </Button>
                    )}

                    {/* Aksi Kaprodi: Review Standar & ACC ke Keuangan (Alur A) */}
                    {role === "Kaprodi" &&
                      r.status === "DIVERIFIKASI_KOORD" &&
                      (!r.alur || r.alur === "A") && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedId(r.id)}
                          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          <Award className="size-3" /> Review & ACC
                        </Button>
                      )}

                    {/* Aksi Keuangan Kitchen: Transfer Dana (Alur A) */}
                    {isKeuangan(role) &&
                      r.status === "DISETUJUI_KAPRODI" &&
                      (!r.alur || r.alur === "A") && (
                        <Button
                          size="sm"
                          onClick={() => setQuickReviewId(r.id)}
                          className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          <Wallet className="size-3" /> Transfer Dana
                        </Button>
                      )}

                    {/* Aksi Keuangan Umum: Alokasi Belanja (Alur B) */}
                    {isKeuangan(role) && r.status === "DIVERIFIKASI_KOORD" && r.alur === "B" && (
                      <Button
                        size="sm"
                        onClick={() => setQuickReviewId(r.id)}
                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <Wallet className="size-3" /> Alokasi Belanja
                      </Button>
                    )}

                    {/* Aksi Keuangan Kitchen: Verifikasi Laporan Belanja (Alur A) */}
                    {isKeuangan(role) && r.status === "LAPORAN_BELANJA_DIAJUKAN" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <FileText className="size-3" /> Verifikasi Laporan Belanja
                      </Button>
                    )}

                    {/* Aksi Keuangan Umum: Tutup / Selesaikan Pengadaan Alur B (bila bon sudah diinput) */}
                    {isKeuangan(role) && r.status === "BARANG_DITERIMA" && r.alur === "B" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <Check className="size-3" /> Selesaikan Pengadaan
                      </Button>
                    )}

                    {/* Aksi Keuangan: Cetak Bukti Kas Keluar (BKK) */}
                    {isKeuangan(role) && isBkkPrintable(r.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportBkkPdf(r)}
                        className="h-8 gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-[11px] font-bold shadow-xs cursor-pointer"
                        title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
                      >
                        <Receipt className="size-3" /> Cetak BKK
                      </Button>
                    )}

                    {/* Aksi Staf / Asdos: Konfirmasi Barang Diterima (Alur A: DANA_DICAIRKAN -> BARANG_DITERIMA) */}
                    {isPemohon(role) &&
                      r.status === "DANA_DICAIRKAN" &&
                      (!r.alur || r.alur === "A") && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(
                              r.id,
                              "BARANG_DITERIMA",
                              "Barang belanjaan telah sampai dan dikonfirmasi diterima oleh Asdos.",
                            )
                          }
                          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                          title="Konfirmasi bahwa barang belanjaan telah sampai/diterima"
                        >
                          <ShoppingBag className="size-3" /> Konfirmasi Terima Barang
                        </Button>
                      )}

                    {/* Aksi Staf: Konfirmasi Barang Diterima (Alur B: SEDANG_DIBELANJAKAN -> BARANG_DITERIMA) */}
                    {isPemohon(role) && r.status === "SEDANG_DIBELANJAKAN" && r.alur === "B" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus(
                            r.id,
                            "BARANG_DITERIMA",
                            "Barang logistik/ATK telah sampai dan dikonfirmasi diterima oleh Staf Unit.",
                          )
                        }
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        title="Konfirmasi bahwa barang belanjaan telah sampai/diterima"
                      >
                        <ShoppingBag className="size-3" /> Konfirmasi Terima Barang
                      </Button>
                    )}

                    {/* Aksi Staf / Asdos: Input Laporan Bon & Selisih (Alur A: BARANG_DITERIMA -> LAPORAN_BELANJA_DIAJUKAN) */}
                    {isPemohon(role) &&
                      r.status === "BARANG_DITERIMA" &&
                      (!r.alur || r.alur === "A") &&
                      (!currentUser || r.applicant === currentUser.name) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReportingRequestId(r.id);
                            setReportSpentAmount(r.danaDiterima || r.nominalTransfer || r.price);
                          }}
                          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                          title="Barang sudah sampai / belanja selesai: wajib unggah foto bon belanja"
                        >
                          <Receipt className="size-3" /> Unggah Bon (Laporan Belanja)
                        </Button>
                      )}

                    {/* Ajukan Ulang untuk Staf/Asdos pada item Ditolak (DITOLAK_KOORD) */}
                    {isPemohon(role) &&
                      (r.status === "DITOLAK_KOORD" || r.status === "DITOLAK_KAPRODI") &&
                      (!currentUser || r.applicant === currentUser.name) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(
                              r.id,
                              "DIAJUKAN",
                              "Pengajuan diajukan ulang oleh pemohon setelah revisi.",
                            )
                          }
                          className="h-8 gap-1 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                          title="Ajukan ulang pengajuan yang ditolak setelah melakukan revisi"
                        >
                          <Send className="size-3" /> Ajukan Ulang
                        </Button>
                      )}

                    {/* Tombol Detail Modal */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(r.id)}
                      className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50"
                    >
                      <Eye className="size-3.5 mr-1" /> Detail
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedRequests.length === 0 && (
          <div className="py-14 text-center">
            <ClipboardList className="mx-auto size-9 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">
              Tidak ada permohonan yang sesuai kriteria.
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatusFilter("Semua Status");
                setApplicantFilter("Semua Asdos");
              }}
              className="mt-1 text-xs text-primary"
            >
              Reset Filter
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
