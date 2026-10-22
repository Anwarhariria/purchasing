import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  caption,
  login,
  logout,
  bukaDetail,
  dialog,
  clickVisible,
  checkErrorToast,
} from "./helpers";

test("Demo Alur A: Pengadaan Bahan Praktik Masak (Kitchen)", async ({ page }) => {
  const buktiTransferPath = path.resolve("demo/fixtures/bukti-transfer.png");
  const bonBelanjaPath = path.resolve("demo/fixtures/bon-belanja.png");

  // =========================================================================
  // 1. Asdos Kitchen: Mengajukan Bahan Praktik
  // =========================================================================
  await login(page, "asdos@gmail.com", "Asdos Kitchen");
  await caption(
    page,
    "Asdos mengajukan bahan praktik (UC-04)",
    "Kebutuhan = resep × kelompok − stok chiller"
  );

  const ajukanBahanBtn = page.getByRole("button", { name: "Ajukan Bahan Praktik" });
  await clickVisible(ajukanBahanBtn);

  const modalCreate = dialog(page);
  await modalCreate.waitFor({ state: "visible", timeout: 10000 });

  // Select ke-4 (index 3 = Jumlah Kelompok) pilih option index 1
  const selects = modalCreate.locator("select:visible");
  await selects.nth(3).selectOption({ index: 1 });

  // Isi placeholder /Contoh: Praktik/ dengan "Praktik Sarapan Pagi - Demo"
  const purposeInput = modalCreate.getByPlaceholder(/Contoh: Praktik/i);
  await purposeInput.fill("Praktik Sarapan Pagi - Demo");

  // Siapkan listener untuk menangkap response POST /api/requests
  const postReqPromise = page.waitForResponse(
    (r) => r.url().endsWith("/api/requests") && r.request().method() === "POST" && r.status() === 201,
    { timeout: 15000 }
  );

  const submitBtn = modalCreate.getByRole("button", { name: "Ajukan ke Koordinator Lab" });
  await clickVisible(submitBtn);

  const postReqResp = await postReqPromise;
  const postReqData = await postReqResp.json();
  const kode = postReqData.data.id;
  expect(kode).toBeTruthy();

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 2. Koordinator Lab: Mengedit Qty lalu Menolak
  // =========================================================================
  await login(page, "koordinator@gmail.com", "Koordinator Lab");
  await bukaDetail(page, kode);
  await caption(
    page,
    "Koordinator Lab mengedit qty lalu menolak (UC-08, UC-21)",
    "Penyesuaian kuantitas & catatan alasan penolakan"
  );

  const dKoord = dialog(page);
  const numInput = dKoord.locator("input[type=number]:visible").first();
  const currentVal = Number(await numInput.inputValue()) || 1;
  await numInput.fill(String(currentVal + 2));

  const simpanPerubahanBtn = dKoord.getByRole("button", { name: "Simpan Perubahan" });
  if (await simpanPerubahanBtn.isVisible({ timeout: 2000 })) {
    await clickVisible(simpanPerubahanBtn);
    await page.waitForTimeout(800);
  }

  const tolakBtn = dKoord.getByRole("button", { name: "Tolak", exact: true });
  await clickVisible(tolakBtn);

  // Isi textarea:visible terakhir "Qty perlu disesuaikan"
  const rejectTextarea = page.locator("[role=dialog] textarea:visible").last();
  await rejectTextarea.waitFor({ state: "visible", timeout: 5000 });
  await rejectTextarea.fill("Qty perlu disesuaikan");

  const konfirmasiTolakBtn = page
    .locator("[role=dialog]")
    .last()
    .getByRole("button", { name: /^(Tolak Pengajuan|Konfirmasi Tolak|Kirim Penolakan)/i });
  await clickVisible(konfirmasiTolakBtn);

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 3. Asdos: Mengajukan Ulang Setelah Revisi
  // =========================================================================
  await login(page, "asdos@gmail.com", "Asdos Kitchen");
  await bukaDetail(page, kode);
  await caption(
    page,
    "Asdos mengajukan ulang setelah revisi",
    "Mengirim kembali pengajuan yang telah disesuaikan"
  );

  const dAsdos = dialog(page);
  const ajukanUlangBtn = dAsdos.getByRole("button", { name: /Ajukan Ulang/i }).first();
  await clickVisible(ajukanUlangBtn);

  if (await page.locator("[role=dialog]").count() > 1) {
    const konfirmasiAjukanUlangBtn = page
      .locator("[role=dialog]")
      .last()
      .getByRole("button", { name: /^(Ajukan Ulang|Kirim|Konfirmasi|Ya)/i });
    if (await konfirmasiAjukanUlangBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clickVisible(konfirmasiAjukanUlangBtn);
    }
  }

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 4. Koordinator Lab: Memverifikasi Pengajuan
  // =========================================================================
  await login(page, "koordinator@gmail.com", "Koordinator Lab");
  await bukaDetail(page, kode);
  await caption(page, "Koordinator Lab memverifikasi → DIVERIFIKASI_KOORD");

  const dKoordVerif = dialog(page);
  const catatanKoordTextarea = dKoordVerif.locator("textarea:visible").first();
  await catatanKoordTextarea.fill("Takaran sesuai resep");

  const verifikasiBtn = dKoordVerif.getByRole("button", { name: /Verifikasi & Teruskan/i });
  await clickVisible(verifikasiBtn);

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 5. Kaprodi: Menyetujui Pengajuan
  // =========================================================================
  await login(page, "kaprodi@gmail.com", "Kaprodi");
  await bukaDetail(page, kode);
  await caption(page, "Kaprodi menyetujui → DISETUJUI_KAPRODI (UC-11)");

  const dKaprodi = dialog(page);
  const catatanKaprodiTextarea = dKaprodi.locator("textarea:visible").first();
  await catatanKaprodiTextarea.fill("Sesuai kurikulum");

  const setujuiBtn = dKaprodi.getByRole("button", { name: /Setujui/i });
  await clickVisible(setujuiBtn);

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 6. Keuangan Kitchen: Keputusan Keuangan (f = 0.5 + Bukti Transfer)
  // =========================================================================
  await login(page, "keuangan.kitchen@gmail.com", "Keuangan Kitchen");
  await bukaDetail(page, kode);
  await caption(
    page,
    "Keuangan Kitchen: faktor f = ½ + bukti transfer → DANA_DICAIRKAN (UC-12)",
    "qty_final = qty × f, dibulatkan ke atas untuk satuan utuh"
  );

  const dKeuangan = dialog(page);
  const faktorHalfBtn = dKeuangan.getByRole("button", { name: /^f = 0\.5/i });
  await clickVisible(faktorHalfBtn);

  const nominalTransferInput = dKeuangan.getByPlaceholder(/Masukkan nominal transfer/i);
  await nominalTransferInput.fill("150000");

  const catatanKeuanganInput = dKeuangan.getByPlaceholder(/Contoh: Disetujui penuh/i);
  await catatanKeuanganInput.fill("Disetujui setengah sesuai kas minggu ini");

  const fileInputTransfer = dKeuangan.locator('input[type="file"]');
  await fileInputTransfer.setInputFiles(buktiTransferPath);

  const simpanKeputusanBtn = dKeuangan.getByRole("button", { name: /Simpan Keputusan/i });
  await clickVisible(simpanKeputusanBtn);

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 7. Asdos: Konfirmasi Barang Diterima & Unggah Bon Belanja
  // =========================================================================
  await login(page, "asdos@gmail.com", "Asdos Kitchen");
  await bukaDetail(page, kode);

  const dAsdosTerima = dialog(page);
  const terimaBtn = dAsdosTerima.getByRole("button", { name: "Konfirmasi Terima Barang" });
  await clickVisible(terimaBtn);

  if (await page.locator("[role=dialog]").count() > 1) {
    const konfirmTerimaBtn = page
      .locator("[role=dialog]")
      .last()
      .getByRole("button", { name: /^(Ya|Konfirmasi)/i });
    if (await konfirmTerimaBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clickVisible(konfirmTerimaBtn);
    }
  }
  await checkErrorToast(page);
  await page.waitForTimeout(800);

  // Tutup dialog, segarkan data via re-login Asdos, buka kembali untuk unggah bon
  await page.keyboard.press("Escape");
  await logout(page);
  await login(page, "asdos@gmail.com", "Asdos Kitchen");
  await bukaDetail(page, kode);

  const dAsdosBon = dialog(page);
  const unggahBonBtn = dAsdosBon.getByRole("button", { name: /Unggah Bon/i }).first();
  await clickVisible(unggahBonBtn);

  const modalSpj = dialog(page);
  await modalSpj.waitFor({ state: "visible", timeout: 5000 });

  const totalBelanjaInput = modalSpj.getByPlaceholder(/Masukkan total belanja/i);
  await totalBelanjaInput.fill("151000");

  const fileInputBon = modalSpj.locator('input[type="file"]');
  await fileInputBon.setInputFiles(bonBelanjaPath);

  await caption(
    page,
    "Asdos konfirmasi terima barang & unggah bon Rp151.000",
    "Dana Rp150.000 → tombok Rp1.000 (carry-over)"
  );

  const kirimLaporanBtn = modalSpj.getByRole("button", { name: /Kirim Laporan/i });
  await clickVisible(kirimLaporanBtn);

  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 8. Keuangan Kitchen: Verifikasi Laporan Belanja & Selesai
  // =========================================================================
  await login(page, "keuangan.kitchen@gmail.com", "Keuangan Kitchen");
  await bukaDetail(page, kode);
  await caption(
    page,
    "Keuangan Kitchen memverifikasi laporan & menutup → SELESAI (UC-22)",
    "Selisih tombok dicatat sebagai carry-over"
  );

  const dKeuanganClose = dialog(page);
  const verifLpjBtn = dKeuanganClose.getByRole("button", { name: /Verifikasi Laporan Belanja/i }).first();
  await clickVisible(verifLpjBtn);

  if (await page.locator("[role=dialog]").count() > 1) {
    const konfirmasiTutupBtn = page
      .locator("[role=dialog]")
      .last()
      .getByRole("button", { name: /^(Konfirmasi|Ya|Lanjut|Tutup|Simpan)/i });
    if (await konfirmasiTutupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clickVisible(konfirmasiTutupBtn);
    }
  }

  await checkErrorToast(page);
  await page.waitForTimeout(1000);

  // =========================================================================
  // 9. Verifikasi Status Akhir SELESAI
  // =========================================================================
  await page.keyboard.press("Escape");
  await logout(page);
  await login(page, "keuangan.kitchen@gmail.com", "Keuangan Kitchen");
  await bukaDetail(page, kode);

  await expect(dialog(page).getByText(/selesai/i).first()).toBeVisible();

  await caption(
    page,
    "Alur A selesai ✓",
    "DIAJUKAN → DITOLAK → DIAJUKAN → DIVERIFIKASI → DISETUJUI → DICAIRKAN → DITERIMA → LAPORAN → SELESAI"
  );
  await page.waitForTimeout(3000);
});
