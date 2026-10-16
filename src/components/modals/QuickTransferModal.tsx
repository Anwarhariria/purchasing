import React from "react";
import { Wallet, Check, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { exportBkkPdf } from "@/lib/export/bkk-pdf-export";
import type { RequestItem, Status } from "@/types/procurement";

interface QuickTransferModalProps {
  quickReviewItem: RequestItem | null;
  onClose: () => void;
  decisionNote: string;
  setDecisionNote: (val: string) => void;
  updateStatus: (
    id: string,
    newStatus: Status,
    note?: string,
    extraFields?: Partial<RequestItem>,
  ) => void;
}

export const QuickTransferModal: React.FC<QuickTransferModalProps> = ({
  quickReviewItem,
  onClose,
  decisionNote,
  setDecisionNote,
  updateStatus,
}) => {
  const [factorF, setFactorF] = React.useState<number>(1);
  const [carryOverAmount, setCarryOverAmount] = React.useState<number>(0);

  React.useEffect(() => {
    setCarryOverAmount(0);
    setFactorF(1);
  }, [quickReviewItem]);

  if (!quickReviewItem) return null;

  const baseApproved = quickReviewItem.price;
  const allocatedBase = Math.round(baseApproved * factorF);
  const finalTransferAmount = allocatedBase + carryOverAmount;

  return (
    <Dialog open={Boolean(quickReviewItem)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-lg overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-emerald-50 dark:bg-emerald-950/30 px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wallet className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {quickReviewItem.status === "DISETUJUI_KAPRODI" ||
                quickReviewItem.status === "DIVERIFIKASI_KOORD"
                  ? "Pencairan Kasbon & Alokasi Parsial (F-KK-01)"
                  : "Verifikasi Laporan Belanja & Bon"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {quickReviewItem.status === "DISETUJUI_KAPRODI" ||
                quickReviewItem.status === "DIVERIFIKASI_KOORD"
                  ? `Validasi alokasi f dan transfer dana kasbon untuk ${quickReviewItem.id}`
                  : `Verifikasi kesesuaian nota belanja dan selisih kas untuk ${quickReviewItem.id}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Judul / Menu:</span>
              <span className="font-bold text-foreground">
                {quickReviewItem.menu || quickReviewItem.item}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mata Kuliah / Unit:</span>
              <span className="font-semibold text-foreground">
                {quickReviewItem.course || quickReviewItem.department}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Penerima Kasbon:</span>
              <span className="font-semibold text-foreground">{quickReviewItem.applicant}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-bold">Estimasi Disetujui:</span>
              <span className="font-black text-slate-800 dark:text-slate-200">
                {money(baseApproved)}
              </span>
            </div>
          </div>

          {/* F-KK-01: PILIHAN FAKTOR ALOKASI PARSIAL f */}
          {(quickReviewItem.status === "DISETUJUI_KAPRODI" ||
            quickReviewItem.status === "DIVERIFIKASI_KOORD") && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  Faktor Alokasi Kas (f):
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {factorF * 100}% Alokasi
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "100% (f=1)", val: 1 },
                  { label: "50% (f=0.5)", val: 0.5 },
                  { label: "25% (f=0.25)", val: 0.25 },
                  { label: "0% (Tunda)", val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setFactorF(opt.val)}
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold transition-all ${
                      factorF === opt.val
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* RINCIAN PERHITUNGAN TRANSFER */}
              <div className="border-t border-emerald-200/60 pt-2 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Alokasi Dana Praktik ({factorF * 100}%):</span>
                  <span className="font-semibold">{money(allocatedBase)}</span>
                </div>
                {carryOverAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span>+ Tombok Asdos Kasbon Lalu (Carry-Over):</span>
                    <span>+{money(carryOverAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-emerald-300/40 pt-1 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                  <span>Total Transfer Kasbon:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {money(finalTransferAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <label className="block text-xs font-bold text-foreground">
            Catatan Keuangan & Nomor Referensi Bank:
            {factorF < 1 && (
              <span className="text-red-500 font-bold ml-1">
                * (Wajib mencantumkan alasan jika alokasi f &lt; 1)
              </span>
            )}
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Contoh: Transfer kasbon via BCA Ref: TRF-2026-992. Catatan alokasi dana..."
              className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              required={factorF < 1}
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportBkkPdf(quickReviewItem)}
              className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs font-bold w-full sm:w-auto"
              title="Cetak Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Resmi"
            >
              <Printer className="size-3.5" /> Cetak BKK
            </Button>
            {quickReviewItem.status === "DISETUJUI_KAPRODI" ||
            quickReviewItem.status === "DIVERIFIKASI_KOORD" ? (
              <Button
                onClick={() =>
                  updateStatus(
                    quickReviewItem.id,
                    quickReviewItem.alur === "B" ? "SEDANG_DIBELANJAKAN" : "DANA_DICAIRKAN",
                    decisionNote || `Dana kasbon ditransfer dengan faktor alokasi f=${factorF}.`,
                    {
                      danaDiterima: finalTransferAmount,
                      nominalTransfer: finalTransferAmount,
                      faktorF: factorF,
                      catatanAlokasi: decisionNote,
                    },
                  )
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md w-full sm:w-auto"
              >
                <Wallet className="size-4" /> Cairkan Kasbon ({money(finalTransferAmount)})
              </Button>
            ) : (
              <Button
                onClick={() =>
                  updateStatus(
                    quickReviewItem.id,
                    "SELESAI",
                    decisionNote || "Laporan belanja & bon telah diverifikasi.",
                  )
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md w-full sm:w-auto"
              >
                <Check className="size-4" /> Verifikasi Laporan Belanja & Selesai
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
