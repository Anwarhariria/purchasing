export type Role =
  | "Asdos Kitchen"
  | "Staf Unit"
  | "Koordinator Lab"
  | "Koordinator Unit"
  | "Kaprodi"
  | "Keuangan Kitchen"
  | "Keuangan Umum"
  | "Super Admin";

export function isPemohon(role?: string | null): boolean {
  return role === "Asdos Kitchen" || role === "Staf Unit";
}

export function isKoordinator(role?: string | null): boolean {
  return role === "Koordinator Lab" || role === "Koordinator Unit";
}

export function isKeuangan(role?: string | null): boolean {
  return role === "Keuangan Kitchen" || role === "Keuangan Umum";
}

export type Status =
  | "DIAJUKAN"
  | "DIVERIFIKASI_KOORD"
  | "DITOLAK_KOORD"
  | "DISETUJUI_KAPRODI"
  | "DITOLAK_KAPRODI"
  | "DITOLAK_KEUANGAN"
  | "DANA_DICAIRKAN"
  | "SEDANG_DIBELANJAKAN"
  | "BARANG_DITERIMA"
  | "LAPORAN_BELANJA_DIAJUKAN"
  | "SELESAI";

export const SIKLUS_TAHAPAN: Status[] = [
  "DIAJUKAN",
  "DIVERIFIKASI_KOORD",
  "DISETUJUI_KAPRODI",
  "DANA_DICAIRKAN",
  "BARANG_DITERIMA",
  "LAPORAN_BELANJA_DIAJUKAN",
  "SELESAI",
];

export const SIKLUS_TAHAPAN_A: { status: Status; label: string }[] = [
  { status: "DIAJUKAN", label: "Diajukan" },
  { status: "DIVERIFIKASI_KOORD", label: "Diverifikasi Koord" },
  { status: "DISETUJUI_KAPRODI", label: "Disetujui Kaprodi" },
  { status: "DANA_DICAIRKAN", label: "Dana Dicairkan" },
  { status: "BARANG_DITERIMA", label: "Barang Diterima" },
  { status: "SELESAI", label: "SPJ & Selesai" },
];

export const SIKLUS_TAHAPAN_B: { status: Status; label: string }[] = [
  { status: "DIAJUKAN", label: "Diajukan" },
  { status: "DIVERIFIKASI_KOORD", label: "Diverifikasi Koord" },
  { status: "SEDANG_DIBELANJAKAN", label: "Alokasi Belanja" },
  { status: "BARANG_DITERIMA", label: "Barang Diterima" },
  { status: "SELESAI", label: "Selesai" },
];

export const SIKLUS_DETAILS: Record<Status, { label: string; desc: string }> = {
  DIAJUKAN: { label: "Diajukan", desc: "Permohonan diajukan oleh pemohon (Asdos/Staf)" },
  DIVERIFIKASI_KOORD: {
    label: "Diverifikasi Koordinator",
    desc: "Ditinjau & disesuaikan kuantitas standar oleh Koordinator",
  },
  DITOLAK_KOORD: {
    label: "Ditolak Koordinator",
    desc: "Permohonan ditolak oleh Koordinator dengan catatan perbaikan",
  },
  DISETUJUI_KAPRODI: {
    label: "Disetujui Kaprodi",
    desc: "Disetujui Kaprodi & diajukan ke Keuangan",
  },
  DITOLAK_KAPRODI: {
    label: "Ditolak Kaprodi",
    desc: "Ditolak Kaprodi & dikembalikan ke antrean Koordinator",
  },
  DITOLAK_KEUANGAN: {
    label: "Ditolak Keuangan",
    desc: "Ditolak oleh Keuangan karena faktor f = 0",
  },
  DANA_DICAIRKAN: {
    label: "Dana Dicairkan",
    desc: "Dana kasbon telah dicairkan & ditransfer ke rekening Asdos",
  },
  SEDANG_DIBELANJAKAN: {
    label: "Sedang Dibelanjakan",
    desc: "Proses pembelian logistik/bahan sedang berlangsung",
  },
  BARANG_DITERIMA: {
    label: "Barang Diterima",
    desc: "Barang belanjaan telah sampai dan dikonfirmasi diterima",
  },
  LAPORAN_BELANJA_DIAJUKAN: {
    label: "Laporan Belanja",
    desc: "Asdos telah mengunggah nota/bon belanja",
  },
  SELESAI: {
    label: "Selesai",
    desc: "Laporan belanja diverifikasi Keuangan & transaksi resmi ditutup",
  },
};

export interface RecipeIngredient {
  name: string;
  neededQty: number;
  unit: string;
  pricePerUnit: number;
}

export interface MenuItemRecipe {
  id?: string | number | undefined;
  menuName: string;
  ingredients: RecipeIngredient[];
}

export interface CourseData {
  courseName: string;
  menus: MenuItemRecipe[];
}

export interface SemesterData {
  semester: number;
  courses: CourseData[];
}

export interface StudyProgramData {
  prodiName: string;
  semesters: SemesterData[];
}

export type ProdiCurriculum = StudyProgramData;
export type Ingredient = RecipeIngredient;

export interface LabStockItem {
  stock: number;
  unit: string;
}

export type WorkflowType = "A" | "B";

export interface RequestDetail {
  id: string;
  code_id?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  neededQty?: number;
  stockInLab?: number;
  qtyFinal?: number;
  qty_final?: number;
  qtyRamalan?: number;
  qty_ramalan?: number;
  tanpaModel?: boolean;
  tanpa_model?: boolean;
  isAddedByKoord?: boolean;
  deletedAt?: string;
  alasanHapus?: string;
}

export interface RequestItem {
  id: string;
  alur?: WorkflowType | undefined; // "A": Kitchen/Praktikum, "B": Umum & ATK
  item: string; // Judul Pengajuan (Menu Praktik / Pengadaan Unit)
  category: string;
  prodi?: string | undefined;
  semester?: number | undefined;
  course?: string | undefined;
  menu?: string | undefined;
  groupCount?: number | undefined; // Jumlah Kelompok Praktikum (1 kelompok = 1 resep)
  unitKerja?: string | undefined; // Khusus Alur B (e.g. PMB, PERPUS, SEKR-S1, dll)
  petugasPembelanja?: string | undefined; // Khusus Alur B (di luar sistem)
  qty: number; // Jumlah total item
  unit: string;
  price: number; // Total harga diajukan
  details?: RequestDetail[] | undefined;
  academicImportance: "Tinggi" | "Sedang" | "Standar";
  applicant: string;
  department: string;
  date: string;
  status: Status;
  needBy: string;
  deadline?: string | undefined;
  purpose?: string | undefined;
  note?: string | undefined;
  rejectionReason?: string | undefined;
  rejection_reason?: string | undefined;

  // Alokasi Parsial Keuangan
  faktorF?: number | undefined; // 1 | 0.5 | 0.25 | 0
  catatanKeuangan?: string | undefined;
  catatan_keuangan?: string | undefined;
  nominalTransfer?: number | undefined;
  nominal_transfer?: number | undefined;
  catatanAlokasi?: string | undefined;
  buktiTransferUrl?: string | undefined;
  buktiTransfer?: string | undefined;
  bukti_transfer?: string | undefined;

  // Fitur Keuangan & Pelaporan Asdos
  danaPokok?: number | undefined; // Dana pokok yang disetujui Keuangan
  danaDiterima?: number | undefined; // Total dana yang benar-benar ditransfer ke Asdos (termasuk carry-over tombok)
  actualSpent?: number | undefined; // Realisasi belanja berdasarkan nota
  refundAmount?: number | undefined; // Sisa uang belanja (disetor oleh Asdos)
  deficitAmount?: number | undefined; // Kekurangan dana belanja (tombok Asdos yang dibawa sebagai carry-over)
  receiptImages?: string[] | undefined;
  buktiSetorUrl?: string | undefined; // Bukti transfer/setor sisa dana oleh Asdos
  receiptNo?: string | undefined; // Nomor nota/bon fisik (misal NOTA-LW01)
  storeName?: string | undefined; // Toko/pasar tempat belanja
  refundDate?: string | undefined; // Tanggal setor sisa kembalian kasbon
  deficitDate?: string | undefined; // Tanggal pencatatan carry-over tombok kasbon
  kasbonStatusNote?: string | undefined; // Catatan posisi kasbon
  penyelesaian?: KasbonPenyelesaian[] | undefined;

  // Konfirmasi Terima Barang
  receivedConfirmedAt?: string | undefined;
  isAutoConfirmed?: boolean | undefined;

  // Activity Logs / Audit Trail
  activityLogs?: ProcurementActivityLog[] | undefined;
}

export interface KasbonPenyelesaian {
  id: number;
  pengajuanId: string;
  pengajuan_id?: string;
  jenis: "setor" | "carry_over";
  nominal: number;
  buktiPath?: string | null;
  bukti_path?: string | null;
  kasbonTujuanId?: string | null;
  kasbon_tujuan_id?: string | null;
  dicatatOleh: string;
  dicatat_oleh?: string;
  tanggal: string;
}

export interface KasbonAsdosSummary {
  asdosName: string;
  email?: string;
  totalReceived: number;
  totalSpent: number;
  refundRemaining: number;
  deficitCarryOver: number;
  status: "Menunggu Setoran" | "Carry-Over Berikutnya" | "Lunas";
  transactionCount: number;
}

export interface KasbonTransactionDetail {
  id: string;
  requestId: string;
  asdosName: string;
  menuItem: string;
  date: string;
  danaDiterima: number;
  actualSpent: number;
  difference: number; // danaDiterima - actualSpent
  status: "Menunggu Setoran" | "Carry-Over Berikutnya" | "Lunas" | "Proses Belanja";
  receiptImages?: string[] | undefined;
  settlementProof?: string | undefined;
  settledAt?: string | undefined;
  notes?: string | undefined;
}

export interface KatalogBarangItem {
  id: string;
  kode: string;
  nama: string;
  kategori: "Kertas & Dokumen" | "Tinta & Toner" | "Alat Tulis Kantor" | "Kebersihan & Sarpras";
  satuan: string;
  hargaAcuan: number;
  stokTersedia: number;
  targetUnit?: string;
}

export const UNIT_KERJA_LIST = [
  "Penerimaan Mahasiswa Baru",
  "Perpustakaan",
  "Sekretariat S1 Terapan Perhotelan",
  "Sekretariat S2 Terapan Pariwisata",
  "Sekretariat D3 Perhotelan",
  "Lembaga Sertifikasi Profesi",
] as const;

export const MASTER_DEPARTMENTS = [
  {
    value: "Laboratorium Dapur & Restoran Perhotelan",
    label: "Kitchen (Laboratorium Dapur Praktik Kuliner)",
    category: "Kitchen & Kuliner",
  },
  {
    value: "Keuangan Kitchen (Praktikum & Kasbon)",
    label: "Keuangan Kitchen (Praktikum & Kasbon)",
    category: "Kitchen & Kuliner",
  },
  {
    value: "Penerimaan Mahasiswa Baru",
    label: "PMB (Penerimaan Mahasiswa Baru)",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Perpustakaan",
    label: "Perpus (Perpustakaan)",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Sekretariat S1 Terapan Perhotelan",
    label: "Sekretariat S1 Terapan Perhotelan",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Sekretariat S2 Terapan Pariwisata",
    label: "Sekretariat S2 Terapan Pariwisata",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Sekretariat D3 Perhotelan",
    label: "Sekretariat D3 Perhotelan",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Lembaga Sertifikasi Profesi",
    label: "LSP (Lembaga Sertifikasi Profesi)",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Keuangan Umum & Logistik",
    label: "Keuangan Umum & Logistik",
    category: "Unit Kerja & Administrasi",
  },
  {
    value: "Pusat Kendali Sistem & IT",
    label: "Pusat Kendali Sistem & IT",
    category: "Keuangan & Sistem",
  },
] as const;

export interface ProcurementActivityLog {
  id?: string | number | undefined;
  procurementRequestId?: string | undefined;
  procurement_request_id?: string | undefined;
  userId?: string | number | undefined;
  user_id?: string | number | undefined;
  actorName?: string | undefined;
  actor_name?: string | undefined;
  actorRole?: Role | string | undefined;
  actor_role?: Role | string | undefined;
  action: string;
  statusFrom?: Status | string | null | undefined;
  status_from?: Status | string | null | undefined;
  statusTo: Status | string;
  status_to?: Status | string | undefined;
  notes?: string | null | undefined;
  createdAt?: string | undefined;
  created_at?: string | undefined;
}

export interface User {
  id: string;
  db_id?: number | undefined;
  name: string;
  email: string;
  phone?: string | undefined;
  role: Role;
  unit_id?: string | null | undefined;
  department: string;
  status: "Aktif" | "Nonaktif";
}

export interface UserAccount extends User {
  password?: string | undefined;
}

export interface DummyCredential {
  role: Role;
  label: string;
  email: string;
  pass: string;
  desc: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  targetRole: Role | "Semua";
  requestId?: string | undefined;
  read?: boolean | undefined;
}

export interface HistoricalDataPoint {
  month: string;
  actual: number;
}

export interface IngredientForecastItem {
  id: string;
  name: string;
  unit: string;
  category: "Bahan Segar / Basah (Perishable)" | "Bahan Kering / Tahan Lama";
  history: HistoricalDataPoint[];
}

export interface ForecastCalculationRow {
  month: string;
  actual: number;
  forecast: number;
  error: number;
  absError: number;
  ape: number;
  sqError: number;
}

export interface ForecastResult {
  rows: ForecastCalculationRow[];
  nextForecast: number;
  nextMonthLabel: string;
  horizonForecasts: { month: string; forecast: number }[];
  mape: number;
  mad: number;
  mse: number;
  rmse: number;
  evaluation: string;
}

// ==========================================
// AI FORECASTING TYPES (ALUR B RANDOM FOREST)
// ==========================================
export interface RollingWindowMetric {
  window_index: number;
  test_periods: string[];
  train_periods: string[];
  mae_rf: number;
  mape_rf: number;
  mae_snaive: number;
  mape_snaive: number;
  mae_ma3: number;
  mape_ma3: number;
}

export interface RollingSummary {
  mean_mae_rf: number;
  mean_mape_rf: number;
  std_mape_rf: number;
  mean_mae_snaive: number;
  mean_mape_snaive: number;
  std_mape_snaive: number;
  mean_mae_ma3: number;
  mean_mape_ma3: number;
  std_mape_ma3: number;
}

export interface ForecastModelInfo {
  version: number;
  trained_at: string;
  total_records: number;
  total_months: number;
  total_series: number;
  is_simulated_data: boolean;
  selected_variant: string;
  best_params: Record<string, unknown>;
  rolling_windows: RollingWindowMetric[];
  rolling_summary: RollingSummary;
  model_lebih_baik_dari_baseline: boolean;
  feature_importance: Record<string, number>;
}

export interface AlurBPredictionItem {
  unit_id: string;
  unit_name: string;
  barang_id: string;
  barang_name: string;
  kategori: string;
  satuan: string;
  harga_satuan: number;
  qty_prediksi: number; // Random Forest (Angka Utama)
  qty_snaive: number; // Seasonal Naive (Keterangan kecil / tooltip pembanding)
  qty_baseline: number; // Moving Average 3 (Keterangan kecil / tooltip pembanding)
  tanpa_model: boolean;
  estimasi_biaya: number;
}

export interface OfficialUnit {
  id: string;
  name: string;
  category: string;
}

export interface AlurBPredictionResponse {
  status: string;
  model_tidak_tersedia?: boolean;
  message?: string;
  target_period: string;
  available_units: OfficialUnit[];
  summary: {
    total_items: number;
    total_qty_prediksi: number;
    total_estimasi_biaya: number;
  };
  predictions: AlurBPredictionItem[];
}
