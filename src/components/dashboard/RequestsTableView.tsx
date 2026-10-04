import React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityTag } from "@/components/common/PriorityTag";
import { SIKLUS_TAHAPAN } from "@/types/procurement";
import { money } from "@/lib/algorithms/saw";
import type { Role, Status, RequestItem, User } from "@/types/procurement";

interface RequestsTableViewProps {
  role: Role;
  section: string;
  visibleRequests: RequestItem[];
  requests: RequestItem[];
  query: string;
  setQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  currentUser: User | null;
  setSelectedId: (id: string | null) => void;
  setQuickReviewId: (id: string | null) => void;
  setReportingRequestId: (id: string | null) => void;
  setReportSpentAmount: (amt: number) => void;
  updateStatus: (id: string, newStatus: Status, note: string) => void;
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
}) => {
  return (
    <section className="animate-slide-up-fade stagger-2 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {/* Table Header Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-foreground">
            {role === "Staf / Asdos" &&
              (section === "Permohonan"
                ? "Daftar Pengajuan Bahan Praktik Masak"
                : "Riwayat Pengajuan Bahan")}
            {role === "Koordinator" &&
              (section === "Verifikasi Standar Bahan"
                ? "Antrean Verifikasi Standar Porsi Bahan"
                : "Daftar Pengajuan Bahan Praktik")}
            {role === "Kaprodi" &&
              (section === "Persetujuan Kurikulum"
                ? "Antrean Persetujuan Kurikulum Praktik"
                : "Pengajuan Bahan Praktik Mahasiswa")}
            {role === "Bagian Keuangan" &&
              (section === "Pencairan Dana"
                ? "Antrean Pencairan / Transfer Dana ke Asdos"
                : section === "Verifikasi LPJ Belanja"
                ? "Verifikasi LPJ Belanja & Bon Asdos"
                : "Daftar Pengadaan Bahan Lab")}
            {role === "Super Admin" && "Master Permohonan Pengadaan Terpadu"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Menampilkan {visibleRequests.length} dari {requests.length} pengajuan terdaftar
          </p>
        </div>

        <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari PR, menu, resep..."
              aria-label="Cari pengajuan"
              className="h-9 pl-9 text-xs w-full"
            />
          </div>

          {/* Filter Status */}
          <div className="relative w-full sm:w-auto">
            <select
              aria-label="Filter status pengajuan"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full sm:w-auto appearance-none rounded-md border border-input bg-card pl-3 pr-7 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option>Semua Status</option>
              {SIKLUS_TAHAPAN.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Ditolak">Ditolak</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <div className="sm:hidden px-4 py-1.5 bg-muted/40 border-b border-border text-[10px] text-muted-foreground flex items-center justify-between">
          <span>Tabel Pengadaan</span>
          <span className="font-semibold flex items-center gap-1 text-foreground">
            Geser ke samping <ArrowRight className="size-3" />
          </span>
        </div>
        <table className="w-full min-w-[780px] text-left">
          <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">Kode PR</th>
              <th className="px-5 py-3.5">Menu Praktik & Matakuliah</th>
              <th className="px-5 py-3.5">Tenggat Waktu</th>
              <th className="px-5 py-3.5">Estimasi Biaya</th>
              <th className="px-5 py-3.5 text-center">Status Alur</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleRequests.map((r, idx) => (
              <tr
                key={r.id}
                className="animate-row-enter transition-colors hover:bg-surface/70"
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                {/* Kode PR */}
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="text-xs font-extrabold text-foreground font-mono">{r.id}</span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{r.date}</p>
                </td>

                {/* Nama Permohonan & Unit */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0f172a] border border-slate-200">
                      <Box className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-snug">{r.menu || r.item}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.course ? `${r.course} · Smt ${r.semester}` : r.department} ·{" "}
                        <span className="font-semibold text-foreground/80">{r.applicant}</span>
                      </p>
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
                    <PriorityTag r={r} />
                  </div>
                </td>

                {/* Estimasi Biaya */}
                <td className="px-5 py-4 whitespace-nowrap text-xs font-black text-foreground">
                  {money(r.price)}
                </td>

                {/* Status Badge */}
                <td className="px-5 py-4 whitespace-nowrap text-center align-middle">
                  <div className="flex items-center justify-center">
                    <StatusBadge status={r.status} />
                  </div>
                </td>

                {/* Aksi Berdasarkan Peran */}
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Aksi Koordinator: Cek Bahan & Edit Qty */}
                    {role === "Koordinator" && r.status === "Diajukan" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs"
                      >
                        <ClipboardCheck className="size-3" /> Cek & Edit Qty
                      </Button>
                    )}

                    {/* Aksi Kaprodi: Review Standar & ACC ke Keuangan */}
                    {role === "Kaprodi" && r.status === "Diverifikasi Koordinator" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <Award className="size-3" /> Review & ACC
                      </Button>
                    )}

                    {/* Aksi Bagian Keuangan: Transfer Dana */}
                    {role === "Bagian Keuangan" && r.status === "Disetujui Kaprodi" && (
                      <Button
                        size="sm"
                        onClick={() => setQuickReviewId(r.id)}
                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs"
                      >
                        <Wallet className="size-3" /> Transfer Dana
                      </Button>
                    )}

                    {/* Aksi Bagian Keuangan: Verifikasi LPJ Belanja */}
                    {role === "Bagian Keuangan" && r.status === "Laporan Belanja Diajukan" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedId(r.id)}
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs"
                      >
                        <FileText className="size-3" /> Verifikasi LPJ
                      </Button>
                    )}

                    {/* Aksi Staf / Asdos: Mulai Belanja */}
                    {role === "Staf / Asdos" && r.status === "Dana Dicairkan" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus(
                            r.id,
                            "Proses Pembelian",
                            "Asdos mulai membelanjakan bahan masakan."
                          )
                        }
                        className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs"
                        title="Mulai proses pembelanjaan bahan masakan"
                      >
                        <ShoppingBag className="size-3" /> Mulai Belanja
                      </Button>
                    )}

                    {/* Aksi Staf / Asdos: Input Laporan Bon & Selisih */}
                    {role === "Staf / Asdos" &&
                      r.status === "Proses Pembelian" &&
                      (!currentUser || r.applicant === currentUser.name) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReportingRequestId(r.id);
                            setReportSpentAmount(r.disbursedAmount || r.price);
                          }}
                          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                          title="Input total belanja sesuai nota dan laporkan selisih dana"
                        >
                          <Receipt className="size-3" /> Lapor Bon & Selisih
                        </Button>
                      )}

                    {/* Fix #4: Ajukan Ulang untuk Staf/Asdos pada item Ditolak */}
                    {role === "Staf / Asdos" &&
                      r.status === "Ditolak" &&
                      (!currentUser || r.applicant === currentUser.name) && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(
                              r.id,
                              "Diajukan",
                              "Pengajuan diajukan ulang oleh Asdos setelah revisi."
                            )
                          }
                          className="h-8 gap-1 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-xs"
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

        {visibleRequests.length === 0 && (
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
