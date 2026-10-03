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
import { money } from "@/lib/algorithms/saw";
import { SIKLUS_TAHAPAN, type Role, type RequestItem } from "@/types/procurement";

export interface RoleMetrics {
  total: number;
  waiting: number;
  inProcess: number;
  done: number;
  needReview: number;
  needApprove: number;
  needDisbursement: number;
  needLpjVerify: number;
  totalEst: number;
  totalDisbursed: number;
  usersCount: number;
  activeProc: number;
}

interface RoleKpiCardsProps {
  role: Role;
  roleMetrics: RoleMetrics;
  requests: RequestItem[];
}

export function RoleKpiCards({ role, roleMetrics, requests }: RoleKpiCardsProps) {
  return (
    <>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role === "Staf / Asdos" && (
          <>
            <MetricCard
              label="Total Pengajuan Bahan"
              value={String(roleMetrics.total).padStart(2, "0")}
              foot="Seluruh menu praktik diajukan"
              icon={ClipboardList}
              kind="primary"
            />
            <MetricCard
              label="Menunggu ACC (Koor/Kaprodi)"
              value={String(roleMetrics.waiting).padStart(2, "0")}
              foot="Dalam proses verifikasi resep"
              icon={Clock3}
              trend="Dalam antrean"
              kind="warning"
            />
            <MetricCard
              label="Siap / Sedang Dibelanjakan"
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              foot="Dana cair / proses belanja"
              icon={ShoppingBag}
              kind="info"
            />
            <MetricCard
              label="Praktik Selesai"
              value={String(roleMetrics.done).padStart(2, "0")}
              foot="LPJ & bon diverifikasi tuntas"
              icon={PackageCheck}
              trend="Transaksi tuntas"
              kind="success"
            />
          </>
        )}

        {role === "Koordinator" && (
          <>
            <MetricCard
              label="Total Pengajuan Masuk"
              value={String(roleMetrics.total).padStart(2, "0")}
              foot="Pengajuan bahan dapur masak"
              icon={Layers}
              kind="primary"
            />
            <MetricCard
              label="Perlu Verifikasi Qty"
              value={String(roleMetrics.needReview).padStart(2, "0")}
              foot="Cek takaran & edit kuantitas"
              icon={ClipboardCheck}
              trend="Perlu ditinjau"
              kind="warning"
            />
            <MetricCard
              label="Dalam Proses Lanjutan"
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              foot="Di Kaprodi / Keuangan / Belanja"
              icon={Activity}
              kind="info"
            />
            <MetricCard
              label="Selesai Dipertanggungjawabkan"
              value={String(roleMetrics.done).padStart(2, "0")}
              foot="Bahan terpakai & nota tuntas"
              icon={PackageCheck}
              trend="Selesai"
              kind="success"
            />
          </>
        )}

        {role === "Kaprodi" && (
          <>
            <MetricCard
              label="Total Pengajuan Kurikulum"
              value={String(roleMetrics.total).padStart(2, "0")}
              foot="Mata kuliah praktik semester aktif"
              icon={Award}
              kind="primary"
            />
            <MetricCard
              label="Menunggu Persetujuan Kaprodi"
              value={String(roleMetrics.needApprove).padStart(2, "0")}
              foot="Telah divalidasi Koordinator Lab"
              icon={Clock3}
              trend="Siap di-ACC"
              kind="warning"
            />
            <MetricCard
              label="Disetujui & Dijalankan"
              value={String(roleMetrics.inProcess).padStart(2, "0")}
              foot="Dalam tahap pencairan & belanja"
              icon={ShoppingBag}
              kind="info"
            />
            <MetricCard
              label="Siklus Selesai"
              value={String(roleMetrics.done).padStart(2, "0")}
              foot="Praktikum & LPJ tuntas"
              icon={PackageCheck}
              trend="Selesai"
              kind="success"
            />
          </>
        )}

        {role === "Bagian Keuangan" && (
          <>
            <MetricCard
              label="Total Estimasi Diajukan"
              value={money(roleMetrics.totalEst)}
              foot="Akumulasi kebutuhan semester"
              icon={Wallet}
              kind="primary"
            />
            <MetricCard
              label="Perlu Transfer ke Asdos"
              value={String(roleMetrics.needDisbursement).padStart(2, "0")}
              foot="Disetujui Kaprodi, siap dicairkan"
              icon={Clock3}
              trend="Perlu pencairan"
              kind="danger"
            />
            <MetricCard
              label="Perlu Verifikasi LPJ Belanja"
              value={String(roleMetrics.needLpjVerify).padStart(2, "0")}
              foot="Asdos melampirkan bon belanja"
              icon={ClipboardList}
              trend="Cek nota & selisih"
              kind="warning"
            />
            <MetricCard
              label="Total Dana Ditransfer"
              value={money(roleMetrics.totalDisbursed)}
              foot="Dana operasional yang telah dicairkan"
              icon={CheckCircle2}
              trend="Realisasi kas"
              kind="success"
            />
          </>
        )}

        {role === "Super Admin" && (
          <>
            <MetricCard
              label="Master Pengajuan"
              value={String(roleMetrics.total).padStart(2, "0")}
              foot="Total database permohonan"
              icon={ClipboardList}
              kind="primary"
            />
            <MetricCard
              label="Pengguna Terdaftar"
              value={String(roleMetrics.usersCount).padStart(2, "0")}
              foot="Akun sistem pengadaan"
              icon={Users}
              kind="info"
            />
            <MetricCard
              label="Belanja Aktif"
              value={String(roleMetrics.activeProc).padStart(2, "0")}
              foot="Sedang berjalan di siklus"
              icon={Activity}
              trend="Aktif berproses"
              kind="warning"
            />
            <MetricCard
              label="Siklus Selesai"
              value={String(roleMetrics.done).padStart(2, "0")}
              foot="Tuntas hingga LPJ ditutup"
              icon={ShieldCheck}
              trend="Selesai sempurna"
              kind="success"
            />
          </>
        )}
      </div>

      {/* SUPER ADMIN 6-STEP CYCLE MONITOR */}
      {role === "Super Admin" && (
        <div className="mb-7 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-foreground">
                <Sliders className="size-4 text-primary" />
                Monitoring 6 Tahapan Siklus Pengadaan Kampus ASAINDO
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribusi status permohonan dalam alur kerja end-to-end.
              </p>
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
