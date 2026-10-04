import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/common/MetricCard";
import {
  TrendingUp,
  Download,
  Sliders,
  Package,
  PackageCheck,
  ShoppingBag,
  CheckCircle2,
  FileText,
  ChevronDown,
  Info,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  INGREDIENT_FORECAST_DATASET,
  LAB_STOCK_INVENTORY,
} from "@/data/procurement-data";
import {
  runHoltLinear,
  runSES,
  runSMA,
  findBestHoltParameters,
} from "@/lib/algorithms/forecasting";
import type { ForecastResult } from "@/types/procurement";

interface ForecastingViewProps {
  labStock: Record<string, { stock: number; unit: string }>;
  onCreateRequestFromForecast: (detail: {
    name: string;
    qty: number;
    unit: string;
    price: number;
  }) => void;
  notify: (msg: string) => void;
}

export function ForecastingView({
  labStock,
  onCreateRequestFromForecast,
  notify,
}: ForecastingViewProps) {
  const [selectedForecastIngId, setSelectedForecastIngId] = useState<string>("ING-01");
  const [forecastModel, setForecastModel] = useState<"Holt" | "SES" | "SMA">("Holt");
  const [forecastAlpha, setForecastAlpha] = useState<number>(0.3);
  const [forecastBeta, setForecastBeta] = useState<number>(0.15);
  const [forecastHorizon, setForecastHorizon] = useState<number>(1);

  const selectedIng =
    INGREDIENT_FORECAST_DATASET.find((i) => i.id === selectedForecastIngId) ||
    INGREDIENT_FORECAST_DATASET[0];
  const currentLabStock = labStock[selectedIng.name]?.stock || 0;

  // Eksekusi kalkulasi algoritma deret waktu
  const forecastResult: ForecastResult =
    forecastModel === "Holt"
      ? runHoltLinear(selectedIng.history, forecastAlpha, forecastBeta, forecastHorizon)
      : forecastModel === "SES"
        ? runSES(selectedIng.history, forecastAlpha, forecastHorizon)
        : runSMA(selectedIng.history, 3, forecastHorizon);

  const projectedNeed = forecastResult.nextForecast;
  const deficitToOrder = Math.max(0, Number((projectedNeed - currentLabStock).toFixed(1)));

  // Skala grafik SVG
  const allValues = [
    ...selectedIng.history.map((h) => h.actual),
    ...forecastResult.rows.map((r) => r.forecast),
    ...forecastResult.horizonForecasts.map((h) => h.forecast),
  ];
  const maxVal = Math.max(10, Math.ceil(Math.max(...allValues) * 1.15));
  const svgWidth = 820;
  const svgHeight = 260;
  const paddingLeft = 50;
  const paddingRight = 60;
  const paddingTop = 30;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const totalPoints = selectedIng.history.length + forecastResult.horizonForecasts.length;
  const getX = (idx: number) => paddingLeft + (idx / (totalPoints - 1)) * plotWidth;
  const getY = (val: number) => paddingTop + plotHeight - (val / maxVal) * plotHeight;

  // Path data aktual
  const actualPoints = selectedIng.history.map((h, i) => `${getX(i)},${getY(h.actual)}`).join(" ");

  // Path data hasil model ramalan (termasuk proyeksi masa depan)
  const forecastPointsList: string[] = [];
  forecastResult.rows.forEach((r, i) => {
    forecastPointsList.push(`${getX(i)},${getY(r.forecast)}`);
  });
  forecastResult.horizonForecasts.forEach((h, i) => {
    const idx = selectedIng.history.length + i;
    forecastPointsList.push(`${getX(idx)},${getY(h.forecast)}`);
  });
  const forecastPath = forecastPointsList.join(" ");

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Perencanaan Pengadaan Bahan Lab
              </span>
              <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                Peramalan Kebutuhan Bahan Praktikum Laboratorium
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-4xl">
              Sistem menganalisis pola pemakaian bahan masakan di laboratorium untuk mengestimasi kebutuhan periode mendatang, membantu asisten lab dan koordinator merencanakan pengadaan agar stok selalu siap dan menghindari bahan mubazir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows = [
                  ["Bulan", "Data Aktual (At)", "Hasil Ramalan (Ft)", "Galat Error (et)", "Abs Error (|et|)", "APE (%)", "Squared Error"],
                  ...forecastResult.rows.map((r) => [
                    r.month,
                    String(r.actual),
                    String(r.forecast),
                    String(r.error),
                    String(r.absError),
                    `${r.ape}%`,
                    String(r.sqError),
                  ]),
                ];
                const csv = "\uFEFF" + rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = `Forecasting_${selectedIng.name.replace(/\s+/g, "_")}.csv`;
                link.click();
                URL.revokeObjectURL(url);
                notify(`Data simulasi peramalan ${selectedIng.name} berhasil diunduh (CSV).`);
              }}
              className="h-8 gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Download className="size-3.5" /> Unduh Data CSV
            </Button>
          </div>
        </div>

        {/* Interactive Parameters Control Panel */}
        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* 1. Pilih Bahan Masakan */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Pilih Bahan Praktikum:
              </label>
              <select
                value={selectedForecastIngId}
                onChange={(e) => setSelectedForecastIngId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {INGREDIENT_FORECAST_DATASET.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit}) — {ing.category.includes("Perishable") ? "Bahan Basah" : "Bahan Kering"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Kategori: <strong className="text-foreground">{selectedIng.category}</strong>
              </p>
            </div>

            {/* 2. Pilih Model Algoritma */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Model Estimasi Kebutuhan:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "Holt", label: "Tren Adaptif" },
                    { id: "SES", label: "Perataan Bobot" },
                    { id: "SMA", label: "Rata-rata 3 Bln" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setForecastModel(m.id)}
                    className={`h-9 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                      forecastModel === m.id
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {forecastModel === "Holt"
                  ? "Menyesuaikan fluktuasi kenaikan/penurunan jadwal praktikum (Rekomendasi)."
                  : forecastModel === "SES"
                    ? "Perataan bertahap dengan pembobotan pemakaian terbaru."
                    : "Rata-rata bergerak pemakaian 3 bulan terakhir."}
              </p>
            </div>

            {/* 3. Horizon Waktu Peramalan */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Horizon Waktu Proyeksi:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { val: 1, label: "1 Bulan" },
                  { val: 3, label: "3 Bulan" },
                  { val: 6, label: "1 Semester" },
                ].map((hz) => (
                  <button
                    key={hz.val}
                    type="button"
                    onClick={() => setForecastHorizon(hz.val)}
                    className={`h-9 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                      forecastHorizon === hz.val
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {hz.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Proyeksi hingga: <strong className="text-foreground">{forecastResult.horizonForecasts[forecastResult.horizonForecasts.length - 1]?.month}</strong>
              </p>
            </div>
          </div>

          {/* Parameter Tuning Sliders (Khusus Holt & SES) */}
          {forecastModel !== "SMA" && (
            <div className="mt-4 pt-3.5 border-t border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6 flex-1">
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Sensitivitas Pemakaian Terbaru (Alpha):</span>
                    <span className="font-mono font-black text-primary">{forecastAlpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={forecastAlpha}
                    onChange={(e) => setForecastAlpha(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 cursor-pointer"
                  />
                </div>

                {forecastModel === "Holt" && (
                  <div className="space-y-1 min-w-[200px]">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">Sensitivitas Tren Fluktuasi (Beta):</span>
                      <span className="font-mono font-black text-primary">{forecastBeta.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.50"
                      step="0.05"
                      value={forecastBeta}
                      onChange={(e) => setForecastBeta(Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {forecastModel === "Holt" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const { bestAlpha, bestBeta } = findBestHoltParameters(selectedIng.history);
                    setForecastAlpha(bestAlpha);
                    setForecastBeta(bestBeta);
                    notify(`Optimasi parameter berhasil: Nilai sensitivitas disesuaikan untuk akurasi tertinggi.`);
                  }}
                  className="h-8 gap-1.5 text-xs font-bold text-primary border-primary/40 hover:bg-primary/10 shrink-0 cursor-pointer"
                  title="Menyesuaikan nilai sensitivitas secara otomatis untuk mendapatkan estimasi yang paling akurat"
                >
                  <Sliders className="size-3.5 text-primary" />
                  Optimalkan Parameter Otomatis
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Top KPI Metrics Cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={`Estimasi Kebutuhan (${forecastResult.nextMonthLabel})`}
            value={`${projectedNeed} ${selectedIng.unit}`}
            foot="Proyeksi jadwal praktikum kelas"
            icon={Package}
            kind="primary"
            className="animate-slide-up-fade stagger-1"
          />
          <MetricCard
            label="Stok Gudang Lab Saat Ini"
            value={`${currentLabStock} ${selectedIng.unit}`}
            foot="Tersedia di inventaris laboratorium"
            icon={PackageCheck}
            trend={currentLabStock > 0 ? "Tersedia" : "Kosong"}
            kind={currentLabStock > 0 ? "info" : "warning"}
            className="animate-slide-up-fade stagger-2"
          />
          <MetricCard
            label="Rekomendasi Pengadaan Baru"
            value={`${deficitToOrder} ${selectedIng.unit}`}
            foot={deficitToOrder > 0 ? "Kebutuhan belanja periode mendatang" : "Stok lab masih mencukupi"}
            icon={ShoppingBag}
            trend={deficitToOrder > 0 ? "Perlu Belanja" : "Stok Cukup"}
            kind={deficitToOrder > 0 ? "danger" : "success"}
            className="animate-slide-up-fade stagger-3"
          />
          <MetricCard
            label="Tingkat Keandalan Prediksi"
            value={`${forecastResult.evaluation.split(" ")[0]} (${Math.max(0, Math.round(100 - forecastResult.mape))}%)`}
            foot={forecastResult.mape < 20 ? "Tingkat akurasi tinggi & konsisten" : "Toleransi fluktuasi semester"}
            icon={CheckCircle2}
            trend={forecastResult.mape < 20 ? "Stabil" : "Fluktuatif"}
            kind={forecastResult.mape < 20 ? "success" : "info"}
            className="animate-slide-up-fade stagger-4"
          />
        </div>

        {/* Visual Time Series Line Chart (Interactive Responsive SVG) */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-xs animate-slide-up-fade stagger-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Grafik Tren Pemakaian Bahan Laboratorium ({selectedIng.name})
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Perbandingan data pemakaian riil dengan estimasi kebutuhan sistem per bulan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <span className="inline-block size-3 rounded-full bg-blue-600" />
                Pemakaian Riil (Aktual)
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#0f172a] dark:text-slate-100">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-[#0f172a] dark:border-slate-100" />
                Estimasi Kebutuhan
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <span className="inline-block size-3 rounded-full bg-amber-500 animate-pulse" />
                Proyeksi Bulan Mendatang
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[700px] h-[280px] relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                {/* Grid horizontal lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = paddingTop + plotHeight * (1 - pct);
                  const valLabel = Math.round(maxVal * pct);
                  return (
                    <g key={pct}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-muted-foreground font-mono"
                      >
                        {valLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Sumbu X & Y */}
                <line
                  x1={paddingLeft}
                  y1={paddingTop + plotHeight}
                  x2={svgWidth - paddingRight}
                  y2={paddingTop + plotHeight}
                  stroke="currentColor"
                  strokeOpacity="0.3"
                />

                {/* Batang Grafik Penggunaan (Bar Chart Fill / Scale-Y Growth) */}
                {selectedIng.history.map((h, i) => {
                  const cx = getX(i);
                  const barWidth = 20;
                  const baselineY = paddingTop + plotHeight;
                  const barTopY = getY(h.actual);
                  const barHeight = Math.max(3, baselineY - barTopY);
                  return (
                    <rect
                      key={`bar-${i}`}
                      x={cx - barWidth / 2}
                      y={barTopY}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      className="fill-blue-500/20 hover:fill-blue-500/40 transition-colors animate-bar-grow"
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  );
                })}

                {/* Polyline Model Ramalan (Garis Merah Putus-putus) */}
                <polyline
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                  points={forecastPath}
                />

                {/* Polyline Data Aktual (Garis Biru Solid) */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  points={actualPoints}
                />

                {/* Titik-titik Aktual (Biru) */}
                {selectedIng.history.map((h, i) => {
                  const cx = getX(i);
                  const cy = getY(h.actual);
                  return (
                    <g key={`act-${i}`} className="group">
                      <circle cx={cx} cy={cy} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={cx}
                        y={paddingTop + plotHeight + 18}
                        textAnchor="middle"
                        className="text-[10px] fill-muted-foreground font-medium"
                      >
                        {h.month.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}

                {/* Titik-titik Proyeksi Masa Depan (Emas/Kuning Berkedip) */}
                {forecastResult.horizonForecasts.map((hf, i) => {
                  const idx = selectedIng.history.length + i;
                  const cx = getX(idx);
                  const cy = getY(hf.forecast);
                  return (
                    <g key={`pred-${i}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                      <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="middle"
                        className="text-[11px] font-black fill-amber-700 dark:fill-amber-400 font-mono"
                      >
                        {hf.forecast} {selectedIng.unit}
                      </text>
                      <text
                        x={cx}
                        y={paddingTop + plotHeight + 18}
                        textAnchor="middle"
                        className="text-[10px] fill-primary font-bold"
                      >
                        {hf.month.split(" ")[0]}*
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Riwayat Pemakaian & Evaluasi Estimasi Bahan */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Riwayat Pemakaian & Evaluasi Estimasi Bahan
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Catatan pemakaian riil di laboratorium per periode dibandingkan dengan estimasi kebutuhan sistem.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Tingkat Keandalan: <strong className="text-foreground">{forecastResult.evaluation.split(" ")[0]} ({Math.max(0, Math.round(100 - forecastResult.mape))}%)</strong>
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3">Periode Bulan</th>
                  <th className="px-4 py-3">Aktivitas Praktikum Kampus</th>
                  <th className="px-4 py-3 text-right">Pemakaian Riil</th>
                  <th className="px-4 py-3 text-right">Estimasi Kebutuhan</th>
                  <th className="px-4 py-3 text-right">Selisih</th>
                  <th className="px-4 py-3 text-center">Status Kesesuaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                {forecastResult.rows.map((row, idx) => {
                  const activityNotes: Record<string, string> = {
                    "Okt 2025": "Awal Semester Ganjil (Praktik Dasar)",
                    "Nov 2025": "Praktikum Rutin Terjadwal",
                    "Des 2025": "Puncak Ujian Akhir Semester (UAS)",
                    "Jan 2026": "Jeda Libur Semester Ganjil",
                    "Feb 2026": "Awal Semester Genap",
                    "Mar 2026": "Praktikum Reguler Kuliner",
                    "Apr 2026": "Praktikum Modul Kontinental & Pastry",
                    "Mei 2026": "Puncak Uji Kompetensi Kejuruan",
                    "Jun 2026": "Praktikum Lanjutan & Remedial",
                    "Jul 2026": "Jeda Libur Semester Genap",
                    "Agu 2026": "Persiapan Tahun Akademik Baru",
                    "Sep 2026": "Awal Perkuliahan & Praktikum",
                  };
                  const note = activityNotes[row.month] || "Praktikum Lab";
                  const diff = Number((row.actual - row.forecast).toFixed(1));
                  const isVeryAccurate = row.ape <= 15;
                  const isAccurate = row.ape <= 35;

                  return (
                    <tr
                      key={row.month}
                      className="hover:bg-surface/60 transition-colors animate-row-enter"
                      style={{ animationDelay: `${idx * 35}ms` }}
                    >
                      <td className="px-4 py-2.5 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">{row.month}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{note}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-700 dark:text-blue-400 font-mono">
                        {row.actual} {selectedIng.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#0f172a] dark:text-slate-100 font-mono">
                        {row.forecast} {selectedIng.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                        {diff === 0 ? "Pas (0)" : diff > 0 ? `+${diff}` : diff} {selectedIng.unit}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isVeryAccurate
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isAccurate
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isVeryAccurate ? "Sangat Sesuai" : isAccurate ? "Sesuai" : "Fluktuasi Terjadwal"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Collapsible: Rincian Analisis Statistik untuk Kebutuhan Audit / Pengujian */}
          <details className="mt-4 rounded-lg border border-border/70 bg-surface/40 p-3 text-xs group">
            <summary className="font-bold text-muted-foreground hover:text-foreground cursor-pointer select-none flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="size-3.5 text-primary" />
                Rincian Analisis Statistik Model (MAPE, MAD, MSE, RMSE)
              </span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180 text-muted-foreground" />
            </summary>
            <div className="mt-3 pt-3 border-t border-border/80 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
                <div className="p-2.5 bg-card rounded-md border border-border">
                  <span className="text-muted-foreground text-[10px] block font-sans font-bold">MAPE (Rata-rata Galat)</span>
                  <strong className="text-sm text-foreground">{forecastResult.mape}%</strong>
                </div>
                <div className="p-2.5 bg-card rounded-md border border-border">
                  <span className="text-muted-foreground text-[10px] block font-sans font-bold">MAD (Deviasi Absolut)</span>
                  <strong className="text-sm text-foreground">{forecastResult.mad}</strong>
                </div>
                <div className="p-2.5 bg-card rounded-md border border-border">
                  <span className="text-muted-foreground text-[10px] block font-sans font-bold">MSE (Galat Kuadrat)</span>
                  <strong className="text-sm text-foreground">{forecastResult.mse}</strong>
                </div>
                <div className="p-2.5 bg-card rounded-md border border-border">
                  <span className="text-muted-foreground text-[10px] block font-sans font-bold">RMSE (Akar Galat Kuadrat)</span>
                  <strong className="text-sm text-foreground">{forecastResult.rmse}</strong>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Data metrik galat dihitung otomatis oleh sistem untuk memastikan model peramalan memiliki keandalan tinggi dalam memproyeksikan kebutuhan bahan laboratorium.
              </p>
            </div>
          </details>
        </div>

        {/* Ringkasan Analisis Kebutuhan & Aksi Pengadaan */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Ringkasan Analisis Kebutuhan */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-2.5 shadow-xs animate-slide-up-fade stagger-4">
            <div className="flex items-center gap-2 text-foreground font-black text-sm">
              <Info className="size-4 text-primary" />
              <span>Ringkasan Perencanaan Stok & Pengadaan Laboratorium</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Berdasarkan tren konsumsi praktikum, estimasi kebutuhan <strong className="text-foreground">{selectedIng.name}</strong> untuk periode mendatang (<strong className="text-foreground">{forecastResult.nextMonthLabel}</strong>) adalah <strong className="text-primary">{projectedNeed} {selectedIng.unit}</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-surface border border-border">
                <span className="text-[11px] text-muted-foreground block">Kondisi Stok Gudang Lab:</span>
                <strong className="text-foreground">
                  {currentLabStock > 0 ? `${currentLabStock} ${selectedIng.unit} tersedia di lab` : "Stok di gudang lab saat ini kosong (0)"}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-border">
                <span className="text-[11px] text-muted-foreground block">Rekomendasi Tindakan:</span>
                <strong className={deficitToOrder > 0 ? "text-primary font-bold" : "text-emerald-700 dark:text-emerald-400 font-bold"}>
                  {deficitToOrder > 0
                    ? `Perlu pengadaan baru sebesar ${deficitToOrder} ${selectedIng.unit}`
                    : "Stok lab masih mencukupi, tidak perlu belanja"}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Card: Asisten AI Rekomendasi & Integrasi Alur Pengadaan */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col justify-between shadow-xs animate-slide-up-fade stagger-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* 3D Glowing Pulsing Gradient Orb */}
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 text-white shadow-md animate-orb-floating">
                  <Sparkles className="size-5 text-white animate-pulse" />
                </div>
                <div>
                  <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    Asisten Rekomendasi AI
                  </span>
                  <h4 className="text-sm font-black text-foreground mt-0.5">
                    Buat Pengajuan Bahan Otomatis
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Isi formulir pengadaan bahan secara otomatis dengan kuantitas rekomendasi (<strong>{deficitToOrder} {selectedIng.unit}</strong>) untuk diajukan ke Koordinator Lab.
              </p>
            </div>

            <Button
              onClick={() => {
                const estPrice = LAB_STOCK_INVENTORY[selectedIng.name] ? 50000 : 35000;
                onCreateRequestFromForecast({
                  name: selectedIng.name,
                  qty: deficitToOrder > 0 ? deficitToOrder : 1,
                  unit: selectedIng.unit,
                  price: estPrice,
                });
              }}
              className="w-full gap-2 bg-primary hover:bg-blue-900 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              <Plus className="size-4" /> Buat Pengajuan Bahan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
