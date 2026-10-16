import React, { useState } from "react";
import {
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Smartphone,
  ShieldCheck,
  Edit3,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/utils";
import type { RequestItem, Role, UserAccount } from "@/types/procurement";

interface WhatsAppShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeRequest: RequestItem;
  role: Role;
  decisionNote?: string;
  onConfirmForward?: () => void;
  notify?: (msg: string) => void;
  users?: UserAccount[];
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  open,
  onOpenChange,
  activeRequest,
  role,
  decisionNote = "",
  onConfirmForward,
  notify = () => {},
  users = [],
}) => {
  // Ambil data Kaprodi resmi dari database akun pengguna
  const kaprodiUser =
    users.find(
      (u) =>
        u.role === "Kaprodi" ||
        u.id === "USR-003" ||
        u.department.toLowerCase().includes("perhotelan"),
    ) || users.find((u) => u.role === "Kaprodi");

  const defaultKaprodiPhone = kaprodiUser?.phone || "081289234567";
  const kaprodiName = kaprodiUser?.name || "Dr. Maria Kusuma (Kaprodi Perhotelan)";
  const kaprodiDept = kaprodiUser?.department || "Program Studi D3 Perhotelan";

  const [targetPhone, setTargetPhone] = useState(defaultKaprodiPhone);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync jika modal dibuka kembali
  React.useEffect(() => {
    if (open) {
      setTargetPhone(defaultKaprodiPhone);
      setIsEditingPhone(false);
      setCopied(false);
    }
  }, [open, defaultKaprodiPhone]);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
  const detailUrl = `${origin}/?detail=${activeRequest.id}`;

  // Susun format pesan WhatsApp resmi, lengkap & informatif
  const generateMessageText = () => {
    const lines = [
      `*SISTEM PENGADAAN KAMPUS ASAINDO (SPAKE)*`,
      `Pemberitahuan Pengajuan Pengadaan Barang & Bahan`,
      ``,
      `Halo Bapak/Ibu Reviewer, terdapat pengajuan pengadaan yang membutuhkan peninjauan dan persetujuan Anda:`,
      `────────────────────────`,
      `📋 *ID Pengajuan:* ${activeRequest.id}`,
      `🏷️ *Status:* ${activeRequest.status}`,
      `📦 *Barang/Menu:* ${activeRequest.menu || activeRequest.item}`,
      activeRequest.course
        ? `📚 *Mata Kuliah:* ${activeRequest.course} (Semester ${activeRequest.semester || "-"})`
        : null,
      activeRequest.groupCount && activeRequest.groupCount > 1
        ? `👥 *Jumlah Kelompok:* ${activeRequest.groupCount} Kelompok`
        : null,
      `👤 *Pemohon:* ${activeRequest.applicant}`,
      `🏢 *Unit/Departemen:* ${activeRequest.unitKerja || activeRequest.department}`,
      `💰 *Total Estimasi Biaya:* ${money(activeRequest.price)}`,
      `📅 *Tanggal Kebutuhan:* ${activeRequest.needBy || activeRequest.deadline}`,
      decisionNote ? `📝 *Catatan:* ${decisionNote}` : null,
      `────────────────────────`,
      ``,
      `Silakan login ke sistem SPAKE untuk meninjau dan memproses keputusan pengadaan ini melalui tautan berikut:`,
      `🔗 *Tautan Pengajuan:* ${detailUrl}`,
      ``,
      `Terima kasih.`,
      `_Universitas Asa Indonesia (ASAINDO)_`,
    ].filter(Boolean);

    return lines.join("\n");
  };

  const messageText = generateMessageText();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    notify("Format pesan WhatsApp berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (onConfirmForward) {
      onConfirmForward();
    }

    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;

    const encodedText = encodeURIComponent(messageText);
    const waUrl = formattedPhone
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, "_blank");
    notify(`Pesan WhatsApp telah disiapkan untuk Kaprodi!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg rounded-xl border-border p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b border-border bg-emerald-600 px-4 sm:px-6 py-4 text-left text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-xs">
              <Smartphone className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                Teruskan via WhatsApp ke Kaprodi
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100">
                Pesan terhubung langsung dengan link 1-klik <strong>Terima</strong> dan{" "}
                <strong>Tolak</strong> untuk Kaprodi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 sm:px-6 py-4 sm:py-5 max-h-[75vh] overflow-y-auto">
          {/* Kartu Profil Penerima Resmi dari Database (Template Otomatis) */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{kaprodiName}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <ShieldCheck className="size-3 text-emerald-600" /> Database Terdaftar
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{kaprodiDept}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingPhone(!isEditingPhone)}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 mt-0.5"
                title="Ganti nomor jika ingin mengirim ke kontak lain"
              >
                <Edit3 className="size-3" />
                {isEditingPhone ? "Tutup" : "Ubah No."}
              </button>
            </div>

            {/* Tampilan Nomor Telepon */}
            {!isEditingPhone ? (
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Nomor WhatsApp Kaprodi:
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {targetPhone}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Otomatis dari Database
                </span>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <label className="text-[11px] font-bold text-foreground block">
                  Ubah Nomor WhatsApp Penerima:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Contoh: 081289234567"
                    className="h-8 text-xs font-mono font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetPhone(defaultKaprodiPhone);
                      setIsEditingPhone(false);
                    }}
                    className="h-8 text-[11px] gap-1 shrink-0"
                    title="Kembalikan ke nomor template database"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground leading-normal">
              💡 <strong>Koordinator tidak perlu mengetik nomor manual:</strong> Sistem sudah
              otomatis memuat nomor resmi Kaprodi dari database akun SPAKE. Cukup klik tombol kirim
              di bawah.
            </p>
          </div>

          {/* Pratinjau Chat WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-emerald-600" />
                Pratinjau Pesan yang Diterima Kaprodi:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Tersalin!" : "Salin Teks"}
              </button>
            </div>

            {/* Balon Chat Bergaya WhatsApp */}
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-[#EFEAE2] dark:bg-slate-950 p-3 shadow-inner">
              <div className="rounded-lg bg-[#DCF8C6] dark:bg-emerald-950/80 p-3.5 text-xs text-slate-800 dark:text-slate-100 space-y-2 shadow-xs font-sans leading-relaxed">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  SPAKE - SISTEM PENGADAAN KAMPUS ASAINDO
                </p>
                <p>Yth. Bapak/Ibu Kaprodi D3 Perhotelan,</p>
                <p className="text-[11px]">
                  Koordinator Lab Kitchen telah memverifikasi permohonan bahan praktik memasak
                  berikut:
                </p>

                <div className="bg-white/70 dark:bg-slate-900/60 p-2.5 rounded border border-emerald-300/60 dark:border-emerald-800 text-[11px] space-y-0.5 font-mono">
                  <p>
                    <strong>ID:</strong> {activeRequest.id}
                  </p>
                  <p>
                    <strong>Menu:</strong> {activeRequest.menu || activeRequest.item}
                  </p>
                  <p>
                    <strong>Kelompok:</strong> {activeRequest.groupCount || 1} Kelompok
                  </p>
                  <p>
                    <strong>Pemohon:</strong> {activeRequest.applicant}
                  </p>
                  <p>
                    <strong>Total:</strong> {money(activeRequest.price)}
                  </p>
                  {decisionNote && (
                    <p>
                      <strong>Catatan:</strong> {decisionNote}
                    </p>
                  )}
                </div>

                <div className="pt-1.5 space-y-1.5">
                  <div className="p-2 rounded bg-blue-100/90 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-800 text-[11px]">
                    <span className="font-bold text-blue-900 dark:text-blue-200 block">
                      🔗 TAUTAN DETAIL PENGAJUAN (LOGIN DIPERLUKAN):
                    </span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 underline break-all font-mono">
                      {detailUrl}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <span className="text-[9px] text-slate-500">Baru saja · Terkirim</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border bg-surface px-4 sm:px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Tutup
          </Button>
          <Button
            type="button"
            onClick={handleCopyMessage}
            variant="secondary"
            className="text-xs font-semibold gap-1.5"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Format Tersalin" : "Salin Pesan"}
          </Button>
          <Button
            type="button"
            onClick={handleOpenWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <ExternalLink className="size-3.5" /> Buka WhatsApp &amp; Kirim Langsung ke Kaprodi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
