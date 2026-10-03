export type Role = "Staf / Asdos" | "Koordinator" | "Kaprodi" | "Bagian Keuangan" | "Super Admin";

export type Status =
  | "Diajukan"
  | "Diverifikasi Koordinator"
  | "Disetujui Kaprodi"
  | "Dana Dicairkan"
  | "Proses Pembelian"
  | "Laporan Belanja Diajukan"
  | "Selesai"
  | "Ditolak";

export const SIKLUS_TAHAPAN: Status[] = [
  "Diajukan",
  "Diverifikasi Koordinator",
  "Disetujui Kaprodi",
  "Dana Dicairkan",
  "Proses Pembelian",
  "Laporan Belanja Diajukan",
  "Selesai",
];

export const SIKLUS_DETAILS: Record<Status, { label: string; desc: string }> = {
  Diajukan: { label: "Diajukan", desc: "Permohonan bahan diajukan oleh Staf / Asdos" },
  "Diverifikasi Koordinator": { label: "Diverifikasi Koordinator", desc: "Ditinjau & disesuaikan Qty standar oleh Koordinator Lab" },
  "Disetujui Kaprodi": { label: "Disetujui Kaprodi", desc: "Disetujui Kaprodi & diajukan ke Bagian Keuangan" },
  "Dana Dicairkan": { label: "Dana Dicairkan", desc: "Dana di-ACC & ditransfer Bagian Keuangan ke Asdos" },
  "Proses Pembelian": { label: "Proses Pembelian", desc: "Asdos belanja bahan di pasar/vendor" },
  "Laporan Belanja Diajukan": { label: "Laporan Belanja", desc: "Asdos upload bon/nota & lapor selisih kembalian / kurang dana" },
  Selesai: { label: "Selesai", desc: "LPJ diverifikasi Keuangan & transaksi resmi ditutup" },
  Ditolak: { label: "Ditolak", desc: "Permohonan ditolak oleh reviewer" },
};

export interface RecipeIngredient {
  name: string;
  neededQty: number;
  unit: string;
  pricePerUnit: number;
}

export interface MenuItemRecipe {
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

export interface RequestDetail {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  neededQty?: number;
  stockInLab?: number;
}

export interface RequestItem {
  id: string;
  item: string; // Judul Pengajuan (Menu Praktik)
  category: string;
  prodi?: string;
  semester?: number;
  course?: string;
  menu?: string;
  qty: number; // Jumlah total item
  unit: string;
  price: number; // Total harga diajukan
  details?: RequestDetail[];
  urgency: "Normal" | "Mendesak";
  academicImportance: "Tinggi" | "Sedang" | "Standar";
  applicant: string;
  department: string;
  date: string;
  status: Status;
  needBy: string;
  deadline?: string;
  purpose?: string;
  note?: string;

  // Fitur Keuangan & Pelaporan Asdos
  disbursedAmount?: number; // Dana yang ditransfer Keuangan
  actualSpent?: number; // Realisasi belanja berdasarkan nota
  refundAmount?: number; // Sisa uang belanja (dipegang Asdos)
  deficitAmount?: number; // Uang belanja kurang (klaim penggantian ke Keuangan)
  reimbursementStatus?: "Belum Diajukan" | "Perlu Diganti Keuangan" | "Telah Diganti" | "Tidak Ada Selisih";
  receiptImages?: string[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  department: string;
  status: "Aktif" | "Nonaktif";
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
  requestId?: string;
  read?: boolean;
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
