import React, { useState } from "react";
import { AlertTriangle, X, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RequestItem, Role } from "@/types/procurement";

interface RejectRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRequest: RequestItem | null;
  role: Role;
  onConfirmReject: (reason: string) => void;
}

export const RejectRequestModal: React.FC<RejectRequestModalProps> = ({
  open,
  onOpenChange,
  targetRequest,
  role,
  onConfirmReject,
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorText, setErrorText] = useState("");

  if (!targetRequest) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setErrorText(
        "Alasan penolakan wajib diisi agar pemohon (Asdos) mengetahui kendala pengajuan.",
      );
      return;
    }
    setErrorText("");
    onConfirmReject(trimmed);
    setRejectionReason("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setErrorText("");
    setRejectionReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleCancel() : onOpenChange(o))}>
      <DialogContent className="max-w-md rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-destructive/10 px-5 py-4 text-left">
          <div className="flex items-center gap-2.5 text-destructive">
            <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/15">
              <Ban className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                Konfirmasi Penolakan Pengajuan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tindakan oleh {role} untuk ID:{" "}
                <strong className="font-mono text-foreground">{targetRequest.id}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              Menu:{" "}
              <span className="font-bold text-destructive">
                {targetRequest.menu || targetRequest.item}
              </span>
            </p>
            <p className="text-[11px] mt-0.5">
              Pemohon: {targetRequest.applicant} ({targetRequest.department})
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Alasan Penolakan <span className="text-destructive">* (Wajib Diisi)</span>
            </label>
            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (errorText) setErrorText("");
              }}
              placeholder="Contoh: Jumlah porsi daging melebihi standar kurikulum praktikum minggu ini, silakan sesuaikan kuantitas..."
              className="w-full rounded-md border border-input bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-destructive/30 resize-none font-normal"
            />
            {errorText ? (
              <p className="mt-1 text-[11px] font-bold text-destructive">{errorText}</p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                * Catatan alasan penolakan ini akan muncul di dashboard &amp; banner Asdos sebagai
                acuan revisi.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!rejectionReason.trim()}
              className="w-full sm:w-auto h-9 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="size-3.5" />
              Tolak Pengajuan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
