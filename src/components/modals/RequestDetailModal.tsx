import React from "react";
import {
  Check,
  X,
  Wallet,
  CheckCircle2,
  ShoppingBag,
  Receipt,
  Info,
  Send,
  Download,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PriorityTag } from "@/components/common/PriorityTag";
import { SIKLUS_TAHAPAN } from "@/types/procurement";
import { money } from "@/lib/algorithms/saw";
import type { Role, Status, RequestItem, RequestDetail, User } from "@/types/procurement";

interface RequestDetailModalProps {
  activeRequest: RequestItem | null;
  role: Role;
  currentUser: User | null;
  onClose: () => void;
  editableDetails: RequestDetail[];
  setEditableDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
  handleSaveQtyChanges: (id: string, details: RequestDetail[]) => void;
  updateStatus: (
    id: string,
    newStatus: Status,
    note?: string,
    extraFields?: Partial<RequestItem>
  ) => void;
  decisionNote: string;
  setDecisionNote: (val: string) => void;
  setReportingRequestId: (id: string | null) => void;
  setReportSpentAmount: (amt: number) => void;
  exportSingleExcel: (r: RequestItem) => void;
  exportSinglePdf?: (r: RequestItem) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  activeRequest,
  role,
  currentUser,
  onClose,
  editableDetails,
  setEditableDetails,
  handleSaveQtyChanges,
  updateStatus,
  decisionNote,
  setDecisionNote,
  setReportingRequestId,
  setReportSpentAmount,
  exportSingleExcel,
  exportSinglePdf,
}) => {
  if (!activeRequest) return null;

  const isKoorEditing = role === "Koordinator" && activeRequest.status === "Diajukan";
  const isKaprodiEditing = role === "Kaprodi" && activeRequest.status === "Diverifikasi Koordinator";
  const canEditQtyOnly = isKoorEditing || isKaprodiEditing;

  return (
    <Dialog open={Boolean(activeRequest)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-2xl overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-extrabold text-primary">
                {activeRequest.id}
              </span>
              <StatusBadge status={activeRequest.status} />
              <PriorityTag r={activeRequest} />
            </div>
            <span className="text-[11px] text-muted-foreground">{activeRequest.date}</span>
          </div>
          <DialogTitle className="mt-2 text-lg sm:text-xl font-black text-foreground">
            {activeRequest.menu || activeRequest.item}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {activeRequest.course
              ? `${activeRequest.course} · Semester ${activeRequest.semester} (${activeRequest.prodi})`
              : `Diajukan oleh ${activeRequest.applicant}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-4 sm:px-6 py-4 sm:py-5">
          {/* Meta properties */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-surface p-4 text-xs">
            <div>
              <span className="text-muted-foreground">Total Estimasi</span>
              <p className="mt-0.5 font-extrabold text-foreground">{money(activeRequest.price)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dana Dicairkan</span>
              <p className="mt-0.5 font-bold text-foreground">
                {activeRequest.disbursedAmount ? money(activeRequest.disbursedAmount) : "-"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tenggat Waktu</span>
              <p className="mt-0.5 font-bold text-foreground">
                {activeRequest.deadline || activeRequest.needBy}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Pemohon</span>
              <p className="mt-0.5 font-bold text-foreground">{activeRequest.applicant}</p>
            </div>
          </div>

          {/* Details Table - EDIT QTY ONLY FOR KOORDINATOR / KAPRODI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Rincian Bahan Masakan
                </h4>
                {canEditQtyOnly && (
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                    Anda dapat mengedit kuantitas (Qty) saja sesuai standar porsi. Jenis barang tidak dapat ditambah/dikurang.
                  </p>
                )}
              </div>
              {canEditQtyOnly && (
                <Button
                  size="sm"
                  onClick={() => handleSaveQtyChanges(activeRequest.id, editableDetails)}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <Check className="size-3 mr-1" /> Simpan Perubahan Qty
                </Button>
              )}
            </div>

            {/* Mobile Cards View (<sm) */}
            <div className="space-y-2 sm:hidden">
              {(canEditQtyOnly ? editableDetails : activeRequest.details || []).map((d, i) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-border bg-surface p-3 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground mr-1">
                        #{i + 1}
                      </span>
                      <span className="font-bold text-foreground">{d.name}</span>
                    </div>
                    <span className="font-extrabold text-foreground">{money(d.price * d.qty)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1.5 border-t border-border/50">
                    <span>
                      {money(d.price)} / {d.unit}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">Kuantitas:</span>
                      {canEditQtyOnly ? (
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={d.qty}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setEditableDetails((prev) =>
                              prev.map((item, idx) => (idx === i ? { ...item, qty: val } : item))
                            );
                          }}
                          className="h-7 w-20 rounded border border-primary/60 bg-card px-2 text-right text-xs font-bold text-primary focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <span className="font-black text-foreground">
                          {d.qty} {d.unit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (sm+) */}
            <div className="hidden sm:block overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-3 py-2 font-semibold">No</th>
                    <th className="px-3 py-2 font-semibold">Nama Bahan</th>
                    <th className="px-3 py-2 font-semibold text-right">Kuantitas (Qty)</th>
                    <th className="px-3 py-2 font-semibold">Satuan</th>
                    <th className="px-3 py-2 font-semibold text-right">Harga</th>
                    <th className="px-3 py-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {canEditQtyOnly
                    ? editableDetails.map((d, i) => (
                        <tr key={d.id} className="hover:bg-surface/50">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{d.name}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={d.qty}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditableDetails((prev) =>
                                  prev.map((item, idx) =>
                                    idx === i ? { ...item, qty: val } : item
                                  )
                                );
                              }}
                              className="h-7 w-20 rounded border border-primary/60 bg-card px-2 text-right text-xs font-bold text-primary focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="px-3 py-2">{d.unit}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {money(d.price)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {money(d.price * d.qty)}
                          </td>
                        </tr>
                      ))
                    : (activeRequest.details || []).map((d, i) => (
                        <tr key={d.id} className="hover:bg-surface/50">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{d.name}</td>
                          <td className="px-3 py-2 text-right font-bold">{d.qty}</td>
                          <td className="px-3 py-2">{d.unit}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {money(d.price)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {money(d.price * d.qty)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FINANCIAL REPORTING BREAKDOWN (JIKA LPJ / REALISASI SUDAH ADA) */}
          {(activeRequest.status === "Laporan Belanja Diajukan" ||
            activeRequest.status === "Selesai" ||
            activeRequest.actualSpent) && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Receipt className="size-4 text-primary" />
                Laporan Pertanggungjawaban (LPJ) & Rekonsiliasi Kas Belanja:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-surface p-3 rounded-lg border border-border/80">
                <div>
                  <span className="text-muted-foreground">Dana Ditransfer</span>
                  <p className="mt-0.5 font-extrabold text-foreground">
                    {money(activeRequest.disbursedAmount || activeRequest.price)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Realisasi (Bon)</span>
                  <p className="mt-0.5 font-extrabold text-foreground">
                    {money(activeRequest.actualSpent || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kembalian (Di Asdos)</span>
                  <p className="mt-0.5 font-bold text-emerald-600">
                    {money(activeRequest.refundAmount || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kekurangan Uang</span>
                  <p className="mt-0.5 font-bold text-rose-600">
                    {money(activeRequest.deficitAmount || 0)}
                  </p>
                </div>
              </div>

              {activeRequest.refundAmount && activeRequest.refundAmount > 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <strong>Sisa Kembalian:</strong> {money(activeRequest.refundAmount)}. Sesuai aturan, dana kembalian tetap dipegang oleh Asdos untuk saldo operasional praktikum berikutnya.
                </div>
              ) : null}

              {activeRequest.deficitAmount && activeRequest.deficitAmount > 0 ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                  <strong>Kekurangan Dana Belanja:</strong> {money(activeRequest.deficitAmount)}. Status reimbursement: <strong>{activeRequest.reimbursementStatus}</strong>.
                </div>
              ) : null}

              {/* Receipt image thumbnails */}
              {activeRequest.receiptImages && activeRequest.receiptImages.length > 0 && (
                <div className="mt-2">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Foto Bukti Bon / Nota Belanja:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeRequest.receiptImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Bon ${idx + 1}`}
                        className="h-20 w-28 object-cover rounded-md border border-border shadow-2xs hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6-Step Cycle Interactive Tracker */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
              Perjalanan Siklus Pengadaan Bahan
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {SIKLUS_TAHAPAN.map((step, idx) => {
                const currentIndex = SIKLUS_TAHAPAN.indexOf(activeRequest.status);
                const isCompleted = currentIndex >= idx;
                const isCurrent = activeRequest.status === step;
                return (
                  <div
                    key={step}
                    className={`rounded-md p-2.5 text-center border transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : isCompleted
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                        : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-80">Tahap {idx + 1}</div>
                    <div className="text-[11px] font-bold leading-tight mt-0.5">{step}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeRequest.note && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200">
              <span className="font-bold">Catatan Verifikasi:</span> {activeRequest.note}
            </div>
          )}

          {/* WORKFLOW TRANSITION BUTTONS */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
              Tindakan Workflow ({role})
            </p>

            {/* Actions for Koordinator */}
            {role === "Koordinator" && activeRequest.status === "Diajukan" && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground">
                  Catatan Verifikasi Koordinator Lab (Opsional):
                  <textarea
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Contoh: Standar porsi telah disesuaikan dengan kebutuhan praktikum..."
                    className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      handleSaveQtyChanges(activeRequest.id, editableDetails);
                      updateStatus(
                        activeRequest.id,
                        "Diverifikasi Koordinator",
                        decisionNote || "Standar porsi bahan telah diverifikasi Koordinator Lab."
                      );
                    }}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs w-full sm:w-auto"
                  >
                    <Check className="size-3.5" /> Verifikasi Standar Porsi & Teruskan ke Kaprodi
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateStatus(
                        activeRequest.id,
                        "Ditolak",
                        decisionNote || "Standar bahan belum sesuai alokasi praktikum"
                      )
                    }
                    className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs w-full sm:w-auto shadow-xs cursor-pointer"
                  >
                    <X className="size-3.5" /> Tolak
                  </Button>
                </div>
              </div>
            )}

            {/* Actions for Kaprodi */}
            {role === "Kaprodi" && activeRequest.status === "Diverifikasi Koordinator" && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground">
                  Catatan Persetujuan Kaprodi (Opsional):
                  <textarea
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Contoh: Kurikulum praktik disetujui. Diajukan pencairan anggaran ke Bagian Keuangan..."
                    className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      handleSaveQtyChanges(activeRequest.id, editableDetails);
                      updateStatus(
                        activeRequest.id,
                        "Disetujui Kaprodi",
                        decisionNote || "Disetujui Kaprodi. Diajukan pencairan dana ke Keuangan."
                      );
                    }}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs w-full sm:w-auto cursor-pointer"
                  >
                    <Check className="size-3.5" /> Setujui Kurikulum & Ajukan ke Keuangan
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateStatus(
                        activeRequest.id,
                        "Ditolak",
                        decisionNote || "Kurikulum belum sesuai jadwal akademik"
                      )
                    }
                    className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs w-full sm:w-auto shadow-xs cursor-pointer"
                  >
                    <X className="size-3.5" /> Tolak
                  </Button>
                </div>
              </div>
            )}

            {/* Actions for Bagian Keuangan */}
            {role === "Bagian Keuangan" && (
              <div className="space-y-3">
                {activeRequest.status === "Disetujui Kaprodi" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Pengajuan telah disetujui Kaprodi. Silakan konfirmasi transfer/pencairan dana belanja ke rekening Asdos.
                    </p>
                    <Button
                      onClick={() =>
                        updateStatus(
                          activeRequest.id,
                          "Dana Dicairkan",
                          "Dana belanja bahan ditransfer ke rekening Asdos.",
                          { disbursedAmount: activeRequest.price }
                        )
                      }
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                    >
                      <Wallet className="size-3.5" /> Transfer Dana ke Asdos ({money(activeRequest.price)})
                    </Button>
                  </div>
                )}

                {activeRequest.status === "Laporan Belanja Diajukan" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Asdos telah melampirkan nota/bon belanja. Periksa rekonsiliasi kas belanja di atas.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeRequest.deficitAmount && activeRequest.deficitAmount > 0 ? (
                        <Button
                          onClick={() =>
                            updateStatus(
                              activeRequest.id,
                              "Selesai",
                              "Kekurangan dana belanja telah diganti/ditransfer oleh Keuangan ke rekening Asdos. LPJ resmi ditutup.",
                              { reimbursementStatus: "Telah Diganti" }
                            )
                          }
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <CheckCircle2 className="size-3.5" /> Transfer Penggantian Uang Kurang (
                          {money(activeRequest.deficitAmount)}) & Tutup LPJ
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            updateStatus(
                              activeRequest.id,
                              "Selesai",
                              "LPJ belanja & bon diverifikasi Bagian Keuangan. Sisa kembalian disimpan Asdos. Transaksi resmi selesai."
                            )
                          }
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          <CheckCircle2 className="size-3.5" /> Verifikasi LPJ Belanja & Tutup Selesai
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions for Staf / Asdos */}
            {role === "Staf / Asdos" && (
              <div className="flex flex-wrap gap-2">
                {activeRequest.status === "Dana Dicairkan" && (
                  <Button
                    onClick={() =>
                      updateStatus(
                        activeRequest.id,
                        "Proses Pembelian",
                        "Asdos mulai membelanjakan bahan masakan."
                      )
                    }
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    <ShoppingBag className="size-3.5" /> Mulai Berangkat Belanja Bahan
                  </Button>
                )}

                {activeRequest.status === "Proses Pembelian" && (
                  <Button
                    onClick={() => {
                      setReportingRequestId(activeRequest.id);
                      setReportSpentAmount(activeRequest.disbursedAmount || activeRequest.price);
                      onClose();
                    }}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                    title="Barang sudah sampai / belanja selesai: wajib unggah foto bon belanja"
                  >
                    <Receipt className="size-3.5" /> Barang Sampai & Lapor Bon
                  </Button>
                )}

                {/* Fix #4: Ajukan Ulang setelah Ditolak */}
                {activeRequest.status === "Ditolak" &&
                  (!currentUser || activeRequest.applicant === currentUser.name) && (
                    <div className="w-full space-y-2">
                      <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-xs text-orange-900 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                        <p className="font-bold flex items-center gap-1.5">
                          <Info className="size-4 shrink-0 text-orange-600" />
                          Pengajuan ini ditolak. Anda dapat merevisi dan mengajukan ulang.
                        </p>
                        <p className="mt-1 text-[11px] text-orange-800 dark:text-orange-400">
                          Pastikan Anda telah menyesuaikan jumlah atau jenis bahan sesuai catatan penolakan sebelum mengajukan ulang ke Koordinator.
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          updateStatus(
                            activeRequest.id,
                            "Diajukan",
                            "Pengajuan diajukan ulang oleh Asdos setelah revisi."
                          )
                        }
                        className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                      >
                        <Send className="size-3.5" /> Ajukan Ulang ke Koordinator
                      </Button>
                    </div>
                  )}
              </div>
            )}

            {/* Actions for Super Admin */}
            {role === "Super Admin" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  Ubah Status Cepat:
                </span>
                {SIKLUS_TAHAPAN.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    disabled={activeRequest.status === s}
                    onClick={() => updateStatus(activeRequest.id, s)}
                    className="h-7 text-[10px] font-bold"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Unduh Dokumen Resmi PR & Laporan */}
          <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-xs text-muted-foreground">Unduh dokumen resmi PR dan lembar LPJ:</p>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => exportSingleExcel(activeRequest)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex-1 sm:flex-initial"
              >
                <Download className="size-3.5" /> Unduh Excel (PR &amp; Bon)
              </Button>
              {exportSinglePdf && (
                <Button
                  variant="outline"
                  onClick={() => exportSinglePdf(activeRequest)}
                  className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 font-bold text-xs flex-1 sm:flex-initial"
                >
                  <FileText className="size-3.5" /> Unduh PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
