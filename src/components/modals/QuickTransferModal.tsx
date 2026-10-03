import React from "react";
import { Wallet, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/algorithms/saw";
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
    extraFields?: Partial<RequestItem>
  ) => void;
}

export const QuickTransferModal: React.FC<QuickTransferModalProps> = ({
  quickReviewItem,
  onClose,
  decisionNote,
  setDecisionNote,
  updateStatus,
}) => {
  if (!quickReviewItem) return null;

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
                {quickReviewItem.status === "Disetujui Kaprodi"
                  ? "Transfer & Pencairan Dana ke Asdos"
                  : "Verifikasi LPJ Belanja & Bon"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {quickReviewItem.status === "Disetujui Kaprodi"
                  ? `Validasi alokasi & transfer dana operasional untuk ${quickReviewItem.id}`
                  : `Verifikasi kesesuaian nota belanja dan selisih kas untuk ${quickReviewItem.id}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Menu Praktik:</span>
              <span className="font-bold text-foreground">
                {quickReviewItem.menu || quickReviewItem.item}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mata Kuliah:</span>
              <span className="font-semibold text-foreground">
                {quickReviewItem.course || quickReviewItem.department}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asdos Penerima:</span>
              <span className="font-semibold text-foreground">{quickReviewItem.applicant}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tenggat Waktu:</span>
              <span className="font-semibold text-foreground">
                {quickReviewItem.deadline || quickReviewItem.needBy}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-bold">Estimasi Anggaran:</span>
              <span className="font-black text-emerald-700 dark:text-emerald-400">
                {money(quickReviewItem.price)}
              </span>
            </div>
          </div>

          <label className="block text-xs font-bold text-foreground">
            Catatan Keuangan / Nomor Bukti Transfer:
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Contoh: Dana telah ditransfer ke rekening Asdos via BCA/Mandiri Operasional Lab..."
              className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            {quickReviewItem.status === "Disetujui Kaprodi" ? (
              <Button
                onClick={() =>
                  updateStatus(
                    quickReviewItem.id,
                    "Dana Dicairkan",
                    decisionNote || "Dana telah ditransfer ke Asdos.",
                    { disbursedAmount: quickReviewItem.price }
                  )
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md w-full sm:w-auto"
              >
                <Wallet className="size-4" /> Transfer Dana ke Asdos (
                {money(quickReviewItem.price)})
              </Button>
            ) : (
              <Button
                onClick={() =>
                  updateStatus(
                    quickReviewItem.id,
                    "Selesai",
                    decisionNote || "LPJ belanja & bon telah diverifikasi.",
                    { reimbursementStatus: "Telah Diganti" }
                  )
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md w-full sm:w-auto"
              >
                <Check className="size-4" /> Verifikasi LPJ & Tutup Selesai
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
