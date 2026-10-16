import React, { useState } from "react";
import { Download, FileText, AlertTriangle, Receipt, Smartphone, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DeadlineTag } from "@/components/common/DeadlineTag";
import {
  SIKLUS_TAHAPAN,
  SIKLUS_TAHAPAN_A,
  SIKLUS_TAHAPAN_B,
  isPemohon,
  isKoordinator,
} from "@/types/procurement";
import { money, formatUnitLabel } from "@/lib/utils";
import { exportBkkPdf, isBkkPrintable } from "@/lib/export/bkk-pdf-export";
import type { Role, Status, RequestItem, RequestDetail, User } from "@/types/procurement";
import { RequestItemsTable } from "./request-detail/RequestItemsTable";
import { RequestLpjSection } from "./request-detail/RequestLpjSection";
import { RequestWorkflowActions } from "./request-detail/RequestWorkflowActions";
import { ProcurementTimeline } from "./request-detail/ProcurementTimeline";
import { WhatsAppShareModal } from "./WhatsAppShareModal";

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
    extraFields?: Partial<RequestItem>,
  ) => void;
  decisionNote: string;
  setDecisionNote: (val: string) => void;
  setReportingRequestId: (id: string | null) => void;
  setReportSpentAmount: (amt: number) => void;
  exportSingleExcel: (r: RequestItem) => void;
  exportSinglePdf?: (r: RequestItem) => void;
  waActionData?: { action: "approve" | "reject"; id: string } | null;
  setWaActionData?: (val: { action: "approve" | "reject"; id: string } | null) => void;
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
  waActionData,
  setWaActionData,
}) => {
  const [isHeaderWaOpen, setIsHeaderWaOpen] = useState(false);

  if (!activeRequest) return null;

  const isKoorEditing = isKoordinator(role) && activeRequest.status === "DIAJUKAN";
  const isKaprodiEditing = role === "Kaprodi" && activeRequest.status === "DIVERIFIKASI_KOORD";
  const canEditQtyOnly = isKoorEditing || isKaprodiEditing;

  return (
    <>
      <Dialog open={Boolean(activeRequest)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-2xl overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
          <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold text-primary">
                  {activeRequest.id}
                </span>
                <StatusBadge status={activeRequest.status} />
                <DeadlineTag r={activeRequest} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHeaderWaOpen(true)}
                  className="h-6 text-[10px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/40 cursor-pointer px-2 font-bold"
                  title="Bagikan rincian pengajuan ke WhatsApp"
                >
                  <Smartphone className="size-3 text-emerald-600" /> Share WA
                </Button>
                <span className="text-[11px] text-muted-foreground">{activeRequest.date}</span>
              </div>
            </div>
            <DialogTitle className="mt-2 text-lg sm:text-xl font-black text-foreground flex flex-wrap items-center gap-2">
              <span
                className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  activeRequest.alur === "B"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                }`}
              >
                {activeRequest.alur === "B" ? "Logistik & ATK" : "Kitchen Lab"}
              </span>
              <span>{activeRequest.menu || activeRequest.item}</span>
              {Boolean(activeRequest.groupCount && activeRequest.groupCount > 1) && (
                <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {activeRequest.groupCount} Kelompok ({activeRequest.groupCount}x Resep)
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeRequest.alur === "B"
                ? `Unit Kerja: ${formatUnitLabel(activeRequest.unitKerja || activeRequest.department)} · Pemohon: ${activeRequest.applicant}`
                : activeRequest.course
                  ? `${activeRequest.course} · Semester ${activeRequest.semester} (${activeRequest.prodi})${activeRequest.groupCount ? ` · ${activeRequest.groupCount} Kelompok` : ""}`
                  : `Diajukan oleh ${activeRequest.applicant}`}
            </DialogDescription>
          </DialogHeader>

          {/* Modal Share WhatsApp Header */}
          <WhatsAppShareModal
            open={isHeaderWaOpen}
            onOpenChange={setIsHeaderWaOpen}
            activeRequest={activeRequest}
            role={role}
            decisionNote={decisionNote}
          />

          {/* Banner Respon Cepat WhatsApp Kaprodi */}
          {waActionData && waActionData.id === activeRequest.id && (
            <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 shadow-xs">
                    WA
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                      Respon Cepat WhatsApp Kaprodi:{" "}
                      <span
                        className={
                          waActionData.action === "approve"
                            ? "text-emerald-700 underline"
                            : "text-rose-700 underline"
                        }
                      >
                        {waActionData.action === "approve" ? "TERIMA / SETUJUI" : "TOLAK PENGAJUAN"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Anda membuka permohonan ini melalui tautan WhatsApp untuk{" "}
                      {waActionData.action === "approve"
                        ? "menyetujui kurikulum dan mengajukan pencairan dana ke Keuangan"
                        : "menolak permohonan ini dan mengembalikan ke Koordinator"}
                      .
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWaActionData && setWaActionData(null)}
                  className="text-xs text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  title="Tutup banner"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-900">
                {waActionData.action === "approve" ? (
                  <Button
                    onClick={() => {
                      handleSaveQtyChanges(activeRequest.id, editableDetails);
                      updateStatus(
                        activeRequest.id,
                        "DISETUJUI_KAPRODI",
                        "Disetujui oleh Kaprodi via tautan WhatsApp (1-Klik Approval).",
                      );
                      setWaActionData?.(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="size-3.5" /> Konfirmasi &amp; Setujui Sekarang (1-Klik)
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setWaActionData?.(null);
                      updateStatus(
                        activeRequest.id,
                        "DITOLAK_KAPRODI",
                        "Ditolak oleh Kaprodi via tautan WhatsApp. Dikembalikan ke antrean Koordinator untuk evaluasi ulang.",
                      );
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                  >
                    <X className="size-3.5" /> Konfirmasi Tolak Pengajuan Sekarang
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWaActionData?.(null)}
                  className="text-xs"
                >
                  Tinjau Rincian Dahulu
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6 px-4 sm:px-6 py-4 sm:py-5">
            {/* Meta properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-surface p-4 text-xs">
              <div>
                <span className="text-muted-foreground">Total Estimasi</span>
                <p className="mt-0.5 font-extrabold text-foreground">
                  {money(activeRequest.price)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Dana Dicairkan</span>
                <p className="mt-0.5 font-bold text-foreground">
                  {activeRequest.danaDiterima || activeRequest.nominalTransfer
                    ? money(activeRequest.danaDiterima || activeRequest.nominalTransfer || 0)
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Tenggat Waktu</span>
                <p className="mt-0.5 font-bold text-foreground">
                  {activeRequest.deadline || activeRequest.needBy}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {activeRequest.alur === "B" ? "Unit & Pemohon" : "Pemohon"}
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  {activeRequest.alur === "B" &&
                  (activeRequest.unitKerja || activeRequest.department)
                    ? `${formatUnitLabel(activeRequest.unitKerja || activeRequest.department)} (${activeRequest.applicant})`
                    : activeRequest.applicant}
                </p>
                {activeRequest.petugasPembelanja && (
                  <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                    Pembelanja: {activeRequest.petugasPembelanja}
                  </p>
                )}
              </div>
            </div>

            {/* Details Table - EDIT QTY ONLY FOR KOORDINATOR / KAPRODI */}
            <RequestItemsTable
              activeRequest={activeRequest}
              canEditQtyOnly={canEditQtyOnly}
              editableDetails={editableDetails}
              setEditableDetails={setEditableDetails}
              handleSaveQtyChanges={handleSaveQtyChanges}
            />

            {/* Financial Reporting Breakdown (Laporan Belanja) */}
            <RequestLpjSection activeRequest={activeRequest} />

            {/* Dynamic Stepper Tracker (Alur A: 6 Tahap, Alur B: 5 Tahap) */}
            <div>
              {(() => {
                const isB = activeRequest.alur === "B";
                const steps = isB ? SIKLUS_TAHAPAN_B : SIKLUS_TAHAPAN_A;
                const s = activeRequest.status;
                let activeStepIdx = -1;
                if (isB) {
                  if (s === "DIAJUKAN") activeStepIdx = 0;
                  else if (s === "DIVERIFIKASI_KOORD") activeStepIdx = 1;
                  else if (s === "SEDANG_DIBELANJAKAN") activeStepIdx = 2;
                  else if (s === "BARANG_DITERIMA") activeStepIdx = 3;
                  else if (s === "SELESAI") activeStepIdx = 4;
                } else {
                  if (s === "DIAJUKAN") activeStepIdx = 0;
                  else if (s === "DIVERIFIKASI_KOORD") activeStepIdx = 1;
                  else if (s === "DISETUJUI_KAPRODI") activeStepIdx = 2;
                  else if (s === "DANA_DICAIRKAN") activeStepIdx = 3;
                  else if (s === "BARANG_DITERIMA") activeStepIdx = 4;
                  else if (s === "LAPORAN_BELANJA_DIAJUKAN" || s === "SELESAI") activeStepIdx = 5;
                }

                return (
                  <>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
                      Perjalanan Siklus Pengadaan ({isB ? "Alur B: 5 Tahap" : "Alur A: 6 Tahap"})
                    </h4>
                    <div
                      className={`grid grid-cols-2 sm:grid-cols-3 ${isB ? "md:grid-cols-5" : "md:grid-cols-6"} gap-2`}
                    >
                      {steps.map((item, idx) => {
                        const isCompleted = activeStepIdx >= idx;
                        const isCurrent = activeStepIdx === idx;
                        return (
                          <div
                            key={item.status + idx}
                            className={`rounded-md p-2.5 text-center border transition-all ${
                              isCurrent
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                                : isCompleted
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                                  : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-80">Tahap {idx + 1}</div>
                            <div className="text-[11px] font-bold leading-tight mt-0.5">
                              {item.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Rejection Reason Banner */}
            {activeRequest.status.startsWith("DITOLAK_") && (
              <div className="rounded-xl border border-red-300 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/80 p-4 text-xs text-red-900 dark:text-red-200 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-400">
                  <AlertTriangle className="size-4" />
                  <span>Pengajuan Ini Telah Ditolak oleh Reviewer</span>
                </div>
                <p className="text-xs leading-relaxed">
                  <strong className="text-foreground">Alasan Penolakan:</strong>{" "}
                  <span className="font-semibold text-red-700 dark:text-red-300">
                    {activeRequest.rejectionReason ||
                      activeRequest.rejection_reason ||
                      activeRequest.note ||
                      "Standar atau kurikulum belum sesuai jadwal akademik."}
                  </span>
                </p>
                {isPemohon(role) && (
                  <p className="mt-2 text-[11px] text-muted-foreground border-t border-red-200 dark:border-red-900/50 pt-2">
                    💡 Silakan perbaiki kuantitas atau kebutuhan bahan sesuai alasan di atas, lalu
                    gunakan tombol <strong>"Ajukan Ulang"</strong> pada baris pengajuan di tabel
                    utama.
                  </p>
                )}
              </div>
            )}

            {/* Jejak Waktu Aktivitas & Audit Trail */}
            <ProcurementTimeline
              activityLogs={activeRequest.activityLogs}
              activeRequest={activeRequest}
            />

            {/* Workflow Transition Buttons */}
            <RequestWorkflowActions
              activeRequest={activeRequest}
              role={role}
              currentUser={currentUser}
              decisionNote={decisionNote}
              setDecisionNote={setDecisionNote}
              editableDetails={editableDetails}
              handleSaveQtyChanges={handleSaveQtyChanges}
              updateStatus={updateStatus}
              setReportingRequestId={setReportingRequestId}
              setReportSpentAmount={setReportSpentAmount}
              onClose={onClose}
            />

            {/* Unduh Dokumen Resmi PR & Laporan */}
            <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Unduh dokumen resmi PR dan lembar laporan belanja:
              </p>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {isBkkPrintable(activeRequest.status) && (
                  <Button
                    variant="outline"
                    onClick={() => exportBkkPdf(activeRequest)}
                    className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/30 font-bold text-xs flex-1 sm:flex-initial cursor-pointer"
                    title="Cetak lembar Bukti Kas Keluar (BKK) / Kuitansi resmi pencairan dana"
                  >
                    <Receipt className="size-3.5" /> Cetak BKK
                  </Button>
                )}
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

      {/* WhatsApp Modal dari tombol header Share WA */}
      <WhatsAppShareModal
        open={isHeaderWaOpen}
        onOpenChange={setIsHeaderWaOpen}
        activeRequest={activeRequest}
        role={role}
        decisionNote={decisionNote}
      />
    </>
  );
};
