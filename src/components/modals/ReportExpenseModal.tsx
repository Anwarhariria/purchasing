import React from "react";
import { Receipt, CheckCircle2, Clock3, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/algorithms/saw";
import type { RequestItem } from "@/types/procurement";

interface ReportExpenseModalProps {
  reportingRequestId: string | null;
  onClose: () => void;
  requests: RequestItem[];
  reportSpentAmount: number;
  setReportSpentAmount: (val: number) => void;
  reportReceiptImg: string | null;
  setReportReceiptImg: (val: string | null) => void;
  handleReportExpense: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ReportExpenseModal: React.FC<ReportExpenseModalProps> = ({
  reportingRequestId,
  onClose,
  requests,
  reportSpentAmount,
  setReportSpentAmount,
  reportReceiptImg,
  setReportReceiptImg,
  handleReportExpense,
}) => {
  if (!reportingRequestId) return null;

  const reportingItem = requests.find((r) => r.id === reportingRequestId);
  if (!reportingItem) return null;

  const disbursed = reportingItem.disbursedAmount || reportingItem.price;
  const diff = disbursed - reportSpentAmount;
  const isRefund = diff > 0;
  const isDeficit = diff < 0;

  return (
    <Dialog open={Boolean(reportingRequestId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-lg overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Receipt className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                Laporan Belanja & Nota Bon (Asdos)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pengajuan LPJ untuk {reportingItem.id} ({reportingItem.menu || reportingItem.item})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleReportExpense} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <div className="rounded-lg bg-surface p-3.5 border border-border/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dana Ditransfer Keuangan:</span>
              <span className="font-extrabold text-foreground">{money(disbursed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mata Kuliah / Menu:</span>
              <span className="font-bold text-foreground">
                {reportingItem.menu || reportingItem.item}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Total Belanja Riil Sesuai Nota/Bon (Rp) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              required
              min="1000"
              step="500"
              value={reportSpentAmount || ""}
              onChange={(e) => setReportSpentAmount(Number(e.target.value))}
              placeholder="Masukkan total belanja fisik di pasar/toko..."
              className="h-10 text-xs font-bold text-foreground"
            />
          </div>

          {/* Kalkulasi Selisih Uang Otomatis */}
          {reportSpentAmount > 0 && (
            <div className="rounded-lg border p-3 text-xs space-y-1">
              {isRefund && (
                <div className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Sisa Uang Kembalian Belanja: {money(diff)}
                  </p>
                  <p className="text-[11px] mt-1 text-emerald-700 dark:text-emerald-400">
                    Sesuai aturan sistem, <strong>uang kembalian tetap dipegang oleh Asdos</strong> untuk kas cadangan belanja praktikum berikutnya.
                  </p>
                </div>
              )}
              {isDeficit && (
                <div className="text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-md border border-rose-200 dark:border-rose-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock3 className="size-4 text-rose-600" />
                    Kekurangan Uang Belanja: {money(Math.abs(diff))}
                  </p>
                  <p className="text-[11px] mt-1 text-rose-700 dark:text-rose-400">
                    Kekurangan dana ini akan dilaporkan ke Bagian Keuangan agar <strong>Keuangan dapat mengganti (reimburse)</strong> ke rekening Asdos.
                  </p>
                </div>
              )}
              {!isRefund && !isDeficit && (
                <div className="text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-md border border-blue-200">
                  <p className="font-bold">
                    Total belanja pas dengan dana yang ditransfer ({money(disbursed)}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Foto Bon/Nota */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Unggah Foto Bon / Nota Belanja <span className="text-red-500">*</span>
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setReportReceiptImg(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="h-9 text-xs"
            />
            {reportReceiptImg && (
              <div className="mt-2">
                <span className="text-[10px] text-muted-foreground block mb-1">
                  Pratinjau Foto Bon:
                </span>
                <img
                  src={reportReceiptImg}
                  alt="Preview Bon"
                  className="h-28 w-40 object-cover rounded-md border border-border shadow-xs"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md w-full sm:w-auto"
            >
              <Send className="size-4" /> Kirim Laporan ke Keuangan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
