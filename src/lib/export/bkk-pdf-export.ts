import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { money, parseRequestDate, MONTH_NAMES } from "@/lib/utils";
import type { RequestItem, Status } from "@/types/procurement";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

/**
 * Konversi angka nominal uang ke kalimat terbilang Rupiah resmi Indonesia.
 * Menangani satuan, belasan, puluhan, ratusan, ribuan, jutaan, miliaran, triliunan.
 */
export function terbilang(n: number): string {
  const angka = Math.floor(Math.abs(n || 0));
  if (angka === 0) return "Nol Rupiah";

  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function bilang(num: number): string {
    if (num < 12) {
      return satuan[num] || "";
    } else if (num < 20) {
      return bilang(num - 10) + " Belas";
    } else if (num < 100) {
      return bilang(Math.floor(num / 10)) + " Puluh " + bilang(num % 10);
    } else if (num < 200) {
      return "Seratus " + bilang(num - 100);
    } else if (num < 1000) {
      return bilang(Math.floor(num / 100)) + " Ratus " + bilang(num % 100);
    } else if (num < 2000) {
      return "Seribu " + bilang(num - 1000);
    } else if (num < 1000000) {
      return bilang(Math.floor(num / 1000)) + " Ribu " + bilang(num % 1000);
    } else if (num < 1000000000) {
      return bilang(Math.floor(num / 1000000)) + " Juta " + bilang(num % 1000000);
    } else if (num < 1000000000000) {
      return bilang(Math.floor(num / 1000000000)) + " Miliar " + bilang(num % 1000000000);
    } else {
      return bilang(Math.floor(num / 1000000000000)) + " Triliun " + bilang(num % 1000000000000);
    }
  }

  const teks = bilang(angka).replace(/\s+/g, " ").trim();
  return `${teks} Rupiah`;
}

/**
 * Validasi status pengajuan: BKK sah dicetak jika status minimal
 * 'Disetujui Kaprodi' atau 'Dana Dicairkan' ke atas.
 */
export function isBkkPrintable(status: Status): boolean {
  const allowedStatuses: Status[] = [
    "DISETUJUI_KAPRODI",
    "DANA_DICAIRKAN",
    "SEDANG_DIBELANJAKAN",
    "BARANG_DITERIMA",
    "LAPORAN_BELANJA_DIAJUKAN",
    "SELESAI",
  ];
  return allowedStatuses.includes(status);
}

/**
 * Format string tanggal ke format formal Bahasa Indonesia: "DD MMMM YYYY".
 */
function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date();
    return `${today.getDate()} ${
      MONTH_NAMES[today.getMonth()]?.label || "Oktober"
    } ${today.getFullYear()}`;
  }

  const parsed = parseRequestDate(dateStr);
  if (parsed) {
    const monthObj = MONTH_NAMES.find((m) => m.value === String(parsed.month));
    const monthLabel = monthObj ? monthObj.label : "Oktober";
    return `${parsed.day} ${monthLabel} ${parsed.year}`;
  }

  return dateStr;
}

/**
 * Menggambar 1 lembar halaman Bukti Kas Keluar (BKK) resmi pada objek jsPDF
 */
export function renderBkkPage(doc: jsPDF, req: RequestItem): void {
  const applyAutoTable = (d: jsPDF, opts: UserOptions) => {
    const fn =
      (autoTable as unknown as { default?: (doc: jsPDF, options: UserOptions) => void }).default ||
      autoTable;
    fn(d, opts);
  };

  const currentYear = new Date().getFullYear();
  const cleanId = (req.id || "001").replace(/^PR-?/i, "").padStart(3, "0");
  const bkkNumber = `BKK/ASAINDO/KEU/${currentYear}/${cleanId}`;
  const tanggalCetak = formatIndonesianDate(req.date);

  // ==========================================
  // 1. KOP RESMI KAMPUS / LABORATORIUM
  // ==========================================
  doc.setFillColor(128, 0, 0); // Maroon #800000
  doc.roundedRect(14, 12, 17, 17, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("ASAI", 22.5, 20.5, { align: "center" });
  doc.setFontSize(7);
  doc.text("NDO", 22.5, 24.5, { align: "center" });

  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("YAYASAN PENDIDIKAN ASAINDO NUSANTARA", 35, 15);

  doc.setTextColor(128, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INSTITUT TEKNOLOGI & BISNIS ASAINDO", 35, 20.5);

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DIREKTORAT KEUANGAN & PENGELOLAAN ASET - KAS PENGELUARAN", 35, 25);

  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    "Kampus Terpadu: Jl. Raya ASAINDO No. 88, Jakarta Timur 13440 | Telp: (021) 8611-2026 | perbendaharaan@asaindo.ac.id",
    35,
    29,
  );

  // Garis Kop Ganda
  doc.setDrawColor(128, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(14, 32.5, 196, 32.5);
  doc.setLineWidth(0.2);
  doc.line(14, 33.7, 196, 33.7);

  // ==========================================
  // 2. JUDUL DOKUMEN & IDENTITAS TRANSAKSI
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(128, 0, 0);
  doc.text("BUKTI KAS KELUAR (BKK)", 105, 41, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("KUITANSI PENCAIRAN DANA OPERASIONAL BELANJA PRAKTIKUM", 105, 45.5, { align: "center" });

  const prodiName = req.prodi || req.department || req.course || "D4 Manajemen Tata Boga / Kuliner";
  const keperluanBelanja =
    req.menu || req.item || req.purpose || "Pengadaan Bahan Praktikum Mahasiswa";

  applyAutoTable(doc, {
    startY: 48,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, textColor: [70, 70, 70] },
      1: { cellWidth: 62 },
      2: { fontStyle: "bold", cellWidth: 32, textColor: [70, 70, 70] },
      3: { cellWidth: 56 },
    },
    body: [
      ["Nomor Dokumen BKK", `: ${bkkNumber}`, "Tanggal Pencairan", `: ${tanggalCetak}`],
      ["Nomor Pengadaan (PR)", `: ${req.id}`, "Status Pengadaan", `: ${req.status}`],
      [
        "Diterima Oleh (Asdos)",
        `: ${req.applicant || "Asisten Dosen"}`,
        "Program Studi / Unit",
        `: ${prodiName}`,
      ],
      [
        "Mata Kuliah Praktik",
        `: ${req.course || req.department || "-"}`,
        "Tenggat Waktu Pakai",
        `: ${req.deadline || req.needBy || "-"}`,
      ],
      [
        "Keperluan Belanja",
        `: ${keperluanBelanja}`,
        "Metode Pencairan",
        ": Transfer Kas Operasional Lab",
      ],
    ],
  });

  // ==========================================
  // 3. TABEL RINCIAN BARANG YANG DICAIRKAN
  // ==========================================
  const details =
    req.details && req.details.length > 0
      ? req.details
      : [
          {
            id: "item-1",
            name: req.menu || req.item || "Paket Belanja Praktikum",
            qty: req.qty || 1,
            unit: req.unit || "paket",
            price: req.price || 0,
          },
        ];

  const nominalTotal =
    (req.danaDiterima || req.nominalTransfer || 0) > 0
      ? req.danaDiterima || req.nominalTransfer || 0
      : req.price || 0;

  const tableRows = details.map((d, idx) => {
    const q = Number(d.qty) || 0;
    const p = Number(d.price) || 0;
    const subtotal = q * p;
    return [String(idx + 1), d.name, `${q}`, d.unit || "unit", money(p), money(subtotal)];
  });

  const docWithTable = doc as JsPDFWithAutoTable;
  const startTableY = docWithTable.lastAutoTable?.finalY
    ? docWithTable.lastAutoTable.finalY + 4
    : 76;

  applyAutoTable(doc, {
    startY: startTableY,
    theme: "grid",
    head: [
      [
        "No",
        "Rincian Bahan Baku / Komoditas Praktikum",
        "Kuantitas",
        "Satuan",
        "Harga Satuan (Rp)",
        "Jumlah Biaya (Rp)",
      ],
    ],
    body: tableRows,
    foot: [["", "TOTAL NOMINAL PENCAIRAN DANA KAS KELUAR", "", "", "", money(nominalTotal)]],
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 30, 30],
      lineColor: [215, 220, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    footStyles: {
      fillColor: [244, 246, 248],
      textColor: [128, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 72 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "right", cellWidth: 33 },
      5: { halign: "right", cellWidth: 33 },
    },
  });

  // ==========================================
  // 4. KOTAK NOMINAL ANGKA & TERBILANG (RUPIAH)
  // ==========================================
  let currentY = docWithTable.lastAutoTable?.finalY ? docWithTable.lastAutoTable.finalY + 4 : 140;

  if (currentY > 200) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(200, 205, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 182, 18, 1.5, 1.5, "FD");

  // Aksen bar vertikal merah
  doc.setFillColor(128, 0, 0);
  doc.rect(14, currentY, 2.5, 18, "F");

  // Nominal Uang
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text("Jumlah Kas Dicairkan :", 20, currentY + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(128, 0, 0);
  doc.text(money(nominalTotal), 60, currentY + 6);

  // Kalimat Terbilang
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text("Terbilang :", 20, currentY + 13);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(`# ${terbilang(nominalTotal)} #`, 38, currentY + 13);

  // Catatan SOP Realisasi & Laporan Belanja
  const noteY = currentY + 23;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Ketentuan Laporan Belanja Keuangan:", 14, noteY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "1. Dana kas ini diserahkan kepada Pemohon/Asdos untuk pembelanjaan bahan praktikum sesuai rincian di atas.",
    14,
    noteY + 4,
  );
  doc.text(
    "2. Pemohon wajib melampirkan foto/bon belanja asli dalam sistem SPAKE paling lambat H+2 setelah praktikum.",
    14,
    noteY + 7.5,
  );
  doc.text(
    "3. Selisih lebih dana wajib disetorkan kembali, atau carry-over otomatis dicatat jika terjadi defisit dengan persetujuan Keuangan.",
    14,
    noteY + 11,
  );

  // ==========================================
  // 5. KOLOM 3 TANDA TANGAN RESMI
  // ==========================================
  const signY = noteY + 17;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Jakarta, ${tanggalCetak}`, 169, signY, { align: "center" });

  const roleY = signY + 4;
  // Kolom 1 (Kiri): Dibuat / Diterima Oleh (Asdos)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Dibuat / Diterima Oleh,", 41, roleY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Pemohon (Asisten Dosen)", 41, roleY + 4, { align: "center" });

  // Kolom 2 (Tengah): Mengetahui (Kaprodi)
  doc.setFont("helvetica", "normal");
  doc.text("Mengetahui & Menyetujui,", 105, roleY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Ketua Program Studi", 105, roleY + 4, { align: "center" });

  // Kolom 3 (Kanan): Disetujui / Dibayarkan (Keuangan)
  doc.setFont("helvetica", "normal");
  doc.text("Disetujui & Dibayarkan Oleh,", 169, roleY, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Bagian Keuangan / Bendahara", 169, roleY + 4, { align: "center" });

  const nameY = roleY + 25;

  // Kolom 1: Nama Asdos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  const applicantName = req.applicant || "Asisten Dosen Pengampu";
  doc.text(`( ${applicantName} )`, 41, nameY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text("NIDN / NIK: ................................", 41, nameY + 4, {
    align: "center",
  });

  // Kolom 2: Nama Kaprodi
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("( Dr. Ir. Rina Kusuma, M.Sc )", 105, nameY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text("NIP: 19780512 200312 2 001", 105, nameY + 4, { align: "center" });

  // Kolom 3: Nama Staf Keuangan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("( Siti Aminah, S.E. )", 169, nameY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text("NIP: 19850415 200801 2 003", 169, nameY + 4, { align: "center" });

  // ==========================================
  // 6. WATERMARK FOOTER DOKUMEN
  // ==========================================
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(14, 283, 196, 283);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "SPAKE ASAINDO - Bukti Kas Keluar Resmi | Cetak otomatis oleh sistem | Rangkap: [1] Keuangan  [2] Pemohon",
    14,
    287,
  );
  doc.text(`ID: ${req.id} | ${bkkNumber}`, 196, 287, { align: "right" });
}

/**
 * Ekspor Dokumen Tunggal "Bukti Kas Keluar (BKK) / Kuitansi Pencairan Dana Pengadaan"
 */
export function exportBkkPdf(req: RequestItem, notify?: (msg: string) => void): void {
  try {
    if (!isBkkPrintable(req.status)) {
      const warningMsg = `Bukti Kas Keluar belum dapat dicetak. Status pengajuan '${req.status}' belum disetujui Kaprodi / Keuangan.`;
      if (notify) notify(warningMsg);
      else alert(warningMsg);
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    renderBkkPage(doc, req);

    const safeApplicant = (req.applicant || "Asdos").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `BKK_${req.id}_${safeApplicant}.pdf`;
    doc.save(filename);

    if (notify) {
      notify(`Dokumen Bukti Kas Keluar (${req.id}) berhasil diunduh.`);
    }
  } catch (error) {
    console.error("Gagal membuat dokumen BKK PDF:", error);
    if (notify) {
      notify("Terjadi kesalahan saat mencetak Bukti Kas Keluar.");
    }
  }
}

/**
 * Ekspor Kolektif / Batch Rekap Bukti Kas Keluar (BKK) Bulanan
 * Menggabungkan seluruh pengajuan yang dicairkan/selesai ke dalam satu file PDF
 */
export function exportBatchBkkPdf(
  requests: RequestItem[],
  periodTitle?: string,
  notify?: (msg: string) => void,
  applicantFilter?: string,
): void {
  try {
    let targetRequests = requests;
    if (applicantFilter && applicantFilter !== "Semua Asdos") {
      targetRequests = targetRequests.filter((r) => r.applicant === applicantFilter);
    }
    const eligibleRequests = targetRequests.filter((r) => isBkkPrintable(r.status));

    if (eligibleRequests.length === 0) {
      const emptyMsg = `Tidak ditemukan pengajuan dengan status Dicairkan atau Selesai untuk ${applicantFilter && applicantFilter !== "Semua Asdos" ? applicantFilter : "periode ini"}.`;
      if (notify) notify(emptyMsg);
      else alert(emptyMsg);
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    eligibleRequests.forEach((req, idx) => {
      if (idx > 0) {
        doc.addPage();
      }
      renderBkkPage(doc, req);
    });

    const safePeriod = (periodTitle || "Periode_Semua").replace(/[^a-zA-Z0-9]/g, "_");
    const safeApplicant =
      applicantFilter && applicantFilter !== "Semua Asdos"
        ? `_${applicantFilter.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
    const filename = `Rekap_BKK${safeApplicant}_${safePeriod}.pdf`;
    doc.save(filename);

    if (notify) {
      notify(
        `Rekap ${eligibleRequests.length} lembar BKK (${applicantFilter || "Semua"}) berhasil diunduh.`,
      );
    }
  } catch (error) {
    console.error("Gagal mengekspor rekap BKK kolektif:", error);
    if (notify) {
      notify("Terjadi kesalahan saat mengekspor rekap BKK kolektif.");
    }
  }
}
