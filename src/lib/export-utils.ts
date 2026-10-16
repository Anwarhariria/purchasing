import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import ExcelJS from "exceljs";
import { money } from "@/lib/utils";
import type { RequestItem } from "@/types/procurement";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export {
  exportBkkPdf,
  exportBatchBkkPdf,
  isBkkPrintable,
  terbilang,
} from "./export/bkk-pdf-export";

// Helper universal download menggunakan Blob HTML5 native
export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 1000);
}

// Rekap Pengadaan & Laporan Belanja dalam bentuk Excel (menggunakan ExcelJS)
export async function exportExcel(
  requests: RequestItem[],
  options?: { periodLabel?: string; applicantFilter?: string },
  notify?: (msg: string) => void,
) {
  try {
    const workbook = new ExcelJS.Workbook();
    const ws1 = workbook.addWorksheet("Rekap Belanja & Kasbon");

    const filterText =
      options?.applicantFilter && options.applicantFilter !== "Semua Asdos"
        ? `Pemohon: ${options.applicantFilter} | Rentang Waktu: ${options.periodLabel || "Semua"}`
        : `Rentang Waktu: ${options?.periodLabel || "Semua Periode"} | Seluruh Pemohon`;

    // Header Lembaga
    ws1.addRow(["UNIVERSITAS ASA INDONESIA (ASAINDO) - SISTEM PENGADAAN KAMPUS (SPAKE)"]);
    ws1.getRow(1).font = { bold: true, size: 14, color: { argb: "FF800000" } };
    ws1.addRow(["LAPORAN REALISASI PEMBELANJAAN & REKONSILIASI BUKU KASBON"]);
    ws1.getRow(2).font = { bold: true, size: 11, color: { argb: "FF1E3A8A" } };
    ws1.addRow([filterText]);
    ws1.getRow(3).font = { italic: true, size: 10, color: { argb: "FF555555" } };
    ws1.addRow([]);

    // Hitung total akumulatif
    let totalTf = 0;
    let totalBon = 0;
    let totalKembalian = 0;
    let totalKurang = 0;

    requests.forEach((r) => {
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        (r.status === "SELESAI" || r.status === "DANA_DICAIRKAN" ? r.price : 0);
      totalTf += tf;
      totalBon += r.actualSpent || 0;
      totalKembalian += r.refundAmount || 0;
      totalKurang += r.deficitAmount || 0;
    });

    // KOTAK RINGKASAN KASBON KEUANGAN (EXECUTIVE SUMMARY)
    ws1.addRow(["--- RINGKASAN KEUANGAN & KASBON PERIODE INI ---"]);
    ws1.getRow(5).font = { bold: true, size: 10, color: { argb: "FF333333" } };
    ws1.addRow([
      `Total Transaksi Belanja: ${requests.length} kali`,
      `Total Dana Ditransfer (TF): ${money(totalTf)}`,
      `Total Belanja Riil (Bon): ${money(totalBon)}`,
      `Sisa Kas di Asdos (Kembalian): ${money(totalKembalian)}`,
      `Total Tombok Asdos (Kekurangan): ${money(totalKurang)}`,
    ]);
    ws1.getRow(6).font = { bold: true, size: 10 };
    ws1.getRow(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F9FF" }, // Light sky
    };
    ws1.addRow([
      "",
      totalKurang > 0
        ? `STATUS KAS: Terdapat tombok Asdos sebesar ${money(totalKurang)} yang akan di-carry-over ke pencairan kasbon berikutnya.`
        : totalKembalian > 0
          ? `STATUS KAS: Terdapat sisa uang kembalian ${money(totalKembalian)} yang dipegang Asdos untuk kas lab.`
          : "STATUS KAS: Seluruh kas belanja klir / seimbang (Rp 0).",
    ]);
    ws1.getRow(7).font = { italic: true, bold: true, size: 10, color: { argb: "FF0369A1" } };
    ws1.addRow([]);

    // TABEL RINCIAN TRANSAKSI
    const headers = [
      "No",
      "Tanggal Belanja",
      "Kode PR/PO",
      "Nama Pemohon (Asdos/Staf)",
      "Menu Praktik / Keperluan",
      "Rincian Bahan yang Dipesan",
      "No. Bon & Toko Belanja",
      "Status Bon Fisik",
      "Dana Ditransfer (TF)",
      "Realisasi Belanja (Bon)",
      "Sisa Kembalian (Di Asdos)",
      "Tgl Setor Kembalian",
      "Uang Belanja Kurang (Tombok)",
      "Status Carry-over",
      "Status Kasbon",
      "Status Pengadaan",
    ];
    const headerRow = ws1.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF800000" }, // Maroon
    };

    requests.forEach((r, idx) => {
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        (r.status === "SELESAI" || r.status === "DANA_DICAIRKAN" ? r.price : 0);
      const bon = r.actualSpent || 0;
      const kembalian = r.refundAmount || 0;
      const kurang = r.deficitAmount || 0;

      // Rincian bahan yang dipesan dalam 1 string rapi
      const bahanStr =
        r.details && r.details.length > 0
          ? r.details
              .map((d) => `${d.name} (${d.qty} ${d.unit}${d.price ? ` @ ${money(d.price)}` : ""})`)
              .join("; ")
          : r.menu || r.item || "-";

      const bonToko = r.receiptNo
        ? `${r.receiptNo} (${r.storeName || "Toko/Pasar"})`
        : r.receiptImages && r.receiptImages.length > 0
          ? `Ada Nota (${r.receiptImages.length} Bukti Fisik)`
          : "Belum Unggah Bon";

      const bonKet =
        r.receiptImages && r.receiptImages.length > 0
          ? "Valid (Lampiran di Sheet Bon)"
          : "Belum Unggah Bon";

      const tglSetor = r.refundDate || (kembalian > 0 ? r.date : "-");
      const statusCarryOver = kurang > 0 ? "Carry-over berikutnya" : "-";

      let statusKasbon = "Pas / Lunas";
      if (kurang > 0) statusKasbon = `Tombok Asdos (- ${money(kurang)})`;
      else if (kembalian > 0) statusKasbon = `Kas di Asdos (+ ${money(kembalian)})`;

      ws1.addRow([
        idx + 1,
        r.date || r.needBy || "-",
        r.id,
        r.applicant || "Asisten Dosen",
        r.menu || r.item || "-",
        bahanStr,
        bonToko,
        bonKet,
        tf,
        bon,
        kembalian,
        tglSetor,
        kurang,
        statusCarryOver,
        statusKasbon,
        r.status,
      ]);
    });

    // Baris Total Akumulatif
    const totalRow = ws1.addRow([
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      totalTf,
      totalBon,
      totalKembalian,
      "",
      totalKurang,
      "",
      totalKurang > 0
        ? `Defisit: - ${money(totalKurang)}`
        : totalKembalian > 0
          ? `Sisa Kas: + ${money(totalKembalian)}`
          : "Seimbang (Rp 0)",
      "",
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" }, // Emerald tint
    };

    ws1.getColumn(1).width = 6;
    ws1.getColumn(2).width = 16;
    ws1.getColumn(3).width = 15;
    ws1.getColumn(4).width = 24;
    ws1.getColumn(5).width = 28;
    ws1.getColumn(6).width = 42;
    ws1.getColumn(7).width = 30;
    ws1.getColumn(8).width = 25;
    ws1.getColumn(9).width = 18;
    ws1.getColumn(10).width = 18;
    ws1.getColumn(11).width = 18;
    ws1.getColumn(12).width = 18;
    ws1.getColumn(13).width = 18;
    ws1.getColumn(14).width = 18;
    ws1.getColumn(15).width = 25;
    ws1.getColumn(16).width = 22;

    // SHEET 2: LAMPIRAN BUKTI BON BELANJA (TABEL REKAP BUKTI NOTA FISIK)
    const wsBon = workbook.addWorksheet("Lampiran Bukti Bon Belanja");
    wsBon.addRow(["UNIVERSITAS ASA INDONESIA (ASAINDO) - LAMPIRAN BUKTI FISIK BON BELANJA ASDOS"]);
    wsBon.getRow(1).font = { bold: true, size: 13, color: { argb: "FF800000" } };
    wsBon.addRow(["Daftar Bukti Fisik Nota & Kuitansi Pembelanjaan yang Diverifikasi Keuangan"]);
    wsBon.getRow(2).font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
    wsBon.addRow([filterText]);
    wsBon.getRow(3).font = { italic: true, size: 9, color: { argb: "FF555555" } };
    wsBon.addRow([]);

    const bonHeaders = [
      "No",
      "Kode PR",
      "Tanggal Belanja",
      "Nama Pemohon",
      "Menu / Keperluan",
      "No. Nota / Bon",
      "Toko / Vendor Belanja",
      "Nominal Belanja Riil (Rp)",
      "Dana Kasbon Ditransfer (Rp)",
      "Status Kasbon",
      "Tgl Kembalian / Status Penyelesaian",
      "Status Verifikasi Fisik",
      "Dokumen Bukti Nota",
    ];
    const bonHeaderRow = wsBon.addRow(bonHeaders);
    bonHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    bonHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF065F46" }, // Emerald 800
    };

    let bNo = 1;
    const requestsWithBon = requests.filter(
      (r) => r.receiptNo || (r.receiptImages && r.receiptImages.length > 0) || r.actualSpent,
    );

    let totalBonNominal = 0;
    requestsWithBon.forEach((r) => {
      const tglSelesai = r.refundDate || r.deficitDate || r.date || "-";
      const statusKas =
        r.deficitAmount && r.deficitAmount > 0
          ? `Tombok Asdos (- ${money(r.deficitAmount)})`
          : r.refundAmount && r.refundAmount > 0
            ? `Kas di Asdos (+ ${money(r.refundAmount)})`
            : "Pas / Lunas (Rp 0)";

      const actual = r.actualSpent || r.price || 0;
      totalBonNominal += actual;

      wsBon.addRow([
        bNo++,
        r.id,
        r.date || r.needBy || "-",
        r.applicant || "Asdos",
        r.menu || r.item || "-",
        r.receiptNo || "NOTA-ASLI",
        r.storeName || "Pasar Tradisional / Swalayan",
        actual,
        r.danaDiterima || r.nominalTransfer || actual,
        statusKas,
        tglSelesai,
        "Terverifikasi Keuangan",
        r.receiptNo ? `Bukti Nota Fisik ${r.receiptNo}` : "Nota Fisik Terlampir",
      ]);
    });

    const totalBonRow = wsBon.addRow([
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      totalBonNominal,
      "",
      "",
      "",
      "",
      "",
    ]);
    totalBonRow.font = { bold: true };
    totalBonRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" },
    };

    wsBon.getColumn(1).width = 6;
    wsBon.getColumn(2).width = 14;
    wsBon.getColumn(3).width = 16;
    wsBon.getColumn(4).width = 24;
    wsBon.getColumn(5).width = 28;
    wsBon.getColumn(6).width = 18;
    wsBon.getColumn(7).width = 32;
    wsBon.getColumn(8).width = 22;
    wsBon.getColumn(9).width = 22;
    wsBon.getColumn(10).width = 25;
    wsBon.getColumn(11).width = 22;
    wsBon.getColumn(12).width = 22;
    wsBon.getColumn(13).width = 26;

    // SHEET 2: RINCIAN BAHAN DETAIL PER BARIS (DAFTAR ITEM LENGKAP)
    const ws2 = workbook.addWorksheet("Rincian Item Bahan Lengkap");
    ws2.addRow(["RINCIAN DETAIL BAHAN / BARANG YANG DIPESAN PER TRANSAKSI"]);
    ws2.getRow(1).font = { bold: true, size: 12, color: { argb: "FF800000" } };
    ws2.addRow([filterText]);
    ws2.getRow(2).font = { italic: true, size: 9, color: { argb: "FF555555" } };
    ws2.addRow([]);

    const detailHeaders = [
      "No",
      "Kode PR/PO",
      "Tanggal",
      "Nama Pemohon",
      "Menu / Keperluan",
      "Nama Bahan / Barang",
      "Jumlah (Qty)",
      "Satuan",
      "Harga Satuan (Rp)",
      "Subtotal (Rp)",
      "Status Pengadaan",
    ];
    const detailHeaderRow = ws2.addRow(detailHeaders);
    detailHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    detailHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Blue
    };

    let dNo = 1;
    let grandSubtotal = 0;
    requests.forEach((r) => {
      if (r.details && r.details.length > 0) {
        r.details.forEach((d) => {
          const itemSubtotal = (Number(d.qty) || 0) * (Number(d.price) || 0);
          grandSubtotal += itemSubtotal;
          ws2.addRow([
            dNo++,
            r.id,
            r.date || r.needBy || "-",
            r.applicant || "-",
            r.menu || r.item || "-",
            d.name,
            d.qty,
            d.unit || "unit",
            d.price || 0,
            itemSubtotal,
            r.status,
          ]);
        });
      } else {
        grandSubtotal += r.price || 0;
        ws2.addRow([
          dNo++,
          r.id,
          r.date || r.needBy || "-",
          r.applicant || "-",
          r.menu || r.item || "-",
          r.menu || r.item || "-",
          r.qty || 1,
          r.unit || "paket",
          r.price || 0,
          r.price || 0,
          r.status,
        ]);
      }
    });

    const detailTotalRow = ws2.addRow([
      "",
      "TOTAL ESTIMASI BIAYA BAHAN",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      grandSubtotal,
      "",
    ]);
    detailTotalRow.font = { bold: true };
    detailTotalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" },
    };

    ws2.getColumn(1).width = 6;
    ws2.getColumn(2).width = 14;
    ws2.getColumn(3).width = 15;
    ws2.getColumn(4).width = 24;
    ws2.getColumn(5).width = 28;
    ws2.getColumn(6).width = 34;
    ws2.getColumn(7).width = 14;
    ws2.getColumn(8).width = 12;
    ws2.getColumn(9).width = 18;
    ws2.getColumn(10).width = 20;
    ws2.getColumn(11).width = 20;

    // SHEET 3: REKAP PER NAMA ASDOS / STAF
    const ws3 = workbook.addWorksheet("Rekap Per Nama Asdos");
    ws3.addRow(["REKAPITULASI DANA & KAS BELANJA PER NAMA PEMOHON"]);
    ws3.getRow(1).font = { bold: true, size: 12, color: { argb: "FF800000" } };
    ws3.addRow([`Periode: ${options?.periodLabel || "Semua Periode"}`]);
    ws3.getRow(2).font = { italic: true, size: 9, color: { argb: "FF555555" } };
    ws3.addRow([]);

    const asdosHeaders = [
      "No",
      "Nama Asdos / Staf",
      "Jumlah Transaksi Belanja",
      "Total Nominal TF (Cair)",
      "Total Belanja Riil (Bon)",
      "Total Sisa Kas di Asdos",
      "Total Tombok Asdos",
      "Status Rekonsiliasi Kas",
    ];
    const asdosHeaderRow = ws3.addRow(asdosHeaders);
    asdosHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    asdosHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" }, // Emerald
    };

    const asdosMap: Record<
      string,
      { count: number; tf: number; bon: number; kembalian: number; kurang: number }
    > = {};
    requests.forEach((r) => {
      const name = r.applicant || "Asisten Dosen";
      if (!asdosMap[name]) {
        asdosMap[name] = { count: 0, tf: 0, bon: 0, kembalian: 0, kurang: 0 };
      }
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        (r.status === "SELESAI" || r.status === "DANA_DICAIRKAN" ? r.price : 0);
      asdosMap[name].count += 1;
      asdosMap[name].tf += tf;
      asdosMap[name].bon += r.actualSpent || 0;
      asdosMap[name].kembalian += r.refundAmount || 0;
      asdosMap[name].kurang += r.deficitAmount || 0;
    });

    let aIdx = 1;
    Object.entries(asdosMap).forEach(([name, stat]) => {
      let statusKet = "Pas / Lunas (Rp 0)";
      if (stat.kurang > 0) statusKet = `Carry-over ${money(stat.kurang)}`;
      else if (stat.kembalian > 0) statusKet = `Kas di Asdos ${money(stat.kembalian)}`;

      ws3.addRow([
        aIdx++,
        name,
        `${stat.count} kali`,
        stat.tf,
        stat.bon,
        stat.kembalian,
        stat.kurang,
        statusKet,
      ]);
    });

    ws3.getColumn(2).width = 30;
    ws3.getColumn(3).width = 22;
    ws3.getColumn(4).width = 22;
    ws3.getColumn(5).width = 22;
    ws3.getColumn(6).width = 22;
    ws3.getColumn(7).width = 22;
    ws3.getColumn(8).width = 28;

    const safeApplicant =
      options?.applicantFilter && options.applicantFilter !== "Semua Asdos"
        ? `_${options.applicantFilter.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
    const safePeriod = (options?.periodLabel || "Semua").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Laporan_Belanja_Kasbon${safeApplicant}_${safePeriod}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      filename,
    );
    notify?.("Rekap Excel berhasil diunduh.");
    return true;
  } catch (err: unknown) {
    console.error("Gagal mengekspor Excel:", err);
    notify?.(
      "Gagal mengunduh Excel: " + (err instanceof Error ? err.message : "Terjadi kesalahan"),
    );
    return false;
  }
}

// Rekap Pengadaan dalam bentuk PDF (dengan rincian bahan, bon, dan kasbon)
export function exportPdf(
  requests: RequestItem[],
  options?: { periodLabel?: string; applicantFilter?: string },
) {
  try {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const applyAutoTable = (d: jsPDF, opts: UserOptions) => {
      const fn =
        (autoTable as unknown as { default?: (doc: jsPDF, options: UserOptions) => void })
          .default || autoTable;
      fn(d, opts);
    };

    // Header Lembaga
    doc.setFontSize(13);
    doc.setTextColor(128, 0, 0);
    doc.text("UNIVERSITAS ASA INDONESIA (ASAINDO) - SISTEM PENGADAAN (SPAKE)", 14, 12);

    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("LAPORAN REALISASI PEMBELANJAAN & REKONSILIASI KASBON KEUANGAN", 14, 18);

    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const filterInfo =
      options?.applicantFilter && options.applicantFilter !== "Semua Asdos"
        ? `Pemohon: ${options.applicantFilter} | Rentang Tanggal: ${options.periodLabel || "Semua"}`
        : `Rentang Tanggal: ${options?.periodLabel || "Semua Periode"} | Seluruh Pemohon`;
    doc.text(filterInfo, 14, 23);

    // Hitung total
    let totalTf = 0;
    let totalBon = 0;
    let totalKembalian = 0;
    let totalKurang = 0;

    requests.forEach((r) => {
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        (r.status === "SELESAI" || r.status === "DANA_DICAIRKAN" ? r.price : 0);
      totalTf += tf;
      totalBon += r.actualSpent || 0;
      totalKembalian += r.refundAmount || 0;
      totalKurang += r.deficitAmount || 0;
    });

    // Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 25, 269, 10, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Total Belanja: ${requests.length} kali | Total TF: ${money(totalTf)} | Realisasi Bon: ${money(totalBon)} | Sisa Kas di Asdos: ${money(totalKembalian)} | Tombok Asdos: ${money(totalKurang)}`,
      17,
      31.5,
    );

    const body = requests.map((r, idx) => {
      const tf =
        r.danaDiterima ||
        r.nominalTransfer ||
        (r.status === "SELESAI" || r.status === "DANA_DICAIRKAN" ? r.price : 0);
      const bon = r.actualSpent || 0;
      const kembalian = r.refundAmount || 0;
      const kurang = r.deficitAmount || 0;

      // Ringkasan bahan yang dipesan
      const bahanRingkas =
        r.details && r.details.length > 0
          ? r.details
              .map((d) => `${d.name} (${d.qty} ${d.unit})`)
              .slice(0, 3)
              .join(", ") + (r.details.length > 3 ? ` (+${r.details.length - 3} lainnya)` : "")
          : r.menu || r.item || "-";

      const bonKet = r.receiptNo
        ? `${r.receiptNo}\n(${r.storeName || "Toko"})`
        : r.receiptImages && r.receiptImages.length > 0
          ? `Ada (${r.receiptImages.length} Bon)`
          : "Nihil";

      const tglSetor = r.refundDate || (kembalian > 0 ? r.date : "-");
      const statusCarryOver = kurang > 0 ? "Carry-over" : "-";

      let statusKasbon = "Pas";
      if (kurang > 0) statusKasbon = `Tombok\n(- ${money(kurang)})`;
      else if (kembalian > 0) statusKasbon = `Kas Asdos\n(+ ${money(kembalian)})`;

      return [
        String(idx + 1),
        r.date || r.needBy || "-",
        r.id,
        r.applicant || "-",
        r.menu || r.item || "-",
        bahanRingkas,
        bonKet,
        money(tf),
        money(bon),
        kembalian > 0 ? `+ ${money(kembalian)}\n(${tglSetor})` : "-",
        kurang > 0 ? `- ${money(kurang)}\n(${statusCarryOver})` : "-",
        statusKasbon,
      ];
    });

    // Baris total di akhir
    body.push([
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      money(totalTf),
      money(totalBon),
      totalKembalian > 0 ? `+ ${money(totalKembalian)}` : "-",
      totalKurang > 0 ? `- ${money(totalKurang)}` : "-",
      totalKurang > 0 ? `Carry-over` : totalKembalian > 0 ? `Kas di Asdos` : "Lunas",
    ]);

    applyAutoTable(doc, {
      head: [
        [
          "No",
          "Tanggal",
          "Kode PR",
          "Pemohon",
          "Menu / Keperluan",
          "Bahan Dipesan",
          "No. Bon & Toko",
          "Dana TF",
          "Realisasi Bon",
          "Sisa Kas (Tgl)",
          "Tombok (Tgl)",
          "Status Kasbon",
        ],
      ],
      body: body,
      startY: 38,
      styles: { fontSize: 6.5, cellPadding: 1.2 },
      headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 253, 244];
        }
      },
    });

    // LAMPIRAN DAFTAR FISIK BON & NOTA BELANJA PADA PDF
    const reqWithBon = requests.filter(
      (r) => r.receiptNo || (r.receiptImages && r.receiptImages.length > 0),
    );
    if (reqWithBon.length > 0) {
      const docWithTable = doc as JsPDFWithAutoTable;
      const lastY = docWithTable.lastAutoTable?.finalY
        ? docWithTable.lastAutoTable.finalY + 8
        : 120;
      if (lastY > 170) {
        doc.addPage();
      }
      const startBonY = lastY > 170 ? 15 : lastY;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(6, 95, 70); // Emerald 800
      doc.text("LAMPIRAN BUKTI FISIK BON & NOTA BELANJA ASDOS TERVERIFIKASI", 14, startBonY);

      const bonBody = reqWithBon.map((r, bIdx) => [
        String(bIdx + 1),
        r.id,
        r.date || "-",
        r.applicant || "Asdos",
        r.receiptNo || "NOTA-ASLI",
        r.storeName || "Pasar / Swalayan",
        money(r.actualSpent || 0),
        r.refundAmount && r.refundAmount > 0
          ? `Kembalian Kas: + ${money(r.refundAmount)} (Setor: ${r.refundDate || r.date})`
          : r.deficitAmount && r.deficitAmount > 0
            ? `Tombok: - ${money(r.deficitAmount)} (Carry-over berikutnya)`
            : "Pas / Lunas",
        "Terverifikasi Keuangan",
      ]);

      applyAutoTable(doc, {
        head: [
          [
            "No",
            "Kode PR",
            "Tanggal",
            "Nama Pemohon",
            "No. Nota / Bon",
            "Toko / Vendor",
            "Nominal Bon",
            "Status Kasbon & Tanggal",
            "Verifikasi Fisik",
          ],
        ],
        body: bonBody,
        startY: startBonY + 4,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: "bold" },
      });
    }

    const safeApplicant =
      options?.applicantFilter && options.applicantFilter !== "Semua Asdos"
        ? `_${options.applicantFilter.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
    const safePeriod = (options?.periodLabel || "Semua").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Laporan_Belanja_Kasbon${safeApplicant}_${safePeriod}.pdf`);
  } catch (err) {
    console.error("Gagal mengekspor PDF:", err);
  }
}

// Ekspor Dokumen Resmi 1 Permohonan PR ke PDF
export function exportSinglePdf(req: RequestItem, notify?: (msg: string) => void) {
  try {
    const doc = new jsPDF();
    const applyAutoTable = (d: jsPDF, opts: UserOptions) => {
      const fn =
        (autoTable as unknown as { default?: (doc: jsPDF, options: UserOptions) => void })
          .default || autoTable;
      fn(d, opts);
    };

    // Header Lembaga
    doc.setFontSize(14);
    doc.setTextColor(128, 0, 0);
    doc.text("INSTITUT ASAINDO - SISTEM PENGADAAN (SPAKE)", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("SURAT PERMOHONAN PENGADAAN (PURCHASE REQUISITION - PR)", 14, 22);

    // Metadata PR Box
    applyAutoTable(doc, {
      startY: 27,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.5 },
      body: [
        ["Kode PR:", req.id, "Tanggal Pengajuan:", req.date || "-"],
        [
          "Pemohon:",
          req.applicant || "-",
          "Unit / Matakuliah:",
          req.department || req.course || "-",
        ],
        ["Status:", req.status, "Tujuan Belanja:", req.purpose || req.menu || req.item || "-"],
      ],
    });

    const docWithTable = doc as JsPDFWithAutoTable;
    const finalY1 = docWithTable.lastAutoTable?.finalY ? docWithTable.lastAutoTable.finalY + 4 : 45;

    // Tabel Rincian Barang
    const details =
      req.details && req.details.length > 0
        ? req.details
        : [
            {
              id: "tmp",
              name: req.menu || req.item || "-",
              qty: req.qty || 1,
              unit: req.unit || "unit",
              price: req.price || 0,
            },
          ];

    const tableRows = details.map((d, idx) => [
      idx + 1,
      d.name,
      d.qty,
      d.unit,
      money(d.price),
      money((d.price || 0) * (d.qty || 0)),
    ]);

    applyAutoTable(doc, {
      startY: finalY1,
      theme: "grid",
      headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8 },
      head: [["No", "Nama Bahan / Barang", "Qty", "Satuan", "Harga Satuan", "Subtotal"]],
      body: tableRows,
      foot: [["", "Total Estimasi Biaya", "", "", "", money(req.price || 0)]],
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Bagian Laporan Belanja / Realisasi jika sudah ada
    if (req.actualSpent !== undefined || req.danaDiterima || req.nominalTransfer) {
      const finalY2 = docWithTable.lastAutoTable?.finalY
        ? docWithTable.lastAutoTable.finalY + 6
        : 120;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("Realisasi Belanja & Laporan Keuangan:", 14, finalY2);

      applyAutoTable(doc, {
        startY: finalY2 + 2,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 1.5 },
        body: [
          [
            "Dana Ditransfer Keuangan:",
            money(req.danaDiterima || req.nominalTransfer || req.price),
          ],
          ["Total Belanja Riil Sesuai Bon:", money(req.actualSpent || 0)],
          [
            "Selisih Kas:",
            req.refundAmount && req.refundAmount > 0
              ? `+ ${money(req.refundAmount)} (Kembalian disetor)`
              : req.deficitAmount && req.deficitAmount > 0
                ? `- ${money(req.deficitAmount)} (Carry-over pencairan berikutnya)`
                : "Pas (Rp 0)",
          ],
        ],
      });
    }

    doc.save(`Laporan_PR_${req.id}.pdf`);
    notify?.(`Laporan PDF untuk ${req.id} berhasil diunduh.`);
  } catch (err) {
    console.error("Gagal mengekspor single PDF:", err);
    notify?.("Gagal mengunduh dokumen PDF.");
  }
}

// Helper resolusi format gambar ke base64 & extension untuk ExcelJS
async function resolveImageForExcel(
  imgStr: string,
): Promise<{ base64: string; extension: "png" | "jpeg" | "gif" } | null> {
  if (!imgStr) return null;
  try {
    if (imgStr.startsWith("data:image/")) {
      const match = imgStr.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match && match[1] && match[2]) {
        const rawExt = match[1].toLowerCase();
        const extension =
          rawExt.includes("jpeg") || rawExt.includes("jpg")
            ? "jpeg"
            : rawExt.includes("gif")
              ? "gif"
              : "png";
        return { base64: match[2], extension };
      }
      const parts = imgStr.split(";base64,");
      if (parts.length === 2 && parts[1]) {
        return { base64: parts[1], extension: "png" };
      }
    } else if (
      imgStr.startsWith("http://") ||
      imgStr.startsWith("https://") ||
      imgStr.startsWith("/")
    ) {
      const res = await fetch(imgStr);
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = blob.type || "";
      const extension =
        type.includes("jpeg") || type.includes("jpg")
          ? "jpeg"
          : type.includes("gif")
            ? "gif"
            : "png";
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        const b = bytes[i];
        if (b !== undefined) {
          binary += String.fromCharCode(b);
        }
      }
      return { base64: btoa(binary), extension };
    } else if (!imgStr.includes(":") && imgStr.length > 50) {
      return { base64: imgStr, extension: "png" };
    }
  } catch (err) {
    console.error("Gagal memproses gambar bon:", err);
  }
  return null;
}

// Ekspor Dokumen Resmi 1 PR ke Excel (TM 1, Bon, & Laporan)
export async function exportSingleExcel(req: RequestItem, notify?: (msg: string) => void) {
  try {
    const workbook = new ExcelJS.Workbook();
    let isOfficialTemplateLoaded = false;

    // Coba load template.xlsx resmi
    try {
      const response = await fetch("/template.xlsx");
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        isOfficialTemplateLoaded = true;
      }
    } catch {
      // Jika fetch template gagal (offline/path issue), buat struktur workbook in-memory
      isOfficialTemplateLoaded = false;
    }

    if (!isOfficialTemplateLoaded) {
      // Buat struktur default jika template.xlsx tidak dapat dimuat
      workbook.addWorksheet("TM 1");
      workbook.addWorksheet("BON");
      workbook.addWorksheet("LAPORAN ");
    }

    // --- SHEET 1: TM 1 ---
    const ws1 = workbook.getWorksheet("TM 1");
    if (ws1) {
      ws1.getCell("D7").value = req.department || req.course || "";
      ws1.getCell("D8").value = req.applicant || "";
      ws1.getCell("F9").value = req.date || "";

      // Bersihkan baris template jika memakai template resmi
      if (isOfficialTemplateLoaded) {
        for (let i = 13; i <= 25; i++) {
          ["C", "D", "E", "F", "G", "I", "J"].forEach((col) => {
            const cell = ws1.getCell(`${col}${i}`);
            cell.value = null;
          });
        }
      } else {
        ws1.getCell("B2").value = "FORMULIR PERMOHONAN PENGADAAN (PR)";
        ws1.getCell("B2").font = { bold: true, size: 14 };
        ws1.getRow(12).values = [
          "",
          "",
          "No",
          "Nama Barang / Bahan",
          "Qty",
          "Satuan",
          "Keterangan",
          "",
          "Harga Satuan",
          "Total Biaya",
        ];
        ws1.getRow(12).font = { bold: true };
      }

      const details =
        req.details && req.details.length > 0
          ? req.details
          : [
              {
                id: "tmp",
                name: req.menu || req.item || "-",
                qty: req.qty || 1,
                unit: req.unit || "unit",
                price: req.price || 0,
              },
            ];

      let row1 = 13;
      details.forEach((d, idx) => {
        ws1.getCell(`C${row1}`).value = idx + 1;
        ws1.getCell(`D${row1}`).value = d.name;
        ws1.getCell(`D${row1}`).alignment = { wrapText: true, vertical: "top" };
        ws1.getCell(`E${row1}`).value = d.qty;
        ws1.getCell(`F${row1}`).value = d.unit;
        ws1.getCell(`G${row1}`).value = req.purpose || req.menu || "";
        ws1.getCell(`I${row1}`).value = d.price;
        ws1.getCell(`J${row1}`).value = (d.price || 0) * (d.qty || 0);
        row1++;
      });

      ws1.getColumn("D").width = 45;
      ws1.getColumn("J").width = 20;
    }

    // --- SHEET 2: BON ---
    const ws2 = workbook.getWorksheet("BON");
    const validReceipts = (req.receiptImages || []).filter(
      (img): img is string => typeof img === "string" && img.trim().length > 0,
    );

    if (ws2) {
      if (validReceipts.length === 0) {
        // Jika tidak ada bon yang diinput, hapus sheet BON sepenuhnya agar tidak menampilkan dummy template
        workbook.removeWorksheet(ws2.id);
      } else {
        // Bersihkan foto dummy bawaan template.xlsx
        (ws2 as unknown as { _media: unknown[] })._media = [];

        let placedCount = 0;
        for (let i = 0; i < validReceipts.length; i++) {
          const receiptImg = validReceipts[i];
          if (!receiptImg) continue;
          const parsed = await resolveImageForExcel(receiptImg);
          if (parsed && parsed.base64) {
            try {
              const imageId = workbook.addImage({
                base64: parsed.base64,
                extension: parsed.extension,
              });
              ws2.addImage(imageId, {
                tl: { col: 1, row: 2 + placedCount * 25 },
                ext: { width: 500, height: 400 },
              });
              placedCount++;
            } catch (e) {
              console.error("Gagal melampirkan foto bon ke Excel:", e);
            }
          }
        }

        // Jika setelah diproses tidak ada foto valid, hapus sheet BON
        if (placedCount === 0) {
          workbook.removeWorksheet(ws2.id);
        }
      }
    }

    // --- SHEET 3: LAPORAN ---
    const ws3 = workbook.getWorksheet("LAPORAN ");
    if (ws3) {
      ws3.getCell("B7").value = req.menu || req.item || "";
      ws3.getCell("B8").value = req.applicant || "";
      ws3.getCell("G9").value = req.date || "";
      ws3.getCell("G7").value = req.id || "";

      if (isOfficialTemplateLoaded) {
        for (let i = 13; i <= 25; i++) {
          ["A", "B", "C", "D", "E", "F"].forEach((col) => {
            ws3.getCell(`${col}${i}`).value = null;
          });
        }
      } else {
        ws3.getCell("B2").value = "LAPORAN BELANJA";
        ws3.getCell("B2").font = { bold: true, size: 14 };
        ws3.getRow(12).values = [
          "No",
          "Nama Bahan",
          "Qty",
          "Satuan",
          "Harga Satuan",
          "Total Harga",
        ];
        ws3.getRow(12).font = { bold: true };
      }

      const details =
        req.details && req.details.length > 0
          ? req.details
          : [
              {
                id: "tmp",
                name: req.menu || req.item || "-",
                qty: req.qty || 1,
                unit: req.unit || "unit",
                price: req.price || 0,
              },
            ];

      let row3 = 13;
      details.forEach((d, idx) => {
        ws3.getCell(`A${row3}`).value = idx + 1;
        ws3.getCell(`B${row3}`).value = d.name;
        ws3.getCell(`B${row3}`).alignment = { wrapText: true, vertical: "top" };
        ws3.getCell(`C${row3}`).value = d.qty;
        ws3.getCell(`D${row3}`).value = d.unit;
        ws3.getCell(`E${row3}`).value = d.price;
        ws3.getCell(`F${row3}`).value = (d.price || 0) * (d.qty || 0);
        row3++;
      });

      ws3.getCell("F21").value = req.price || 0;
      ws3.getCell("G30").value = req.applicant || "";

      ws3.getColumn("B").width = 45;
      ws3.getColumn("F").width = 25;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Laporan_PR_${req.id}.xlsx`,
    );

    notify?.(`Laporan Excel untuk ${req.id} berhasil diunduh.`);
  } catch (err) {
    console.error("Gagal mengekspor single Excel:", err);
    notify?.("Gagal memproses template Excel. Pastikan file template.xlsx tersedia.");
  }
}
