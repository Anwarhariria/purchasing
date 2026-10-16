import { MetricCard } from "@/components/common/MetricCard";
import { AnimatedValue } from "@/components/common/AnimatedValue";
import {
  ClipboardList,
  Clock3,
  ShoppingBag,
  PackageCheck,
  Layers,
  ClipboardCheck,
  Activity,
  Award,
  Wallet,
  CheckCircle2,
  Users,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { money } from "@/lib/utils";
import {
  SIKLUS_TAHAPAN,
  type Role,
  type RequestItem,
  isPemohon,
  isKoordinator,
  isKeuangan,
} from "@/types/procurement";

export interface RoleMetrics {
  total: number;
  waiting: number;
  inProcess: number;
  done: number;
  needReview: number;
  needApprove: number;
  needTransfer: number;
  needLpjVerify: number;
  totalEst: number;
  totalTransfer: number;
  usersCount: number;
  activeProc: number;
}

interface RoleKpiCardsProps {
  role: Role;
  roleMetrics: RoleMetrics;
  requests: RequestItem[];
  workflow?: "A" | "B";
}

export function RoleKpiCards({ role, roleMetrics, requests, workflow = "A" }: RoleKpiCardsProps) {
  return (
    <>
      <div key={`${role}-${workflow}`} className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isPemohon(role) && (
          <>
            <MetricCard
              label={workflow === "B" ? "Total Pengajuan Logistik Unit" : "Total Pengajuan Bahan"}
              value={String(roleMetrics.total).padStart(2, "0")}
              icon={ClipboardList}
              kind="primary"
              className="animate-slide-up-fade stagger-1"
            />
            <MetricCard
              label={
                workflow === "B" ? "Menunggu Verifikasi Koordinator" : "Menunggu ACC (Koor/Kaprodi)"
              }
              value={String(roleMetrics.waiting).padStart(2, "0")}
              icon={Clock3}
              kind="warning"
              className="animate-slide-up-fade stagger-2"
            />
            <MetricCard
              label={
                workflow === "B" ? "Sedang Dibelanjakan (Sarpras)" : "Siap / Sedang Dibelanjakan"
              }
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              icon={ShoppingBag}
              kind="info"
              className="animate-slide-up-fade stagger-3"
            />
            <MetricCard
              label={workflow === "B" ? "Logistik Selesai Diterima" : "Praktik Selesai"}
              value={String(roleMetrics.done).padStart(2, "0")}
              icon={PackageCheck}
              kind="success"
              className="animate-slide-up-fade stagger-4"
            />
          </>
        )}

        {isKoordinator(role) && (
          <>
            <MetricCard
              label="Total Pengajuan Masuk"
              value={String(roleMetrics.total).padStart(2, "0")}
              icon={Layers}
              kind="primary"
              className="animate-slide-up-fade stagger-1"
            />
            <MetricCard
              label="Perlu Verifikasi Qty"
              value={String(roleMetrics.needReview).padStart(2, "0")}
              icon={ClipboardCheck}
              kind="warning"
              className="animate-slide-up-fade stagger-2"
            />
            <MetricCard
              label="Dalam Proses Lanjutan"
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              icon={Activity}
              kind="info"
              className="animate-slide-up-fade stagger-3"
            />
            <MetricCard
              label="Selesai Dipertanggungjawabkan"
              value={String(roleMetrics.done).padStart(2, "0")}
              icon={PackageCheck}
              kind="success"
              className="animate-slide-up-fade stagger-4"
            />
          </>
        )}

        {role === "Kaprodi" && (
          <>
            <MetricCard
              label="Total Pengajuan Kurikulum"
              value={String(roleMetrics.total).padStart(2, "0")}
              icon={Award}
              kind="primary"
              className="animate-slide-up-fade stagger-1"
            />
            <MetricCard
              label="Menunggu Persetujuan Kaprodi"
              value={String(roleMetrics.needApprove).padStart(2, "0")}
              icon={Clock3}
              kind="warning"
              className="animate-slide-up-fade stagger-2"
            />
            <MetricCard
              label="Disetujui & Dijalankan"
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              icon={ShoppingBag}
              kind="info"
              className="animate-slide-up-fade stagger-3"
            />
            <MetricCard
              label="Siklus Selesai"
              value={String(roleMetrics.done).padStart(2, "0")}
              icon={PackageCheck}
              kind="success"
              className="animate-slide-up-fade stagger-4"
            />
          </>
        )}

        {isKeuangan(role) && (
          <>
            <MetricCard
              label="Total Estimasi Diajukan"
              value={money(roleMetrics.totalEst)}
              icon={Wallet}
              kind="primary"
              className="animate-slide-up-fade stagger-1"
            />
            <MetricCard
              label="Perlu Transfer ke Asdos"
              value={String(roleMetrics.needTransfer).padStart(2, "0")}
              icon={Clock3}
              kind="danger"
              className="animate-slide-up-fade stagger-2"
            />
            <MetricCard
              label="Perlu Verifikasi Laporan Belanja"
              value={String(roleMetrics.needLpjVerify).padStart(2, "0")}
              icon={ClipboardList}
              kind="warning"
              className="animate-slide-up-fade stagger-3"
            />
            <MetricCard
              label="Total Dana Ditransfer"
              value={money(roleMetrics.totalTransfer)}
              icon={CheckCircle2}
              kind="success"
              className="animate-slide-up-fade stagger-4"
            />
          </>
        )}

        {role === "Super Admin" && (
          <>
            <MetricCard
              label="Master Pengajuan"
              value={String(roleMetrics.total).padStart(2, "0")}
              icon={ClipboardList}
              kind="primary"
              className="animate-slide-up-fade stagger-1"
            />
            <MetricCard
              label="Pengguna Terdaftar"
              value={String(roleMetrics.usersCount).padStart(2, "0")}
              icon={Users}
              kind="info"
              className="animate-slide-up-fade stagger-2"
            />
            <MetricCard
              label="Belanja Aktif"
              value={String(roleMetrics.activeProc).padStart(2, "0")}
              icon={Activity}
              kind="warning"
              className="animate-slide-up-fade stagger-3"
            />
            <MetricCard
              label="Siklus Selesai"
              value={String(roleMetrics.done).padStart(2, "0")}
              icon={ShieldCheck}
              kind="success"
              className="animate-slide-up-fade stagger-4"
            />
          </>
        )}
      </div>

      {/* SUPER ADMIN 6-STEP CYCLE MONITOR */}
      {role === "Super Admin" && (
        <div className="animate-slide-up-fade stagger-5 mb-7 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-foreground">
                <Sliders className="size-4 text-primary" />
                Monitoring 6 Tahapan Siklus Pengadaan Kampus ASAINDO
              </h3>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">
              Total {requests.length} Permohonan Tercatat
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {SIKLUS_TAHAPAN.map((tahap, idx) => {
              const count = requests.filter((r) => r.status === tahap).length;
              return (
                <div
                  key={tahap}
                  className="rounded-lg border border-border/70 bg-surface p-3 text-center transition-all hover:border-primary/50"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                    <span>Tahap {idx + 1}</span>
                    <span className="font-extrabold text-foreground">
                      <AnimatedValue value={`${count} PR`} showIndicator={false} />
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-1 truncate" title={tahap}>
                    {tahap}
                  </p>
                  <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-700 ease-out"
                      style={{ width: `${requests.length ? (count / requests.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
