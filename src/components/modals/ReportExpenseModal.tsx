import React, { useState } from "react";
import { Receipt, CheckCircle2, Clock3, Send, Loader2, FileText, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, compressImageToDataUrl } from "@/lib/utils";
import type { RequestItem } from "@/types/procurement";

interface ReportExpenseModalProps {
  reportingRequestId: string | null;
  onClose: () => void;
  requests: RequestItem[];
  reportSpentAmount: number;
  setReportSpentAmount: (val: number) => void;
  reportReceiptImg: string | null;
  setReportReceiptImg: (val: string | null) => void;
  reportReceiptFile?: File | null;
  setReportReceiptFile?: (val: File | null) => void;
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
  reportReceiptFile,
  setReportReceiptFile,
  handleReportExpense,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);

  if (!reportingRequestId) return null;

  const reportingItem = requests.find((r) => r.id === reportingRequestId);
  if (!reportingItem) return null;

  const danaTransfer =
    reportingItem.danaDiterima || reportingItem.nominalTransfer || reportingItem.price;
  const diff = danaTransfer - reportSpentAmount;
  const isRefund = diff > 0;
  const isDeficit = diff < 0;

  return (
    <Dialog open={Boolean(reportingRequestId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-lg overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Receipt className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                Laporan Belanja & Nota Bon (Asdos)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Laporan belanja untuk {reportingItem.id} ({reportingItem.menu || reportingItem.item}
                )
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleReportExpense} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <div className="rounded-lg bg-surface p-3.5 border border-border/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dana Ditransfer Keuangan:</span>
              <span className="font-extrabold text-foreground">{money(danaTransfer)}</span>
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
                    Sesuai aturan sistem, sisa uang kembalian disetorkan ke Keuangan.
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
                    Kekurangan dana ini akan otomatis dicatat sebagai{" "}
                    <strong>carry-over tombok</strong> dan ditambahkan ke pencairan kasbon
                    berikutnya.
                  </p>
                </div>
              )}
              {!isRefund && !isDeficit && (
                <div className="text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-md border border-blue-200">
                  <p className="font-bold">
                    Total belanja pas dengan dana yang ditransfer ({money(danaTransfer)}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Foto Bon/Nota atau Dokumen PDF */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Unggah Foto Bon / Dokumen Nota Belanja (JPG/PNG/PDF){" "}
              <span className="text-red-500">* (Wajib)</span>
            </label>
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf,image/*"
              disabled={isCompressing}
              required={
                !reportReceiptFile &&
                !reportReceiptImg &&
                (!reportingItem.receiptImages || reportingItem.receiptImages.length === 0)
              }
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const isPdf =
                    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                  const isImage =
                    file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

                  if (!isPdf && !isImage) {
                    alert(
                      "Format file tidak didukung! Harap unggah foto bon (JPG, PNG, WEBP) atau dokumen PDF.",
                    );
                    e.target.value = "";
                    return;
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    alert("Ukuran file maksimal 5 MB.");
                    e.target.value = "";
                    return;
                  }

                  setReportReceiptFile?.(file);
                  try {
                    const objectUrl = URL.createObjectURL(file);
                    setReportReceiptImg(objectUrl);
                  } catch {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setReportReceiptImg(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }
              }}
              className="h-9 text-xs cursor-pointer"
            />
            {isCompressing && (
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Mengompresi foto nota belanja (&lt; 800 KB)...</span>
              </div>
            )}

            {/* Preview Section */}
            {reportReceiptImg ? (
              <div className="mt-2.5 space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  Pratinjau Bukti Belanja Terlampir:
                </span>
                {reportReceiptImg.startsWith("data:application/pdf") ||
                reportReceiptImg.toLowerCase().includes(".pdf") ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-md bg-rose-600 text-white shadow-xs">
                          <FileText className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Dokumen Faktur / Bon PDF
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Format PDF resmi toko/vendor
                          </p>
                        </div>
                      </div>
                      <a
                        href={reportReceiptImg}
                        target="_blank"
                        rel="noreferrer"
                        download="Nota_Belanja.pdf"
                        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-rose-700 cursor-pointer"
                        title="Buka dokumen PDF di tab baru atau unduh"
                      >
                        <ExternalLink className="size-3" /> Buka / Unduh PDF
                      </a>
                    </div>
                    <iframe
                      src={reportReceiptImg}
                      className="h-44 w-full rounded-md border border-rose-200 dark:border-rose-900/50 bg-white"
                      title="Pratinjau Dokumen PDF Nota"
                    />
                  </div>
                ) : (
                  <img
                    src={reportReceiptImg}
                    alt="Preview Bon"
                    className="h-28 w-40 object-cover rounded-md border border-border shadow-xs"
                  />
                )}
              </div>
            ) : reportingItem.receiptImages && reportingItem.receiptImages.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  Bukti Bon Tersimpan Sebelumnya:
                </span>
                {reportingItem.receiptImages[0]?.startsWith("data:application/pdf") ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-rose-600" />
                      <span className="text-xs font-bold">Faktur Belanja (PDF)</span>
                    </div>
                    <a
                      href={reportingItem.receiptImages[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      <ExternalLink className="size-3" /> Buka
                    </a>
                  </div>
                ) : (
                  <img
                    src={reportingItem.receiptImages[0]}
                    alt="Bon Tersimpan"
                    className="h-28 w-40 object-cover rounded-md border border-border shadow-xs"
                  />
                )}
              </div>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                * Foto fisik bon atau dokumen PDF wajib dilampirkan agar laporan belanja dapat
                diajukan ke Keuangan.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isCompressing}
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                isCompressing ||
                (!reportReceiptImg &&
                  (!reportingItem.receiptImages || reportingItem.receiptImages.length === 0))
              }
              className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md w-full sm:w-auto cursor-pointer"
              title={
                !reportReceiptImg &&
                (!reportingItem.receiptImages || reportingItem.receiptImages.length === 0)
                  ? "Wajib unggah foto bon belanja terlebih dahulu"
                  : "Kirim Laporan ke Keuangan"
              }
            >
              {isCompressing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Kirim Laporan ke Keuangan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
