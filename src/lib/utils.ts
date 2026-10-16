import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Jumlah milidetik dalam 1 hari */
export const MS_PER_DAY = 86_400_000;

/** Format angka ke format mata uang Rupiah, e.g. "Rp 1.500.000" */
export const money = (val?: number | null) => "Rp " + (Number(val) || 0).toLocaleString("id-ID");

/** Hitung sisa hari dari hari ini ke tanggal needBy (format ISO: "YYYY-MM-DD") */
export function daysLeft(needBy: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(needBy + "T00:00:00").getTime() - t.getTime()) / MS_PER_DAY);
}

/** Hitung kekurangan bahan berdasarkan kebutuhan dan stok lab */
export function calculateStockDeficit(neededQty: number, currentStock: number): number {
  return Math.max(0, neededQty - currentStock);
}

/** Hitung total harga dan total kuantitas dari daftar rincian barang */
export function calculateRequestTotals(details: { price?: number; qty?: number }[] = []): {
  totalPrice: number;
  totalQty: number;
} {
  return details.reduce(
    (acc, item) => ({
      totalPrice: acc.totalPrice + (Number(item.price) || 0) * (Number(item.qty) || 0),
      totalQty: acc.totalQty + (Number(item.qty) || 0),
    }),
    { totalPrice: 0, totalQty: 0 },
  );
}

export const MONTH_NAMES: { value: string; label: string }[] = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export const MONTH_MAP: Record<string, number> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  agt: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  september: 9,
  sept: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
  december: 12,
};

export interface ParsedRequestDate {
  year: number;
  month: number;
  day: number;
  timestamp: number;
  date: Date;
}

/** Mengurai string tanggal (ISO, DD-MM-YYYY, teks Indonesia) ke { year, month, day, timestamp, date } */
export function parseRequestDate(dateStr?: string): ParsedRequestDate | null {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();

  // 1. ISO format YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(year, month - 1, day);
    return { year, month, day, timestamp: date.getTime(), date };
  }

  // 2. Format DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const year = parseInt(dmyMatch[3], 10);
    const month = parseInt(dmyMatch[2], 10);
    const day = parseInt(dmyMatch[1], 10);
    const date = new Date(year, month - 1, day);
    return { year, month, day, timestamp: date.getTime(), date };
  }

  // 3. Text tokens like "29 Sep 2026" or "01 Okt 2026"
  const tokens = s.split(/[\s,.-]+/);
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      year = parseInt(token, 10);
    } else if (MONTH_MAP[token]) {
      month = MONTH_MAP[token];
    } else if (/^\d{1,2}$/.test(token) && day === null) {
      day = parseInt(token, 10);
    }
  }

  if (year && month) {
    const validDay = day && day >= 1 && day <= 31 ? day : 1;
    const date = new Date(year, month - 1, validDay);
    return {
      year,
      month,
      day: validDay,
      timestamp: date.getTime(),
      date,
    };
  }

  // 4. Native Date fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      timestamp: d.getTime(),
      date: d,
    };
  }

  return null;
}

/**
 * Kompresi gambar sisi klien sebelum konversi ke Base64 (menggunakan Canvas API)
 * Target: max dimension 1280px, quality 0.7 JPEG, ukuran target < 800 KB
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("File yang diunggah harus berupa gambar (JPEG/PNG/WebP)."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto bon."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal merender gambar untuk kompresi."));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const SRS_UNITS: Record<string, { nama: string; kode: string }> = {
  PMB: { nama: "Penerimaan Mahasiswa Baru", kode: "PMB" },
  PERPUS: { nama: "Perpustakaan", kode: "PERPUS" },
  "SEKR-S1": { nama: "Sekretariat S1 Terapan Perhotelan", kode: "SEKR-S1" },
  "SEKR-S2": { nama: "Sekretariat S2 Terapan Pariwisata", kode: "SEKR-S2" },
  "SEKR-D3": { nama: "Sekretariat D3 Perhotelan", kode: "SEKR-D3" },
  LSP: { nama: "Lembaga Sertifikasi Profesi", kode: "LSP" },
};

/**
 * Format label unit menjadi "{nama} ({kode})" secara konsisten tanpa menduplikasi kode.
 */
export function formatUnitLabel(
  unit?:
    | {
        nama?: string | null;
        name?: string | null;
        kode?: string | null;
        code?: string | null;
        id?: string | number | null;
      }
    | string
    | null,
  fallbackKode?: string,
): string {
  if (!unit) return "";

  if (typeof unit === "string") {
    const trimmed = unit.trim();
    if (!trimmed) return "";
    const upper = trimmed.toUpperCase();

    // Jika passed kode unit (e.g. "PMB")
    const srsMatch = SRS_UNITS[upper];
    if (srsMatch) {
      return `${srsMatch.nama} (${srsMatch.kode})`;
    }

    // Jika nama sudah memuat kode di akhir dalam kurung: e.g. "Penerimaan Mahasiswa Baru (PMB)"
    const match = trimmed.match(/^(.+?)\s*\(([A-Za-z0-9_-]+)\)$/);
    if (match) {
      const baseName = match[1]?.trim() || "";
      const code = match[2]?.trim() || "";
      const srsByCode = SRS_UNITS[code.toUpperCase()];
      if (srsByCode) {
        return `${srsByCode.nama} (${code.toUpperCase()})`;
      }
      return `${baseName} (${code})`;
    }

    // Cek apakah trimmed cocok dengan salah satu nama SRS
    for (const item of Object.values(SRS_UNITS)) {
      if (item.nama.toLowerCase() === trimmed.toLowerCase()) {
        return `${item.nama} (${item.kode})`;
      }
    }

    if (fallbackKode) {
      return `${trimmed} (${fallbackKode})`;
    }

    return trimmed;
  }

  const rawNama = (unit.nama || unit.name || "").trim();
  const rawKode = (
    unit.kode ||
    unit.code ||
    (typeof unit.id === "string" ? unit.id : "") ||
    fallbackKode ||
    ""
  ).trim();

  let cleanNama = rawNama;
  let codeFromNama = "";
  const match = rawNama.match(/^(.+?)\s*\(([A-Za-z0-9_-]+)\)$/);
  if (match) {
    cleanNama = match[1]?.trim() || "";
    codeFromNama = match[2]?.trim() || "";
  }

  const effectiveKode = (rawKode || codeFromNama).toUpperCase();
  const srsEffective = SRS_UNITS[effectiveKode];

  if (srsEffective) {
    return `${srsEffective.nama} (${srsEffective.kode})`;
  }

  if (cleanNama && effectiveKode) {
    return `${cleanNama} (${effectiveKode})`;
  }

  return cleanNama || effectiveKode || (unit.id ? String(unit.id) : "");
}

/**
 * Filter kecocokan pengajuan staf berdasarkan unit kerja Koordinator Alur B
 */
export function matchesCoordinatorUnit(
  request: {
    unitKerja?: string | undefined;
    department?: string | undefined;
    applicant?: string | undefined;
  },
  coordinatorDept?: string | undefined,
): boolean {
  if (!coordinatorDept) return true;
  const cDept = coordinatorDept.toLowerCase().trim();
  const rUnit = (request.unitKerja || "").toLowerCase().trim();
  const rDept = (request.department || "").toLowerCase().trim();
  const rApplicant = (request.applicant || "").toLowerCase().trim();

  const checkMatch = (kw: string) => {
    return (
      (rUnit.includes(kw) || rDept.includes(kw) || rApplicant.includes(kw)) && cDept.includes(kw)
    );
  };

  if (checkMatch("sekre") || checkMatch("rektorat") || checkMatch("pimpinan")) return true;
  if (checkMatch("perpus") || checkMatch("pustaka")) return true;
  if (checkMatch("pmb") || checkMatch("marketing")) return true;
  if (checkMatch("lsp") || checkMatch("sertifikasi")) return true;
  if (checkMatch("lab") || checkMatch("komputer")) return true;

  return (
    (rUnit.length > 0 && cDept.includes(rUnit)) ||
    (rUnit.length > 0 && rUnit.includes(cDept)) ||
    (rDept.length > 0 && cDept.includes(rDept)) ||
    (rDept.length > 0 && rDept.includes(cDept))
  );
}
