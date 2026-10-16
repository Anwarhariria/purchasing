import React, { useState } from "react";
import { Receipt, FileText, ExternalLink, Download, Eye, X } from "lucide-react";
import { money } from "@/lib/utils";
import type { RequestItem } from "@/types/procurement";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RequestLpjSectionProps {
  activeRequest: RequestItem;
}

export const RequestLpjSection: React.FC<RequestLpjSectionProps> = ({ activeRequest }) => {
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    isPdf: boolean;
    title: string;
  } | null>(null);

  if (
    activeRequest.status !== "LAPORAN_BELANJA_DIAJUKAN" &&
    activeRequest.status !== "SELESAI" &&
    !activeRequest.actualSpent
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
        <Receipt className="size-4 text-primary" />
        Laporan Belanja & Rekonsiliasi Kas Belanja:
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-surface p-3 rounded-lg border border-border/80">
        <div>
          <span className="text-muted-foreground">Dana Ditransfer</span>
          <p className="mt-0.5 font-extrabold text-foreground">
            {money(
              activeRequest.danaDiterima || activeRequest.nominalTransfer || activeRequest.price,
            )}
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
          <strong>Sisa Kembalian:</strong> {money(activeRequest.refundAmount)}. Sesuai aturan, dana
          kembalian disetorkan ke Keuangan.
        </div>
      ) : null}

      {activeRequest.deficitAmount && activeRequest.deficitAmount > 0 ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          <strong>Kekurangan Dana Belanja (Tombok):</strong> {money(activeRequest.deficitAmount)}.
          Otomatis di-carry-over ke pencairan kasbon berikutnya.
        </div>
      ) : null}

      {/* Receipt image / PDF thumbnails */}
      {activeRequest.receiptImages && activeRequest.receiptImages.length > 0 && (
        <div className="mt-2">
          <span className="text-[11px] font-bold text-muted-foreground block mb-1">
            Foto Bukti Bon / Dokumen Nota Belanja:
          </span>
          <div className="flex flex-wrap gap-2">
            {activeRequest.receiptImages.map((img, idx) => {
              const isPdf =
                img.startsWith("data:application/pdf") || img.toLowerCase().includes(".pdf");
              return isPdf ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setPreviewFile({
                      url: img,
                      isPdf: true,
                      title: `Dokumen Faktur / Bon PDF #${idx + 1}`,
                    })
                  }
                  className="flex h-20 w-36 flex-col items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50/80 p-2 text-center text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs transition-all cursor-pointer"
                  title="Klik untuk pratinjau dokumen PDF bon belanja"
                >
                  <FileText className="size-6 text-rose-600 dark:text-rose-400" />
                  <span className="text-[10px] font-bold">Faktur / Bon PDF</span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Eye className="size-2.5" /> Pratinjau Modal
                  </span>
                </button>
              ) : (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setPreviewFile({
                      url: img,
                      isPdf: false,
                      title: `Foto Nota Belanja #${idx + 1}`,
                    })
                  }
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-border shadow-2xs"
                  title="Klik untuk pratinjau foto nota belanja"
                >
                  <img
                    src={img}
                    alt={`Bon ${idx + 1}`}
                    className="h-20 w-28 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    <Eye className="size-3 mr-1" /> Lihat
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Preview Bukti Bon (PDF / Gambar) */}
      <Dialog open={Boolean(previewFile)} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-3xl overflow-hidden rounded-xl border-border p-0 shadow-2xl">
          <DialogHeader className="border-b border-border bg-surface px-4 py-3 sm:px-6 flex flex-row items-center justify-between text-left">
            <div>
              <DialogTitle className="text-sm font-black text-foreground flex items-center gap-2">
                {previewFile?.isPdf ? (
                  <FileText className="size-4 text-rose-600" />
                ) : (
                  <Receipt className="size-4 text-primary" />
                )}
                {previewFile?.title || "Pratinjau Bukti Belanja"}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Pengadaan: {activeRequest.id} · {activeRequest.menu || activeRequest.item}
              </p>
            </div>
            {previewFile && (
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  download={previewFile.isPdf ? "Nota_Belanja.pdf" : "Nota_Belanja.png"}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                  title="Buka dokumen di tab baru atau unduh"
                >
                  <ExternalLink className="size-3" /> Buka di Tab Baru / Download
                </a>
              </div>
            )}
          </DialogHeader>

          <div className="p-4 sm:p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[50vh]">
            {previewFile?.isPdf ? (
              <iframe
                src={previewFile.url}
                className="h-[65vh] w-full rounded-lg border border-border bg-white shadow-sm"
                title="Pratinjau Dokumen PDF Nota"
              />
            ) : previewFile ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={previewFile.url}
                  alt="Pratinjau Nota Belanja"
                  className="max-h-[65vh] w-auto max-w-full rounded-lg border border-border object-contain shadow-sm"
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
