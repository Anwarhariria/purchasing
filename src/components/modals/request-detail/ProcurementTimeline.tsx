import React from "react";
import {
  Clock,
  CheckCircle2,
  FileCheck2,
  Wallet,
  ShoppingBag,
  FileSpreadsheet,
  CheckCheck,
  XCircle,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { ProcurementActivityLog, RequestItem } from "@/types/procurement";

interface ProcurementTimelineProps {
  activityLogs?: ProcurementActivityLog[] | undefined;
  activeRequest: RequestItem;
}

export const ProcurementTimeline: React.FC<ProcurementTimelineProps> = ({
  activityLogs,
  activeRequest,
}) => {
  // Bangun timeline items. Jika logs dari backend kosong, bentuk rekonstruksi jejak audit berbasis status
  const logsToRender: ProcurementActivityLog[] = React.useMemo(() => {
    if (activityLogs && activityLogs.length > 0) {
      return [...activityLogs].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || "").getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || "").getTime() || 0;
        return timeA - timeB;
      });
    }

    const isAlurB = activeRequest.alur === "B";
    const pemohonRole = isAlurB ? "Staf Unit" : "Asdos Kitchen";
    const koordRole = isAlurB ? "Koordinator Unit" : "Koordinator Lab";
    const keuanganRole = isAlurB ? "Keuangan Umum" : "Keuangan Kitchen";

    // Rekonstruksi jejak audit fallback untuk data sampel
    const fallbackLogs: ProcurementActivityLog[] = [
      {
        id: "log-1",
        action: "Pengajuan Dibuat",
        actorName: activeRequest.applicant,
        actorRole: pemohonRole,
        statusFrom: null,
        statusTo: "DIAJUKAN",
        notes: activeRequest.purpose || "Pengajuan kebutuhan diajukan oleh pemohon.",
        createdAt: activeRequest.date,
      },
    ];

    const current = activeRequest.status;
    const stages =
      activeRequest.alur === "B"
        ? ["DIAJUKAN", "DIVERIFIKASI_KOORD", "SEDANG_DIBELANJAKAN", "BARANG_DITERIMA", "SELESAI"]
        : [
            "DIAJUKAN",
            "DIVERIFIKASI_KOORD",
            "DISETUJUI_KAPRODI",
            "DANA_DICAIRKAN",
            "BARANG_DITERIMA",
            "LAPORAN_BELANJA_DIAJUKAN",
            "SELESAI",
          ];

    const idx = stages.indexOf(current);

    if (activeRequest.alur === "B") {
      if (idx >= 1) {
        fallbackLogs.push({
          id: "log-2",
          action: "Diverifikasi Koordinator Unit",
          actorName: "Koordinator Unit",
          actorRole: koordRole,
          statusFrom: "DIAJUKAN",
          statusTo: "DIVERIFIKASI_KOORD",
          notes: "Kebutuhan unit kerja telah diverifikasi dan diajukan ke Keuangan Umum.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 2) {
        fallbackLogs.push({
          id: "log-3",
          action: "Proses Belanja Logistik",
          actorName: "Keuangan Umum",
          actorRole: keuanganRole,
          statusFrom: "DIVERIFIKASI_KOORD",
          statusTo: "SEDANG_DIBELANJAKAN",
          notes: "Pengadaan disetujui Keuangan Umum dan sedang dibelanjakan.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 3) {
        fallbackLogs.push({
          id: "log-4",
          action: "Barang Diterima Pemohon",
          actorName: activeRequest.applicant,
          actorRole: pemohonRole,
          statusFrom: "SEDANG_DIBELANJAKAN",
          statusTo: "BARANG_DITERIMA",
          notes: "Barang logistik telah sampai dan diterima unit pemohon.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 4) {
        fallbackLogs.push({
          id: "log-5",
          action: "Transaksi Selesai",
          actorName: "Keuangan Umum",
          actorRole: keuanganRole,
          statusFrom: "BARANG_DITERIMA",
          statusTo: "SELESAI",
          notes: "Bon belanja telah diinput dan pengadaan unit resmi ditutup.",
          createdAt: activeRequest.date,
        });
      }
    } else {
      if (idx >= 1) {
        fallbackLogs.push({
          id: "log-2",
          action: "Diverifikasi Koordinator Lab",
          actorName: "Chef Hendra, M.Par",
          actorRole: koordRole,
          statusFrom: "DIAJUKAN",
          statusTo: "DIVERIFIKASI_KOORD",
          notes: "Standar porsi dan alokasi stok lab diverifikasi.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 2) {
        fallbackLogs.push({
          id: "log-3",
          action: "Disetujui Kaprodi",
          actorName: "Dr. Ir. Rina Kusuma, M.Sc",
          actorRole: "Kaprodi",
          statusFrom: "DIVERIFIKASI_KOORD",
          statusTo: "DISETUJUI_KAPRODI",
          notes: "Kurikulum praktikum dan kebutuhan disetujui, diteruskan ke Keuangan.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 3) {
        fallbackLogs.push({
          id: "log-4",
          action: "Dana Dicairkan",
          actorName: "Ratna Sari",
          actorRole: keuanganRole,
          statusFrom: "DISETUJUI_KAPRODI",
          statusTo: "DANA_DICAIRKAN",
          notes: "Dana pengadaan telah ditransfer ke rekening Asdos.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 4) {
        fallbackLogs.push({
          id: "log-5",
          action: "Barang Diterima & Belanja",
          actorName: activeRequest.applicant,
          actorRole: pemohonRole,
          statusFrom: "DANA_DICAIRKAN",
          statusTo: "BARANG_DITERIMA",
          notes: "Bahan praktik masakan telah dibeli dan diterima.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 5) {
        fallbackLogs.push({
          id: "log-6",
          action: "Laporan Belanja & Bon Diajukan",
          actorName: activeRequest.applicant,
          actorRole: pemohonRole,
          statusFrom: "BARANG_DITERIMA",
          statusTo: "LAPORAN_BELANJA_DIAJUKAN",
          notes: activeRequest.note || "Foto bon belanja dan rekonsiliasi kas belanja diajukan.",
          createdAt: activeRequest.date,
        });
      }
      if (idx >= 6) {
        fallbackLogs.push({
          id: "log-7",
          action: "Transaksi Selesai & Ditutup",
          actorName: "Ratna Sari",
          actorRole: keuanganRole,
          statusFrom: "LAPORAN_BELANJA_DIAJUKAN",
          statusTo: "SELESAI",
          notes: "Laporan belanja diverifikasi resmi dan transaksi kasbon ditutup.",
          createdAt: activeRequest.date,
        });
      }
    }

    if (
      current === "DITOLAK_KOORD" ||
      current === "DITOLAK_KAPRODI" ||
      current === "DITOLAK_KEUANGAN"
    ) {
      fallbackLogs.push({
        id: "log-reject",
        action: "Pengajuan Ditolak",
        actorName: "Reviewer Sistem",
        actorRole: koordRole,
        statusFrom: "DIAJUKAN",
        statusTo: current,
        notes:
          activeRequest.rejectionReason ||
          activeRequest.rejection_reason ||
          activeRequest.note ||
          "Pengajuan ditolak dengan catatan perbaikan.",
        createdAt: activeRequest.date,
      });
    }

    return fallbackLogs;
  }, [activityLogs, activeRequest]);

  const getLogIcon = (action: string, statusTo: string) => {
    if (
      statusTo.startsWith("DITOLAK") ||
      statusTo === "Ditolak" ||
      action.toLowerCase().includes("tolak")
    ) {
      return <XCircle className="size-4 text-red-600 dark:text-red-400" />;
    }
    if (statusTo === "SELESAI" || statusTo === "Selesai") {
      return <CheckCheck className="size-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (
      statusTo === "DANA_DICAIRKAN" ||
      statusTo === "Dana Dicairkan" ||
      action.toLowerCase().includes("dana")
    ) {
      return <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (statusTo === "DISETUJUI_KAPRODI" || statusTo === "Disetujui Kaprodi") {
      return <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />;
    }
    if (statusTo === "DIVERIFIKASI_KOORD" || statusTo === "Diverifikasi Koordinator") {
      return <FileCheck2 className="size-4 text-indigo-600 dark:text-indigo-400" />;
    }
    if (statusTo === "LAPORAN_BELANJA_DIAJUKAN" || statusTo === "Laporan Belanja Diajukan") {
      return <FileSpreadsheet className="size-4 text-amber-600 dark:text-amber-400" />;
    }
    if (
      statusTo === "SEDANG_DIBELANJAKAN" ||
      statusTo === "Proses Pembelian" ||
      statusTo === "BARANG_DITERIMA"
    ) {
      return <ShoppingBag className="size-4 text-sky-600 dark:text-sky-400" />;
    }
    return <CheckCircle2 className="size-4 text-primary" />;
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "Asdos Kitchen":
      case "Asdos":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Staf Unit":
      case "Staf":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Koordinator Lab":
      case "Koordinator Unit":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Kaprodi":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Keuangan Kitchen":
      case "Keuangan Umum":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Super Admin":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "Sistem":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Jejak Waktu Aktivitas &amp; Audit Trail
          </h4>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
          {logsToRender.length} Aktivitas Tercatat
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
        {logsToRender.map((log, index) => {
          const isReject = log.statusTo === "Ditolak" || log.action.toLowerCase().includes("tolak");
          const isLatest = index === logsToRender.length - 1;

          return (
            <div key={log.id || index} className="relative group">
              {/* Dot Icon marker */}
              <span
                className={`absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full border bg-background shadow-xs transition-transform group-hover:scale-110 ${
                  isReject
                    ? "border-red-500 bg-red-50 dark:bg-red-950"
                    : isLatest
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border"
                }`}
              >
                {getLogIcon(log.action, log.statusTo)}
              </span>

              <div className="space-y-1">
                {/* Header: Action & Time */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isReject ? "text-red-600 dark:text-red-400 font-black" : "text-foreground"
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {log.createdAt || log.created_at || "Baru saja"}
                  </span>
                </div>

                {/* Actor & Role Badge */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-foreground/90">
                    <User className="size-3 text-muted-foreground" />
                    {log.actorName || log.actor_name || "Pengguna Sistem"}
                  </span>
                  {(log.actorRole || log.actor_role) && (
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${getRoleBadgeClass(
                        log.actorRole || log.actor_role,
                      )}`}
                    >
                      {log.actorRole || log.actor_role}
                    </span>
                  )}
                  {log.statusFrom && log.statusTo && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="font-medium">{log.statusFrom}</span>
                      <ArrowRight className="size-2.5 opacity-60" />
                      <span className="font-bold text-foreground">{log.statusTo}</span>
                    </span>
                  )}
                </div>

                {/* Notes box */}
                {log.notes && (
                  <div
                    className={`mt-1.5 rounded-md p-2.5 text-xs font-normal border ${
                      isReject
                        ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 font-medium"
                        : "border-border/60 bg-surface text-muted-foreground"
                    }`}
                  >
                    <p className="leading-relaxed">
                      {isReject && (
                        <strong className="text-red-600 dark:text-red-400 mr-1">
                          Alasan Penolakan:
                        </strong>
                      )}
                      {log.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
