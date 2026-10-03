import { utils, write } from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { money } from "@/lib/algorithms/saw";
import type { RequestItem } from "@/types/procurement";

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

// Rekap Semua Pengadaan dalam bentuk Excel
export function exportExcel(requests: RequestItem[]) {
  const rows = [
    ["Kode PR", "Nama Barang / Menu", "Unit / Pemohon", "Tenggat Waktu", "Estimasi Biaya", "Status"],
    ...requests.map((r) => [
      r.id,
      r.menu || r.item || "-",
      `${r.applicant || "-"} (${r.department || r.course || ""})`,
      r.deadline || r.needBy || "-",
      String(r.price || 0),
      r.status,
    ]),
  ];
  const ws = utils.aoa_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Rekap Pengadaan");
  const wbout = write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "rekap-pengadaan-spake.xlsx"
  );
}

// Rekap Semua Pengadaan dalam bentuk PDF
export function exportPdf(requests: RequestItem[]) {
  try {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.setTextColor(128, 0, 0);
    doc.text("Laporan Pengadaan Kampus ASAINDO (SPAKE)", 14, 15);

    const body = requests.map((r) => [
      r.id,
      r.menu || r.item || "-",
      `${r.applicant || "-"} (${r.department || r.course || ""})`,
      r.deadline || r.needBy || "-",
      money(r.price || 0),
      r.status,
    ]);

    const applyAutoTable = (autoTable as any).default || autoTable;
    applyAutoTable(doc, {
      head: [["Kode PR", "Nama Barang / Menu", "Unit / Pemohon", "Tenggat Waktu", "Estimasi Biaya", "Status"]],
      body: body,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
    });

    doc.save("rekap-pengadaan-spake.pdf");
  } catch (err) {
    console.error("Gagal mengekspor PDF:", err);
  }
}

// Ekspor Dokumen Resmi 1 Permohonan PR ke PDF
export function exportSinglePdf(
  req: RequestItem,
  notify?: (msg: string) => void
) {
  try {
    const doc = new jsPDF();
    const applyAutoTable = (autoTable as any).default || autoTable;

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
        ["Pemohon:", req.applicant || "-", "Unit / Matakuliah:", req.department || req.course || "-"],
        ["Status:", req.status, "Tujuan Belanja:", req.purpose || req.menu || req.item || "-"],
      ],
    });

    const finalY1 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 4 : 45;

    // Tabel Rincian Barang
    const details =
      req.details && req.details.length > 0
        ? req.details
        : [{ id: "tmp", name: req.menu || req.item || "-", qty: req.qty || 1, unit: req.unit || "unit", price: req.price || 0 }];

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

    // Bagian LPJ / Realisasi jika sudah ada
    if (req.actualSpent !== undefined || req.disbursedAmount) {
      const finalY2 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 120;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("Realisasi Belanja & Laporan Keuangan (LPJ):", 14, finalY2);

      applyAutoTable(doc, {
        startY: finalY2 + 2,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 1.5 },
        body: [
          ["Dana Dicairkan Keuangan:", money(req.disbursedAmount || req.price)],
          ["Total Belanja Riil Sesuai Bon:", money(req.actualSpent || 0)],
          [
            "Selisih Kas:",
            req.refundAmount && req.refundAmount > 0
              ? `+ ${money(req.refundAmount)} (Kembalian di Asdos)`
              : req.deficitAmount && req.deficitAmount > 0
              ? `- ${money(req.deficitAmount)} (Perlu Reimburse Keuangan)`
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
  imgStr: string
): Promise<{ base64: string; extension: "png" | "jpeg" | "gif" } | null> {
  if (!imgStr) return null;
  try {
    if (imgStr.startsWith("data:image/")) {
      const match = imgStr.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
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
      if (parts.length === 2) {
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
        binary += String.fromCharCode(bytes[i]);
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
export async function exportSingleExcel(
  req: RequestItem,
  notify?: (msg: string) => void
) {
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
        ws1.getRow(12).values = ["", "", "No", "Nama Barang / Bahan", "Qty", "Satuan", "Keterangan", "", "Harga Satuan", "Total Biaya"];
        ws1.getRow(12).font = { bold: true };
      }

      const details =
        req.details && req.details.length > 0
          ? req.details
          : [{ id: "tmp", name: req.menu || req.item || "-", qty: req.qty || 1, unit: req.unit || "unit", price: req.price || 0 }];

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
      (img): img is string => typeof img === "string" && img.trim().length > 0
    );

    if (ws2) {
      if (validReceipts.length === 0) {
        // Jika tidak ada bon yang diinput, hapus sheet BON sepenuhnya agar tidak menampilkan dummy template
        workbook.removeWorksheet(ws2.id);
      } else {
        // Bersihkan foto dummy bawaan template.xlsx
        (ws2 as any)._media = [];

        let placedCount = 0;
        for (let i = 0; i < validReceipts.length; i++) {
          const parsed = await resolveImageForExcel(validReceipts[i]);
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
        ws3.getCell("B2").value = "LAPORAN PERTANGGUNGJAWABAN (LPJ)";
        ws3.getCell("B2").font = { bold: true, size: 14 };
        ws3.getRow(12).values = ["No", "Nama Bahan", "Qty", "Satuan", "Harga Satuan", "Total Harga"];
        ws3.getRow(12).font = { bold: true };
      }

      const details =
        req.details && req.details.length > 0
          ? req.details
          : [{ id: "tmp", name: req.menu || req.item || "-", qty: req.qty || 1, unit: req.unit || "unit", price: req.price || 0 }];

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
      `Laporan_PR_${req.id}.xlsx`
    );

    notify?.(`Laporan Excel untuk ${req.id} berhasil diunduh.`);
  } catch (err) {
    console.error("Gagal mengekspor single Excel:", err);
    notify?.("Gagal memproses template Excel. Pastikan file template.xlsx tersedia.");
  }
}
