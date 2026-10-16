import React, { useState } from "react";
import {
  Check,
  X,
  Wallet,
  CheckCircle2,
  ShoppingBag,
  Receipt,
  Info,
  Send,
  Printer,
  Smartphone,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIKLUS_TAHAPAN, isPemohon, isKoordinator, isKeuangan } from "@/types/procurement";
import { money } from "@/lib/utils";
import type { Role, Status, RequestItem, RequestDetail, User } from "@/types/procurement";
import { RejectRequestModal } from "@/components/modals/RejectRequestModal";
import { WhatsAppShareModal } from "@/components/modals/WhatsAppShareModal";
import { exportBkkPdf, isBkkPrintable } from "@/lib/export/bkk-pdf-export";
import { SpakeApi } from "@/lib/api-client";
import { toast } from "sonner";

interface RequestWorkflowActionsProps {
  activeRequest: RequestItem;
  role: Role;
  currentUser: User | null;
  decisionNote: string;
  setDecisionNote: (val: string) => void;
  editableDetails: RequestDetail[];
  handleSaveQtyChanges: (id: string, details: RequestDetail[]) => void;
  updateStatus: (
    id: string,
    newStatus: Status,
    note?: string,
    extraFields?: Partial<RequestItem> & { formData?: FormData },
  ) => void | Promise<void>;
  setReportingRequestId: (id: string | null) => void;
  setReportSpentAmount: (amt: number) => void;
  onClose: () => void;
}

const SATUAN_UTUH = new Set([
  "butir",
  "pcs",
  "rim",
  "botol",
  "pack",
  "batang",
  "lembar",
  "set",
  "ikat",
  "kaleng",
  "bungkus",
  "ekor",
  "paket",
  "sachet",
  "blok",
  "unit",
  "dus",
  "box",
]);

function calcPreviewQtyFinal(qty: number, f: number, unit: string): number {
  if (f === 0) return 0;
  const raw = qty * f;
  const cleanUnit = (unit || "").toLowerCase().trim();
  if (SATUAN_UTUH.has(cleanUnit)) {
    return Math.ceil(raw);
  }
  return Number(raw.toFixed(2));
}

export const RequestWorkflowActions: React.FC<RequestWorkflowActionsProps> = ({
  activeRequest,
  role,
  currentUser,
  decisionNote,
  setDecisionNote,
  editableDetails,
  handleSaveQtyChanges,
  updateStatus,
  setReportingRequestId,
  setReportSpentAmount,
  onClose,
}) => {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // State Keputusan Keuangan (Faktor f)
  const [faktorF, setFaktorF] = useState<number>(activeRequest.faktorF ?? 1);
  const [catatanKeuangan, setCatatanKeuangan] = useState<string>(
    activeRequest.catatanKeuangan || "",
  );
  const [nominalTransfer, setNominalTransfer] = useState<number>(
    activeRequest.nominalTransfer || activeRequest.danaDiterima || activeRequest.price || 0,
  );
  const [buktiTransferFile, setBuktiTransferFile] = useState<File | null>(null);
  const [keuanganError, setKeuanganError] = useState<string | null>(null);

  // State Alur A Kasbon Settlement
  const [buktiSetorFile, setBuktiSetorFile] = useState<File | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // State Alur B SPJ oleh Keuangan Umum
  const [alurBActualSpent, setAlurBActualSpent] = useState<number>(
    activeRequest.actualSpent ||
      activeRequest.nominalTransfer ||
      activeRequest.danaDiterima ||
      activeRequest.price ||
      0,
  );
  const [alurBReceiptFiles, setAlurBReceiptFiles] = useState<File[]>([]);
  const [isSubmittingSpj, setIsSubmittingSpj] = useState(false);
  const [alurBSpjSuccess, setAlurBSpjSuccess] = useState(false);

  const isAlurB = activeRequest.alur === "B";

  const handleFaktorFSelect = (fVal: number) => {
    setFaktorF(fVal);
    setKeuanganError(null);
    if (fVal === 0) {
      setNominalTransfer(0);
    } else {
      setNominalTransfer(Math.round((activeRequest.price || 0) * fVal));
    }
  };

  const handleSimpanKeputusanKeuangan = async () => {
    if (!catatanKeuangan.trim()) {
      setKeuanganError("Catatan keputusan Keuangan wajib diisi.");
      return;
    }
    if (faktorF > 0 && (!nominalTransfer || nominalTransfer <= 0)) {
      setKeuanganError("Nominal transfer wajib diisi untuk faktor f > 0.");
      return;
    }
    if (faktorF > 0 && !buktiTransferFile && !activeRequest.buktiTransfer) {
      setKeuanganError("Bukti transfer pencairan dana wajib diunggah (JPG/PNG/PDF, maks 5 MB).");
      return;
    }

    setKeuanganError(null);

    if (faktorF === 0) {
      try {
        await updateStatus(activeRequest.id, "DITOLAK_KEUANGAN", catatanKeuangan.trim(), {
          faktorF: 0,
          catatanKeuangan: catatanKeuangan.trim(),
          nominalTransfer: 0,
          rejectionReason: catatanKeuangan.trim(),
          rejection_reason: catatanKeuangan.trim(),
        });
        toast.success("Pengajuan berhasil ditolak oleh Keuangan.");
        onClose();
      } catch (err: unknown) {
        setKeuanganError(err instanceof Error ? err.message : "Gagal menyimpan penolakan.");
      }
      return;
    }

    const targetStatus: Status = isAlurB ? "SEDANG_DIBELANJAKAN" : "DANA_DICAIRKAN";
    const detailsToProcess =
      editableDetails && editableDetails.length > 0 ? editableDetails : activeRequest.details || [];

    const updatedDetails = detailsToProcess.map((d) => {
      const qFinal = calcPreviewQtyFinal(d.qty, faktorF, d.unit);
      return {
        ...d,
        qtyFinal: qFinal,
        qty_final: qFinal,
      };
    });

    const formData = new FormData();
    formData.append("faktor_f", String(faktorF));
    formData.append("catatan_keuangan", catatanKeuangan.trim());
    formData.append("nominal_transfer", String(nominalTransfer));
    if (buktiTransferFile) {
      formData.append("bukti_transfer", buktiTransferFile);
    }

    try {
      await updateStatus(activeRequest.id, targetStatus, catatanKeuangan.trim(), {
        faktorF,
        catatanKeuangan: catatanKeuangan.trim(),
        nominalTransfer,
        danaDiterima: nominalTransfer,
        details: updatedDetails,
        formData,
      });
      toast.success("Keputusan Keuangan berhasil disimpan.");
      onClose();
    } catch (err: unknown) {
      setKeuanganError(err instanceof Error ? err.message : "Gagal menyimpan keputusan keuangan.");
    }
  };

  const handleConfirmReject = (reason: string) => {
    let targetStatus: Status = "DITOLAK_KOORD";
    if (role === "Kaprodi") {
      targetStatus = "DITOLAK_KAPRODI";
    } else if (isKeuangan(role)) {
      targetStatus = "DITOLAK_KEUANGAN";
    }

    updateStatus(activeRequest.id, targetStatus, reason, {
      rejectionReason: reason,
      rejection_reason: reason,
    });
  };

  // Helper A1: Alur A Kasbon Settlement
  const danaDiterima = Number(activeRequest.danaDiterima || activeRequest.nominalTransfer || 0);
  const actualSpent = Number(activeRequest.actualSpent || 0);
  const diff = actualSpent - danaDiterima; // < 0: refund (sisa disetor), > 0: tombok (carry-over), === 0: pas
  const hasSettlement = Boolean(
    activeRequest.penyelesaian && activeRequest.penyelesaian.length > 0,
  );

  const handleSelesaikanAlurA = async () => {
    setIsSettling(true);
    setSettlementError(null);
    try {
      if (diff < 0 && !hasSettlement) {
        if (!buktiSetorFile) {
          setSettlementError(
            "Bukti setor sisa dana kasbon wajib diunggah (JPG/PNG/PDF, maks 5 MB).",
          );
          setIsSettling(false);
          return;
        }
        const formData = new FormData();
        formData.append("bukti_setor", buktiSetorFile);
        formData.append("actualSpent", String(actualSpent));
        await SpakeApi.catatPenyelesaianKasbon(activeRequest.id, formData);
      } else if (diff > 0 && !hasSettlement) {
        await SpakeApi.catatPenyelesaianKasbon(activeRequest.id, {
          actualSpent,
        });
      }

      await updateStatus(
        activeRequest.id,
        "SELESAI",
        "Laporan belanja & bon diverifikasi Bagian Keuangan. Transaksi resmi selesai.",
      );
      toast.success("Pengadaan dan penyelesaian kasbon berhasil ditutup.");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyelesaikan pengadaan.";
      setSettlementError(msg);
      toast.error(msg);
    } finally {
      setIsSettling(false);
    }
  };

  // Helper A2: Simpan SPJ Alur B oleh Keuangan Umum
  const handleSimpanSpjAlurB = async () => {
    if (!alurBActualSpent || alurBActualSpent <= 0) {
      toast.error("Nominal realisasi belanja riil wajib diisi.");
      return;
    }
    if (
      alurBReceiptFiles.length === 0 &&
      !(activeRequest.receiptImages && activeRequest.receiptImages.length > 0)
    ) {
      toast.error("Wajib mengunggah minimal 1 bukti nota/bon fisik (JPG/PNG/PDF).");
      return;
    }

    setIsSubmittingSpj(true);
    try {
      const formData = new FormData();
      formData.append("actualSpent", String(alurBActualSpent));
      formData.append("note", "SPJ dan nota belanja diunggah oleh Keuangan Umum.");
      for (const file of alurBReceiptFiles) {
        formData.append("receipts[]", file);
      }

      await SpakeApi.submitSpj(activeRequest.id, formData);
      setAlurBSpjSuccess(true);
      toast.success("SPJ dan nota belanja berhasil disimpan.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan SPJ belanja.");
    } finally {
      setIsSubmittingSpj(false);
    }
  };

  const hasAlurBSpj = Boolean(
    (activeRequest.actualSpent &&
      activeRequest.actualSpent > 0 &&
      ((activeRequest.receiptImages && activeRequest.receiptImages.length > 0) ||
        (activeRequest as { receipts?: unknown[] }).receipts?.length)) ||
    alurBSpjSuccess,
  );

  return (
    <div className="border-t border-border pt-4">
      {/* Modal Alasan Penolakan */}
      <RejectRequestModal
        open={isRejectModalOpen}
        onOpenChange={setIsRejectModalOpen}
        targetRequest={activeRequest}
        role={role}
        onConfirmReject={handleConfirmReject}
      />

      {/* Modal Teruskan via WhatsApp */}
      <WhatsAppShareModal
        open={isWaModalOpen}
        onOpenChange={setIsWaModalOpen}
        activeRequest={activeRequest}
        role={role}
        decisionNote={decisionNote}
        onConfirmForward={() => {
          if (isKoordinator(role) && activeRequest.status === "DIAJUKAN") {
            handleSaveQtyChanges(activeRequest.id, editableDetails);
          }
          updateStatus(
            activeRequest.id,
            "DIVERIFIKASI_KOORD",
            decisionNote ||
              "Standar porsi bahan telah diverifikasi Koordinator Lab & diteruskan via WhatsApp ke Kaprodi.",
          );
        }}
      />

      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
        Tindakan Workflow ({role})
      </p>

      {/* Actions for Koordinator */}
      {isKoordinator(role) && activeRequest.status === "DIAJUKAN" && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-foreground">
            Catatan Verifikasi Koordinator (Opsional):
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder={
                isAlurB
                  ? "Contoh: Qty kertas disesuaikan dengan kebutuhan ujian..."
                  : "Contoh: Standar porsi telah disesuaikan dengan kebutuhan praktikum..."
              }
              className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                handleSaveQtyChanges(activeRequest.id, editableDetails);
                updateStatus(
                  activeRequest.id,
                  "DIVERIFIKASI_KOORD",
                  decisionNote || "Standar bahan/kuantitas telah diverifikasi Koordinator.",
                );
              }}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs w-full sm:w-auto cursor-pointer"
            >
              <Check className="size-3.5" /> Verifikasi &amp; Teruskan ke Reviewer Selanjutnya
            </Button>
            {!isAlurB && (
              <Button
                type="button"
                onClick={() => setIsWaModalOpen(true)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs w-full sm:w-auto shadow-xs cursor-pointer"
              >
                <Smartphone className="size-3.5" /> Teruskan via WhatsApp
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setIsRejectModalOpen(true)}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs w-full sm:w-auto shadow-xs cursor-pointer"
            >
              <X className="size-3.5" /> Tolak
            </Button>
          </div>
        </div>
      )}

      {/* Actions for Kaprodi (Alur A) - B1: Hapus save detail ganda */}
      {role === "Kaprodi" &&
        activeRequest.status === "DIVERIFIKASI_KOORD" &&
        (!activeRequest.alur || activeRequest.alur === "A") && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-foreground">
              Catatan Persetujuan Kaprodi (Opsional):
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Contoh: Kurikulum praktik disetujui. Diajukan pencairan dana ke Bagian Keuangan..."
                className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  updateStatus(
                    activeRequest.id,
                    "DISETUJUI_KAPRODI",
                    decisionNote || "Disetujui Kaprodi. Diajukan pencairan dana ke Keuangan.",
                  );
                }}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs w-full sm:w-auto cursor-pointer"
              >
                <Check className="size-3.5" /> Setujui Kurikulum &amp; Ajukan ke Keuangan
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejectModalOpen(true)}
                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs w-full sm:w-auto shadow-xs cursor-pointer"
              >
                <X className="size-3.5" /> Tolak
              </Button>
            </div>
          </div>
        )}

      {/* Status DITOLAK_KAPRODI (Kembali ke antrean Koordinator Lab) */}
      {activeRequest.status === "DITOLAK_KAPRODI" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Pengajuan ini ditolak oleh Kaprodi dan dikembalikan untuk evaluasi/penyesuaian standar
            bahan oleh Koordinator.
          </p>
          {(isKoordinator(role) || role === "Super Admin") && (
            <Button
              onClick={() =>
                updateStatus(
                  activeRequest.id,
                  "DIAJUKAN",
                  "Dikembalikan ke status DIAJUKAN oleh Koordinator untuk evaluasi kuantitas.",
                )
              }
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              <Check className="size-3.5" /> Masukkan Kembali ke Antrean Verifikasi (DIAJUKAN)
            </Button>
          )}
        </div>
      )}

      {/* Actions for Bagian Keuangan */}
      {isKeuangan(role) && (
        <div className="space-y-3">
          {/* Alur A: DISETUJUI_KAPRODI / Alur B: DIVERIFIKASI_KOORD -> Keputusan Faktor f Keuangan */}
          {((!isAlurB && activeRequest.status === "DISETUJUI_KAPRODI") ||
            (isAlurB && activeRequest.status === "DIVERIFIKASI_KOORD")) && (
            <div className="space-y-4 rounded-xl border border-primary/20 bg-muted/30 p-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Keputusan Alokasi Keuangan (
                  {!isAlurB ? "Alur A: Kitchen" : "Alur B: Logistik & ATK"})
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tentukan faktor alokasi f, periksa pratinjau kuantitas bahan/barang, tentukan
                  nominal transfer, unggah bukti transfer, dan berikan catatan keputusan.
                </p>
              </div>

              {/* Pilihan Faktor f */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Faktor Alokasi (f):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 1, label: "f = 1 (100%)", sub: "Alokasi Penuh" },
                    { val: 0.5, label: "f = 0.5 (50%)", sub: "Alokasi Setengah" },
                    { val: 0.25, label: "f = 0.25 (25%)", sub: "Alokasi Seperempat" },
                    { val: 0, label: "f = 0 (0%)", sub: "Tolak Pengadaan" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleFaktorFSelect(opt.val)}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        faktorF === opt.val
                          ? opt.val === 0
                            ? "border-red-600 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 ring-2 ring-red-500/30"
                            : "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                          : "border-border bg-card text-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <span className="text-xs font-black">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nominal Transfer (Wajib untuk f > 0) */}
              {faktorF > 0 && (
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Nominal Transfer / Pencairan Kas (Rp) <span className="text-red-500">*</span>:
                    <input
                      type="number"
                      min={1}
                      value={nominalTransfer || ""}
                      onChange={(e) => setNominalTransfer(Number(e.target.value))}
                      placeholder="Masukkan nominal transfer kas..."
                      className="mt-1.5 w-full rounded-md border border-input bg-card p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
                    />
                  </label>
                  {!isAlurB && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Catatan Alur A: Jika ada carry-over tombok kasbon Asdos sebelumnya, backend
                      akan otomatis mengakumulasikannya ke dana diterima.
                    </p>
                  )}
                </div>
              )}

              {/* B5: Upload Bukti Transfer (Wajib untuk f > 0) */}
              {faktorF > 0 && (
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Unggah Bukti Transfer / Slip Giro <span className="text-red-500">*</span>:
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setBuktiTransferFile(file);
                        setKeuanganError(null);
                      }}
                      className="mt-1.5 w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Format: JPG, PNG, atau PDF (maksimal 5 MB).
                  </p>
                  {activeRequest.buktiTransfer && !buktiTransferFile && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3" /> Berkas bukti transfer telah tersimpan di
                      server.
                    </p>
                  )}
                </div>
              )}

              {/* Catatan Keputusan Keuangan (Wajib) */}
              <div>
                <label className="block text-xs font-bold text-foreground">
                  Catatan Keputusan Keuangan <span className="text-red-500">*</span>:
                  <textarea
                    value={catatanKeuangan}
                    onChange={(e) => {
                      setCatatanKeuangan(e.target.value);
                      setKeuanganError(null);
                    }}
                    placeholder="Contoh: Disetujui penuh untuk jadwal praktikum minggu ini..."
                    className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-card p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>

              {/* Pratinjau Qty x f per Item */}
              <div>
                <p className="text-xs font-bold text-foreground mb-1.5">
                  Pratinjau Kuantitas per Item (qty &times; f):
                </p>
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/50 font-bold text-muted-foreground">
                      <tr>
                        <th className="px-2.5 py-1.5 w-8">#</th>
                        <th className="px-2.5 py-1.5">Nama Barang / Bahan</th>
                        <th className="px-2.5 py-1.5 text-right">Qty Usulan</th>
                        <th className="px-2.5 py-1.5 text-center">Satuan</th>
                        <th className="px-2.5 py-1.5 text-center">Faktor f</th>
                        <th className="px-2.5 py-1.5 text-right">Qty Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(editableDetails && editableDetails.length > 0
                        ? editableDetails
                        : activeRequest.details || []
                      ).map((item, idx) => {
                        const finalQty = calcPreviewQtyFinal(item.qty, faktorF, item.unit);
                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-2.5 py-1.5 text-muted-foreground font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="px-2.5 py-1.5 font-medium">{item.name}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono">{item.qty}</td>
                            <td className="px-2.5 py-1.5 text-center text-muted-foreground text-[11px]">
                              {item.unit}
                            </td>
                            <td className="px-2.5 py-1.5 text-center font-mono text-[11px]">
                              {faktorF}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-primary">
                              {finalQty} {item.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Message */}
              {keuanganError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-medium">
                  {keuanganError}
                </div>
              )}

              {/* Tombol Simpan & Cetak - C5: Disable bila tidak valid */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  disabled={
                    !catatanKeuangan.trim() ||
                    (faktorF > 0 && (!nominalTransfer || nominalTransfer <= 0)) ||
                    (faktorF > 0 && !buktiTransferFile && !activeRequest.buktiTransfer)
                  }
                  onClick={handleSimpanKeputusanKeuangan}
                  className={`gap-1.5 font-bold text-xs cursor-pointer ${
                    faktorF === 0
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50"
                  }`}
                >
                  {faktorF === 0 ? (
                    <>
                      <X className="size-3.5" /> Tolak Pengadaan (f = 0)
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" /> Simpan Keputusan Keuangan &amp;{" "}
                      {!isAlurB ? "Cairkan Dana" : "Alokasikan Belanja"}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportBkkPdf(activeRequest)}
                  className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 font-bold text-xs cursor-pointer"
                  title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
                >
                  <Printer className="size-3.5" /> Cetak BKK / Kuitansi
                </Button>
              </div>
            </div>
          )}

          {(activeRequest.status === "DANA_DICAIRKAN" ||
            activeRequest.status === "SEDANG_DIBELANJAKAN" ||
            activeRequest.status === "BARANG_DITERIMA") && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
              <p className="text-xs text-muted-foreground">
                Dana operasional telah dialokasikan/ditransfer (
                {money(
                  activeRequest.danaDiterima ||
                    activeRequest.nominalTransfer ||
                    activeRequest.price,
                )}
                ).
              </p>

              {/* A2: Form SPJ Alur B untuk Keuangan Umum saat BARANG_DITERIMA */}
              {isAlurB && activeRequest.status === "BARANG_DITERIMA" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <Receipt className="size-4 text-blue-600" /> Form SPJ &amp; Rekonsiliasi Nota
                      Toko (Keuangan Umum)
                    </h5>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                      Masukkan nominal riil belanja dari bon/kuitansi toko dan unggah berkas nota
                      (JPG/PNG/PDF).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Total Riil Belanja (Rp) <span className="text-red-500">*</span>:
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={alurBActualSpent || ""}
                        onChange={(e) => setAlurBActualSpent(Number(e.target.value))}
                        placeholder="Contoh: 450000"
                        className="w-full rounded-md border border-input bg-card p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Unggah Berkas Nota / Bon <span className="text-red-500">*</span>:
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            setAlurBReceiptFiles(Array.from(e.target.files));
                          }
                        }}
                        className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      disabled={
                        isSubmittingSpj ||
                        !alurBActualSpent ||
                        (alurBReceiptFiles.length === 0 &&
                          !(activeRequest.receiptImages && activeRequest.receiptImages.length > 0))
                      }
                      onClick={handleSimpanSpjAlurB}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                    >
                      <UploadCloud className="size-3.5" />
                      {isSubmittingSpj ? "Menyimpan SPJ..." : "Simpan SPJ & Nota Belanja"}
                    </Button>
                    {hasAlurBSpj && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> SPJ tersimpan (
                        {money(activeRequest.actualSpent || alurBActualSpent)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isBkkPrintable(activeRequest.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportBkkPdf(activeRequest)}
                    className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 font-bold text-xs cursor-pointer"
                    title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
                  >
                    <Printer className="size-3.5" /> Cetak Bukti Kas Keluar (BKK)
                  </Button>
                )}
                {/* Alur B: BARANG_DITERIMA -> SELESAI (Hanya aktif jika SPJ sudah tersimpan) */}
                {isAlurB && activeRequest.status === "BARANG_DITERIMA" && (
                  <Button
                    disabled={!hasAlurBSpj}
                    onClick={() =>
                      updateStatus(
                        activeRequest.id,
                        "SELESAI",
                        "Pengadaan logistik unit kerja telah selesai dan diverifikasi Keuangan Umum.",
                      )
                    }
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3.5" /> Selesaikan &amp; Tutup Pengadaan
                  </Button>
                )}
              </div>
              {isAlurB && activeRequest.status === "BARANG_DITERIMA" && !hasAlurBSpj && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  * Tombol Selesaikan &amp; Tutup Pengadaan baru aktif setelah SPJ dan bukti nota
                  belanja diunggah di atas.
                </p>
              )}
            </div>
          )}

          {/* A1: Alur A LAPORAN_BELANJA_DIAJUKAN (Verifikasi SPJ & Kasbon Settlement) */}
          {activeRequest.status === "LAPORAN_BELANJA_DIAJUKAN" && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-muted/30 p-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Rekonsiliasi Kasbon Belanja Asdos (Alur A)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Dana Diterima: {money(danaDiterima)} | Realisasi Belanja: {money(actualSpent)} |
                  Selisih: {money(Math.abs(diff))}{" "}
                  {diff < 0 ? "(Sisa/Refund)" : diff > 0 ? "(Tombok Asdos)" : "(Pas)"}
                </p>
              </div>

              {/* Status Selisih Kasbon */}
              {diff < 0 && !hasSettlement && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-amber-600 shrink-0" />
                    Asdos mengembalikan sisa dana kasbon sebesar {money(Math.abs(diff))}.
                  </p>
                  <label className="block text-xs font-bold text-foreground">
                    Unggah Bukti Setor Sisa Dana (JPG/PNG/PDF ≤ 5 MB){" "}
                    <span className="text-red-500">*</span>:
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setBuktiSetorFile(file);
                        setSettlementError(null);
                      }}
                      className="mt-1 w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {diff > 0 && !hasSettlement && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="size-4 text-blue-600 shrink-0" />
                    Terdapat kekurangan dana (tombok Asdos) sebesar {money(diff)}.
                  </p>
                  <p className="mt-1 text-[11px] text-blue-800 dark:text-blue-400">
                    Sesuai aturan SRS, nominal tombok ini akan otomatis dicatat sebagai{" "}
                    <strong>carry-over</strong> yang ditambahkan pada kasbon pengadaan berikutnya
                    saat pengajuan ditutup.
                  </p>
                </div>
              )}

              {diff === 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>
                    Realisasi belanja pas sesuai dana yang dicairkan ({money(actualSpent)}).
                    Pengajuan dapat langsung ditutup.
                  </span>
                </div>
              )}

              {settlementError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 font-medium">
                  {settlementError}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  disabled={isSettling || (diff < 0 && !hasSettlement && !buktiSetorFile)}
                  onClick={handleSelesaikanAlurA}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  {isSettling
                    ? "Memproses Penyelesaian..."
                    : "Verifikasi Laporan Belanja & Tutup Selesai"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportBkkPdf(activeRequest)}
                  className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 font-bold text-xs"
                  title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
                >
                  <Printer className="size-3.5" /> Cetak BKK
                </Button>
              </div>
            </div>
          )}

          {activeRequest.status === "SELESAI" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportBkkPdf(activeRequest)}
                className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 font-bold text-xs cursor-pointer"
                title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
              >
                <Printer className="size-3.5" /> Cetak Arsip BKK Resmi
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions for Staf / Asdos */}
      {isPemohon(role) && (
        <div className="flex flex-wrap gap-2">
          {/* Alur A: DANA_DICAIRKAN -> BARANG_DITERIMA */}
          {activeRequest.status === "DANA_DICAIRKAN" &&
            (!activeRequest.alur || activeRequest.alur === "A") && (
              <Button
                onClick={() =>
                  updateStatus(
                    activeRequest.id,
                    "BARANG_DITERIMA",
                    "Barang belanjaan telah sampai dan dikonfirmasi diterima oleh Asdos.",
                  )
                }
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
              >
                <ShoppingBag className="size-3.5" /> Konfirmasi Terima Barang
              </Button>
            )}

          {/* Alur B: SEDANG_DIBELANJAKAN -> BARANG_DITERIMA */}
          {activeRequest.status === "SEDANG_DIBELANJAKAN" && activeRequest.alur === "B" && (
            <Button
              onClick={() =>
                updateStatus(
                  activeRequest.id,
                  "BARANG_DITERIMA",
                  "Barang logistik/ATK telah sampai dan dikonfirmasi diterima oleh Staf Unit.",
                )
              }
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              <ShoppingBag className="size-3.5" /> Konfirmasi Terima Barang
            </Button>
          )}

          {/* Alur A: BARANG_DITERIMA -> LAPORAN_BELANJA_DIAJUKAN */}
          {activeRequest.status === "BARANG_DITERIMA" &&
            (!activeRequest.alur || activeRequest.alur === "A") && (
              <Button
                onClick={() => {
                  setReportingRequestId(activeRequest.id);
                  setReportSpentAmount(
                    activeRequest.danaDiterima ||
                      activeRequest.nominalTransfer ||
                      activeRequest.price,
                  );
                  onClose();
                }}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                title="Barang sudah sampai / belanja selesai: wajib unggah foto bon belanja"
              >
                <Receipt className="size-3.5" /> Unggah Bon &amp; Lapor Belanja
              </Button>
            )}

          {/* Ajukan Ulang setelah Ditolak */}
          {(activeRequest.status === "DITOLAK_KOORD" ||
            activeRequest.status === "DITOLAK_KAPRODI") &&
            (!currentUser || activeRequest.applicant === currentUser.name) && (
              <div className="w-full space-y-2">
                <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-xs text-orange-900 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="size-4 shrink-0 text-orange-600" />
                    Pengajuan ini ditolak. Anda dapat merevisi dan mengajukan ulang.
                  </p>
                  <p className="mt-1 text-[11px] text-orange-800 dark:text-orange-400">
                    Pastikan Anda telah menyesuaikan jumlah atau jenis bahan sesuai catatan
                    penolakan sebelum mengajukan ulang.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    updateStatus(
                      activeRequest.id,
                      "DIAJUKAN",
                      "Pengajuan diajukan ulang oleh pemohon setelah revisi.",
                    )
                  }
                  className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                >
                  <Send className="size-3.5" /> Ajukan Ulang Pengajuan
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
  );
};
