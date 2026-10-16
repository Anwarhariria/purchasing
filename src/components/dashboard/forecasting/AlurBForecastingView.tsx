import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Building2,
  Calendar,
  Filter,
  DollarSign,
  Package,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SpakeApi } from "@/lib/api-client";
import { formatUnitLabel } from "@/lib/utils";
import {
  type Role,
  type UserAccount,
  type AlurBPredictionItem,
  type OfficialUnit,
  isKoordinator,
  isPemohon,
  isKeuangan,
} from "@/types/procurement";

interface AlurBForecastingViewProps {
  role: Role;
  currentUser: UserAccount | null;
  notify: (msg: string) => void;
  onOpenCreateRequest?:
    | ((
        items?: {
          id?: string;
          code_id?: string;
          barang_id?: string;
          name: string;
          qty: number;
          unit: string;
          price: number;
        }[],
      ) => void)
    | undefined;
}

const DEFAULT_OFFICIAL_UNITS: OfficialUnit[] = [
  { id: "PMB", name: "Penerimaan Mahasiswa Baru", category: "Administrasi" },
  { id: "PERPUS", name: "Perpustakaan", category: "Layanan Akademik" },
  {
    id: "SEKR-S1",
    name: "Sekretariat S1 Terapan Perhotelan",
    category: "Sekretariat Prodi",
  },
  {
    id: "SEKR-S2",
    name: "Sekretariat S2 Terapan Pariwisata",
    category: "Sekretariat Pascasarjana",
  },
  { id: "SEKR-D3", name: "Sekretariat D3 Perhotelan", category: "Sekretariat Vokasi" },
  { id: "LSP", name: "Lembaga Sertifikasi Profesi", category: "Lembaga Khusus" },
];

function getDynamicTargetPeriodOptions(): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  const jakartaTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(jakartaTime.getFullYear(), jakartaTime.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const val = `${y}-${String(m).padStart(2, "0")}`;
    const label = `${monthNames[m - 1]} ${y}${i === 1 ? " (Bulan Depan)" : ""}`;
    options.push({ value: val, label });
  }
  return options;
}

export function AlurBForecastingView({
  role,
  currentUser,
  notify,
  onOpenCreateRequest,
}: AlurBForecastingViewProps) {
  const periodOptions = useMemo(() => getDynamicTargetPeriodOptions(), []);
  const [targetPeriod, setTargetPeriod] = useState<string>(
    () => periodOptions[0]?.value || "2026-11",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map user department ke unit slug
  const userUnitSlug = useMemo(() => {
    if (!currentUser?.department) return "ALL";
    const dept = currentUser.department.toUpperCase();
    if (dept.includes("PMB") || dept.includes("PENERIMAAN")) return "PMB";
    if (dept.includes("PERPUS")) return "PERPUS";
    if (dept.includes("S1")) return "SEKR-S1";
    if (dept.includes("S2")) return "SEKR-S2";
    if (dept.includes("D3") || dept.includes("PERHOTELAN")) return "SEKR-D3";
    if (dept.includes("LSP")) return "LSP";
    return "PMB";
  }, [currentUser]);

  const defaultUnit = useMemo(() => {
    if ((isKoordinator(role) || isPemohon(role)) && userUnitSlug !== "ALL") {
      return userUnitSlug;
    }
    return "ALL";
  }, [role, userUnitSlug]);

  const [selectedUnit, setSelectedUnit] = useState<string>(defaultUnit);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: forecastData, isLoading: isQueryLoading } = useQuery({
    queryKey: [selectedUnit, targetPeriod],
    queryFn: async () => {
      const uParam = selectedUnit === "ALL" ? undefined : selectedUnit;
      return SpakeApi.predictAlurB(targetPeriod, uParam);
    },
    staleTime: 10 * 60 * 1000,
  });

  const loading = isQueryLoading || isRefreshing;
  const predictions = useMemo(() => forecastData?.predictions || [], [forecastData?.predictions]);
  const isModelUnavailable = Boolean(forecastData?.model_tidak_tersedia);
  const availableUnits: OfficialUnit[] = forecastData?.available_units || DEFAULT_OFFICIAL_UNITS;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const uParam = selectedUnit === "ALL" ? undefined : selectedUnit;
      const res = await SpakeApi.predictAlurB(targetPeriod, uParam, true);
      queryClient.setQueryData([selectedUnit, targetPeriod], res);
      notify("Data peramalan berhasil dimuat ulang langsung dari layanan AI.");
    } catch (err: unknown) {
      notify(
        `Gagal memuat rekomendasi peramalan: ${err instanceof Error ? err.message : "Kesalahan server"}`,
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter pencarian
  const filteredPredictions = useMemo(() => {
    if (!searchQuery.trim()) return predictions;
    const q = searchQuery.toLowerCase();
    return predictions.filter(
      (p) =>
        p.barang_name.toLowerCase().includes(q) ||
        p.barang_id.toLowerCase().includes(q) ||
        p.unit_name.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q),
    );
  }, [predictions, searchQuery]);

  // Ringkasan
  const totalQtyRF = useMemo(
    () => filteredPredictions.reduce((acc, p) => acc + p.qty_prediksi, 0),
    [filteredPredictions],
  );
  const totalBiaya = useMemo(
    () => filteredPredictions.reduce((acc, p) => acc + p.estimasi_biaya, 0),
    [filteredPredictions],
  );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isCoordinatorOrStaff = isKoordinator(role) || isPemohon(role);

  return (
    <div className="space-y-6">
      {isModelUnavailable && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
          <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Layanan AI Peramalan Tidak Tersedia:</span> Menggunakan
            metode peramalan fallback Seasonal Naive & Moving Average 3 Bulan (MA3) yang dihitung
            lokal oleh sistem.
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                Peramalan Kebutuhan Alur B (Random Forest AI)
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                AI Residual + Seasonal Baseline
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight pt-1">
              {isKeuangan(role)
                ? "Rencana Alokasi Kebutuhan Barang Kampus (Alur B)"
                : `Rekomendasi Pengadaan Unit: ${
                    formatUnitLabel(availableUnits.find((u) => u.id === selectedUnit)) ||
                    formatUnitLabel(currentUser?.department) ||
                    "Semua Unit"
                  }`}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Estimasi kuantitas pengadaan barang ATK dan operasional unit per bulan menggunakan
              model Random Forest Regression dengan pembanding Seasonal Naive dan Moving Average 3
              Bulan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenCreateRequest && filteredPredictions.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onOpenCreateRequest(
                    filteredPredictions.map((it) => ({
                      code_id: it.barang_id,
                      name: it.barang_name,
                      qty: it.qty_prediksi,
                      unit: it.satuan,
                      price: it.harga_satuan,
                    })),
                  );
                }}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <PlusCircle className="size-4" />
                Buat Pengajuan dari Ramalan Ini ({filteredPredictions.length} Barang)
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          {/* Target Periode */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              Periode Peramalan
            </label>
            <select
              value={targetPeriod}
              onChange={(e) => setTargetPeriod(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Kerja Filter */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" />
              Unit Kerja Kampus
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={isCoordinatorOrStaff && userUnitSlug !== "ALL"}
              className="w-full text-xs font-medium rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:bg-muted"
            >
              {!isCoordinatorOrStaff && <option value="ALL">Semua 6 Unit Kerja</option>}
              {(availableUnits.length > 0 ? availableUnits : DEFAULT_OFFICIAL_UNITS).map((u) => (
                <option key={u.id} value={u.id}>
                  {formatUnitLabel(u)}
                </option>
              ))}
            </select>
          </div>

          {/* Cari Barang */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block flex items-center gap-1.5">
              <Filter className="size-3.5 text-primary" />
              Cari Nama / Kode Barang
            </label>
            <input
              type="text"
              placeholder="Contoh: Kertas, Spidol, Map..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border mt-4">
          <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isModelUnavailable ? "Total Kebutuhan (Baseline)" : "Total Kebutuhan (RF AI)"}
              </div>
              <div className="text-xl font-black text-foreground">
                {totalQtyRF}{" "}
                <span className="text-xs font-normal text-muted-foreground">unit / pack</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Estimasi Anggaran
              </div>
              <div className="text-xl font-black text-foreground">{formatRupiah(totalBiaya)}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Jumlah Item Barang
              </div>
              <div className="text-xl font-black text-foreground">
                {filteredPredictions.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">katalog</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABEL PREDIKSI PER BARANG */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Daftar Rekomendasi Pengadaan Barang
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isModelUnavailable
                ? "Layanan AI tidak tersedia / belum ada model; angka utama dihitung menggunakan estimasi baseline (Seasonal Naive / MA3)."
                : "Angka utama adalah hasil peramalan Random Forest (RF). Baseline Seasonal Naive dan MA3 ditampilkan sebagai perbandingan."}
            </p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md cursor-help">
                  <HelpCircle className="size-3.5 text-primary" />
                  <span>Keterangan Model & Baseline</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs p-3">
                <p className="font-bold mb-1">Metodologi Peramalan:</p>
                <p className="mb-1">
                  <span className="font-semibold text-primary">RF (Utama):</span> Random Forest
                  Regressor varian residual dengan fitur musiman dan lag 12 bulan.
                </p>
                <p className="mb-1">
                  <span className="font-semibold">SNaive:</span> Seasonal Naive (kuantitas bulan
                  yang sama tahun lalu).
                </p>
                <p>
                  <span className="font-semibold">MA3:</span> Moving Average 3 bulan terakhir.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
            <p className="text-xs font-medium text-muted-foreground">
              Menghitung peramalan kebutuhan barang...
            </p>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="size-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">
              Tidak ada rekomendasi barang untuk kriteria ini.
            </p>
            <p className="text-xs text-muted-foreground">
              Coba ubah periode target atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Barang & Kategori</th>
                  <th className="py-3 px-4">Unit Kerja</th>
                  <th className="py-3 px-4 text-right">Harga Acuan</th>
                  {/* KOLOM ANGKA UTAMA: QTY RF ATAU BASELINE */}
                  <th className="py-3 px-4 text-center bg-primary/5 text-primary font-bold">
                    {isModelUnavailable ? "Qty Ramalan (Baseline)" : "Qty Ramalan (RF)"}
                    <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                      Angka Utama
                    </span>
                  </th>
                  {/* KOLOM PEMBANDING BASELINE: SNAIVE & MA3 */}
                  <th className="py-3 px-4 text-center">
                    Pembanding Baseline
                    <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                      SNaive & MA3
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">Estimasi Biaya</th>
                  {onOpenCreateRequest && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPredictions.map((item, idx) => (
                  <tr
                    key={`${item.unit_id}-${item.barang_id}-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* BARANG & KATEGORI */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">{item.barang_name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono">{item.barang_id}</span>
                        <span>•</span>
                        <span>{item.kategori}</span>
                      </div>
                    </td>

                    {/* UNIT KERJA */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                        <Building2 className="size-3 text-muted-foreground" />
                        {item.unit_name}
                      </span>
                    </td>

                    {/* HARGA ACUAN */}
                    <td className="py-3 px-4 text-right text-xs font-mono text-muted-foreground">
                      {formatRupiah(item.harga_satuan)}
                      <span className="block text-[10px] text-muted-foreground">
                        /{item.satuan}
                      </span>
                    </td>

                    {/* ANGKA UTAMA: QTY PREDIKSI RF ATAU BASELINE */}
                    <td className="py-3 px-4 text-center bg-primary/5">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-lg font-black text-primary font-mono leading-none">
                          {item.qty_prediksi}
                        </span>
                        <span className="text-[10px] font-semibold text-primary/80 mt-1 uppercase">
                          {item.satuan}
                        </span>
                        {(item.tanpa_model || isModelUnavailable) && (
                          <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-center max-w-[120px] leading-tight">
                            Estimasi baseline (MA3/SNaive) — belum ada model
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PEMBANDING BASELINE: SNAIVE & MA3 SEBAGAI KETERANGAN KECIL / TOOLTIP */}
                    <td className="py-3 px-4 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center gap-2 px-2.5 py-1 rounded bg-muted/60 border border-border/50 text-xs font-mono cursor-help">
                              <span className="text-muted-foreground">
                                SNaive:{" "}
                                <strong className="text-foreground">{item.qty_snaive}</strong>
                              </span>
                              <span className="text-border">|</span>
                              <span className="text-muted-foreground">
                                MA3:{" "}
                                <strong className="text-foreground">{item.qty_baseline}</strong>
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs p-2">
                            <p className="font-bold mb-1">Perbandingan Metode Baseline:</p>
                            <p>
                              • <strong>Seasonal Naive (lag 12 bln):</strong> {item.qty_snaive}{" "}
                              {item.satuan}
                            </p>
                            <p>
                              • <strong>Moving Average 3 bln:</strong> {item.qty_baseline}{" "}
                              {item.satuan}
                            </p>
                            {item.tanpa_model && (
                              <p className="text-amber-500 font-semibold mt-1">
                                * Barang/Unit baru (menggunakan baseline)
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>

                    {/* ESTIMASI BIAYA */}
                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono text-xs">
                      {formatRupiah(item.estimasi_biaya)}
                    </td>

                    {/* AKSI BUAT PENGAJUAN */}
                    {onOpenCreateRequest && (
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                          onClick={() => {
                            onOpenCreateRequest([
                              {
                                code_id: item.barang_id,
                                name: item.barang_name,
                                qty: item.qty_prediksi,
                                unit: item.satuan,
                                price: item.harga_satuan,
                              },
                            ]);
                          }}
                          title="Gunakan kuantitas ini untuk membuat pengajuan baru"
                        >
                          <PlusCircle className="size-3.5" />
                          Ajukan
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-muted/10 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="size-4 text-emerald-500" />
            <span>
              Peramalan Alur B dihitung otomatis per unit berdasarkan 24 bulan riwayat pengadaan.
            </span>
          </div>
          <div className="font-mono text-foreground font-semibold">
            Total Estimasi: {formatRupiah(totalBiaya)}
          </div>
        </div>
      </div>
    </div>
  );
}
