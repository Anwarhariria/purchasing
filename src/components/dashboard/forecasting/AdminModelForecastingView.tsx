import { useState, useEffect } from "react";
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Database,
  Sliders,
  BarChart3,
  Award,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpakeApi } from "@/lib/api-client";
import type { ForecastModelInfo } from "@/types/procurement";

interface AdminModelForecastingViewProps {
  notify: (msg: string) => void;
}

export function AdminModelForecastingView({ notify }: AdminModelForecastingViewProps) {
  const [modelInfo, setModelInfo] = useState<ForecastModelInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchModelInfo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await SpakeApi.getForecastModelInfo();
      if (res.data) {
        setModelInfo(res.data);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat metadata model peramalan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const handleRetrain = async () => {
    if (
      !confirm(
        "Jalankan pelatihan ulang model AI (Random Forest) dengan data pengadaan terkini? Proses ini memerlukan waktu beberapa detik.",
      )
    ) {
      return;
    }
    setTraining(true);
    try {
      await SpakeApi.trainAlurB();
      notify(`Pelatihan model berhasil! Versi baru telah aktif.`);
      await fetchModelInfo();
    } catch (err: unknown) {
      notify(`Gagal melatih model: ${err instanceof Error ? err.message : "Kesalahan server"}`);
    } finally {
      setTraining(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  if (loading && !modelInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 rounded-xl border border-border bg-card">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Memuat metadata dan evaluasi model AI...
        </p>
      </div>
    );
  }

  const windows = modelInfo?.rolling_windows || [];
  const summary = modelInfo?.rolling_summary;
  const isSimulated = modelInfo?.is_simulated_data ?? false;
  const isBetter = modelInfo?.model_lebih_baik_dari_baseline ?? true;
  const variantDisplay =
    modelInfo?.selected_variant === "rf_residual"
      ? "Random Forest (Residual)"
      : "Random Forest (Direct)";

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary flex items-center gap-1.5">
                <Cpu className="size-3.5" />
                AI Forecast Engine • Python 3.12 & Scikit-Learn
              </span>
              {/* BADGE DATA SIMULASI / RIIL */}
              {isSimulated ? (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Database className="size-3.5" />
                  Data simulasi
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Database className="size-3.5" />
                  Data riil
                </span>
              )}

              {isBetter ? (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Award className="size-3.5" />
                  Model Unggul vs Baseline (Terbaik)
                </span>
              ) : (
                <span className="rounded-full bg-slate-500/15 border border-slate-500/30 px-3 py-0.5 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  Baseline Lebih Akurat
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 pt-1">
              Evaluasi & Parameter Model Peramalan Alur B
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pemantauan kinerja model Random Forest Regressor dibandingkan Seasonal Naive dan
              Moving Average 3 (MA3) dengan metodologi Rolling-Origin Validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchModelInfo}
              disabled={loading || training}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              size="sm"
              onClick={handleRetrain}
              disabled={loading || training}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className={`size-4 ${training ? "animate-spin" : ""}`} />
              {training ? "Melatih Model..." : "Latih Ulang Model"}
            </Button>
          </div>
        </div>

        {/* METADATA SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Cpu className="size-3.5 text-primary" />
              Versi Model Aktif
            </div>
            <div className="text-lg font-black text-foreground">v{modelInfo?.version ?? 1}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Varian: <span className="text-foreground font-semibold">{variantDisplay}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Calendar className="size-3.5 text-primary" />
              Tanggal Pelatihan
            </div>
            <div className="text-sm font-bold text-foreground">
              {formatDate(modelInfo?.trained_at)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              {modelInfo?.total_months ?? 24} Bulan Riwayat ({modelInfo?.total_records ?? 0}{" "}
              Transaksi)
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Sliders className="size-3.5 text-primary" />
              Hyperparameter Terbaik
            </div>
            <div className="text-xs font-semibold text-foreground font-mono">
              leaf={String(modelInfo?.best_params?.["min_samples_leaf"] ?? 3)}, est=
              {String(modelInfo?.best_params?.["n_estimators"] ?? 200)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              depth={String(modelInfo?.best_params?.["max_depth"] ?? "None")} (CV TimeSeriesSplit)
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <BarChart3 className="size-3.5 text-primary" />
              Rata-rata MAPE RF
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {summary?.mean_mape_rf != null ? `${summary.mean_mape_rf}%` : "-"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              ± {summary?.std_mape_rf != null ? `${summary.std_mape_rf}%` : "0%"} (MAE{" "}
              {summary?.mean_mae_rf ?? "-"})
            </div>
          </div>
        </div>
      </div>

      {/* TABEL EVALUASI ROLLING-ORIGIN */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Tabel Evaluasi Rolling-Origin (3 Jendela Uji Bertahap)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Perbandingan performa galat peramalan antara Random Forest (Residual), Seasonal
                Naive ($lag_{"{12}"}$), dan Moving Average 3 Bulan (MA3).
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded bg-muted text-muted-foreground">
              Evaluasi Time-Series Split Tanpa Bocor Data
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Metode Peramalan</th>
                <th className="py-3 px-4 text-center">
                  MAPE Jendela 1
                  <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                    {windows[0]?.test_periods?.join(", ") || "Periode 19–21"}
                  </span>
                </th>
                <th className="py-3 px-4 text-center">
                  MAPE Jendela 2
                  <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                    {windows[1]?.test_periods?.join(", ") || "Periode 20–22"}
                  </span>
                </th>
                <th className="py-3 px-4 text-center">
                  MAPE Jendela 3
                  <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                    {windows[2]?.test_periods?.join(", ") || "Periode 21–24"}
                  </span>
                </th>
                <th className="py-3 px-4 text-center font-bold text-foreground">
                  Rata-rata ± Simpangan
                </th>
                <th className="py-3 px-4 text-right">Mean MAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* ROW 1: RANDOM FOREST RESIDUAL */}
              <tr className="hover:bg-primary/5 transition-colors bg-primary/[0.02]">
                <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary" />
                  {variantDisplay}
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                    Model Utama
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {windows[0]?.mape_rf != null ? `${windows[0].mape_rf}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {windows[1]?.mape_rf != null ? `${windows[1].mape_rf}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {windows[2]?.mape_rf != null ? `${windows[2].mape_rf}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-emerald-600 dark:text-emerald-400">
                  {summary?.mean_mape_rf != null
                    ? `${summary.mean_mape_rf}% ± ${summary.std_mape_rf}%`
                    : "-"}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-foreground font-mono">
                  {summary?.mean_mae_rf ?? "-"}
                </td>
              </tr>

              {/* ROW 2: SEASONAL NAIVE */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-4 font-medium text-foreground flex items-center gap-2">
                  <div className="size-2 rounded-full bg-amber-500" />
                  Seasonal Naive (lag_12)
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Baseline Musiman)
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[0]?.mape_snaive != null ? `${windows[0].mape_snaive}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[1]?.mape_snaive != null ? `${windows[1].mape_snaive}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[2]?.mape_snaive != null ? `${windows[2].mape_snaive}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {summary?.mean_mape_snaive != null
                    ? `${summary.mean_mape_snaive}% ± ${summary.std_mape_snaive}%`
                    : "-"}
                </td>
                <td className="py-3.5 px-4 text-right text-muted-foreground font-mono">
                  {summary?.mean_mae_snaive ?? "-"}
                </td>
              </tr>

              {/* ROW 3: MOVING AVERAGE 3 */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-3.5 px-4 font-medium text-foreground flex items-center gap-2">
                  <div className="size-2 rounded-full bg-slate-400" />
                  Moving Average 3 Bulan (MA3)
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Baseline Tren Jangka Pendek)
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[0]?.mape_ma3 != null ? `${windows[0].mape_ma3}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[1]?.mape_ma3 != null ? `${windows[1].mape_ma3}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground">
                  {windows[2]?.mape_ma3 != null ? `${windows[2].mape_ma3}%` : "-"}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                  {summary?.mean_mape_ma3 != null
                    ? `${summary.mean_mape_ma3}% ± ${summary.std_mape_ma3}%`
                    : "-"}
                </td>
                <td className="py-3.5 px-4 text-right text-muted-foreground font-mono">
                  {summary?.mean_mae_ma3 ?? "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>
              Tuning model dan pemilihan varian dieksekusi eksklusif melalui TimeSeriesSplit CV pada
              data latih saja.
            </span>
          </div>
          <div>MAPE = Mean Absolute Percentage Error (aktual 0 diabaikan)</div>
        </div>
      </div>

      {/* TOP FEATURE IMPORTANCE */}
      {modelInfo?.feature_importance && Object.keys(modelInfo.feature_importance).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
            <Layers className="size-4 text-primary" />
            Kontribusi Fitur Model (Feature Importance)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(modelInfo.feature_importance)
              .slice(0, 5)
              .map(([fitur, imp]) => {
                const percentage = Math.round(imp * 100);
                return (
                  <div
                    key={fitur}
                    className="p-3 rounded-lg border border-border/80 bg-muted/30 flex flex-col justify-between"
                  >
                    <div className="text-xs font-semibold text-foreground truncate" title={fitur}>
                      {fitur}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground mb-1">
                        <span>Bobot</span>
                        <span className="font-bold text-foreground">{(imp * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, percentage * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
