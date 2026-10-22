import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  caption,
  login,
  logout,
  bukaDetail,
  menu,
  dialog,
  clickVisible,
  checkErrorToast,
} from "./helpers";

test("Demo Alur B: Pengadaan Barang & ATK Unit Kerja (Sekretariat D3)", async ({
  page,
}) => {
  const buktiTransferPath = path.resolve("demo/fixtures/bukti-transfer.png");
  const bonBelanjaPath = path.resolve("demo/fixtures/bon-belanja.png");

  // =========================================================================
  // 1. Staf Sekretariat D3: Mengajukan dari Rekomendasi Ramalan
  // =========================================================================
  await login(page, "staf.sekre@gmail.com", "Staf Sekretariat D3");
  await menu(page, "Rekomendasi Kebutuhan");

  const ajukanBtn = page.getByRole("button", { name: "Ajukan", exact: true }).first();
  await ajukanBtn.waitFor({ state: "visible", timeout: 40000 });

  await caption(
    page,
    "Ramalan Random Forest per unit (UC-25)",
    "Rekomendasi kebutuhan bulan ini dari riwayat 24 bulan"
  );

  if (await ajukanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clickVisible(ajukanBtn);
  } else {
    await clickVisible(page.getByRole("button", { name: /Buat Pengajuan dari Ramalan/i }));
  }

  const modalCreate = dialog(page);
  await modalCreate.waitFor({ state: "visible", timeout: 10000 });

  // Tunggu input pencarian pertama terisi otomatis dari draf ramalan
  const firstSearchInput = modalCreate.locator('[role="combobox"] input').first();
  await expect(firstSearchInput).not.toHaveValue("", { timeout: 15000 });

  // Isi keperluan pengadaan
  const purposeInput = modalCreate.getByPlaceholder(/Misal: untuk ujian/i);
  await purposeInput.fill("Kebutuhan ATK ujian - Demo");

  // Isi tanggal kebutuhan hari ini + 10 hari
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  const dateStr = targetDate.toISOString().split("T")[0];
  await modalCreate.locator('input[type="date"]').fill(dateStr);

  // Klik "Tambah Barang Lain"
  const tambahBarangBtn = modalCreate.getByRole("button", { name: /Tambah Barang Lain/i });
  await clickVisible(tambahBarangBtn);
  await page.waitForTimeout(600);

  // Tunggu kotak pencarian barang kedua tampil, ketik "Pulpen", lalu pilih hasil yang memuat "Pulpen"
  const barangKedua = modalCreate.locator("div.rounded-lg").filter({ hasText: /Barang #2/i });
  const searchKedua = barangKedua.locator('[role="combobox"] input');
  await searchKedua.waitFor({ state: "visible", timeout: 5000 });
  await searchKedua.fill("Pulpen");
  await page.waitForTimeout(400);

  const pulpenOption = modalCreate.locator('[role="option"]').filter({ hasText: /Pulpen/i }).first();
  await pulpenOption.waitFor({ state: "visible", timeout: 5000 });
  await clickVisible(pulpenOption);
  await page.waitForTimeout(400);

  // Isi kuantitas barang kedua = 5 (satuan & harga terisi otomatis dari katalog)
  const qtyKeduaInput = barangKedua.locator('input[type="number"]').first();
  await qtyKeduaInput.fill("5");

  // Siapkan listener untuk response POST /api/requests
  const postReqPromise = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/requests") &&
      r.request().method() === "POST" &&
      r.status() === 201,
    { timeout: 15000 }
  );

  const submitBtn = modalCreate.getByRole("button", {
    name: /Ajukan ke Koordinator Unit Kerja/i,
  });
  await clickVisible(submitBtn);

  const postResp = await postReqPromise;
  const postData = await postResp.json();
  const kode = postData.data.id;
  expect(kode).toBeTruthy();

  await caption(page, "Staf Unit mengajukan dari ramalan + tambah barang katalog (UC-05)");
  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 2. Koordinator Sekretariat D3: Verifikasi Pengajuan Unit
  // =========================================================================
  await login(page, "koord.sekre@gmail.com", "Koordinator Sekretariat D3");
  await menu(page, "Verifikasi Pengajuan Unit");
  await bukaDetail(page, kode);
  await caption(page, "Koordinator Unit melihat kolom ramalan RF (UC-20)");

  const dKoord = dialog(page);
  const catatanKoordTextarea = dKoord.locator("textarea:visible").first();
  await catatanKoordTextarea.fill("Sesuai kebutuhan ujian");

  const verifikasiBtn = dKoord.getByRole("button", { name: /Verifikasi & Teruskan/i });
  await clickVisible(verifikasiBtn);

  await caption(page, "Koordinator Unit memverifikasi → DIVERIFIKASI_KOORD");
  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 3. Keuangan Umum: Alokasi & Penugasan Belanja (f = 1 + Bukti)
  // =========================================================================
  await login(page, "keuangan.umum@gmail.com", "Keuangan Umum");
  await menu(page, "Alokasi & Penugasan");
  await bukaDetail(page, kode);

  const dKeuangan = dialog(page);
  const faktorFullBtn = dKeuangan.getByRole("button", { name: /^f = 1/i });
  await clickVisible(faktorFullBtn);

  const nominalTransferInput = dKeuangan.getByPlaceholder(/Masukkan nominal transfer/i);
  await nominalTransferInput.fill("900000");

  const catatanKeuanganInput = dKeuangan.getByPlaceholder(/Contoh: Disetujui/i);
  await catatanKeuanganInput.fill("Disetujui penuh, dibelanjakan Sarpras");

  const fileInputTransfer = dKeuangan.locator('input[type="file"]');
  await fileInputTransfer.setInputFiles(buktiTransferPath);

  const simpanKeputusanBtn = dKeuangan.getByRole("button", { name: /Simpan Keputusan/i });
  await clickVisible(simpanKeputusanBtn);

  await caption(
    page,
    "Keuangan Umum mengalokasikan f = 1 + bukti → SEDANG_DIBELANJAKAN (UC-14)"
  );
  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 4. Staf Sekretariat D3: Konfirmasi Barang Diterima
  // =========================================================================
  await login(page, "staf.sekre@gmail.com", "Staf Sekretariat D3");
  await bukaDetail(page, kode);

  const dStafTerima = dialog(page);
  const terimaBtn = dStafTerima.getByRole("button", { name: "Konfirmasi Terima Barang" });
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

  await caption(page, "Staf Unit mengonfirmasi barang diterima → BARANG_DITERIMA");
  await checkErrorToast(page);
  await page.waitForTimeout(1000);
  await logout(page);

  // =========================================================================
  // 5. Keuangan Umum: Rekonsiliasi Bon (SPJ) & Menutup SELESAI
  // =========================================================================
  await login(page, "keuangan.umum@gmail.com", "Keuangan Umum");
  await menu(page, "Rekonsiliasi Bon");
  await bukaDetail(page, kode);

  const dKeuSpj = dialog(page);
  const actualSpentInput = dKeuSpj.locator("input[type=number]:visible").first();
  await actualSpentInput.fill("880000");

  const fileInputBon = dKeuSpj.locator('input[type="file"]');
  await fileInputBon.setInputFiles(bonBelanjaPath);

  const spjResponsePromise = page
    .waitForResponse(
      (r) => r.url().includes("/spj") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 10000 }
    )
    .catch(() => null);

  const simpanSpjBtn = dKeuSpj.getByRole("button", { name: /Simpan SPJ/i });
  await clickVisible(simpanSpjBtn);

  await spjResponsePromise;
  await page.waitForTimeout(2000);

  const selesaikanBtn = dKeuSpj.getByRole("button", { name: /Selesaikan/i }).first();
  await selesaikanBtn.waitFor({ state: "visible", timeout: 5000 });
  await clickVisible(selesaikanBtn);

  if (await page.locator("[role=dialog]").count() > 1) {
    const konfirmasiSelesaiBtn = page
      .locator("[role=dialog]")
      .last()
      .getByRole("button", { name: /^(Konfirmasi|Ya|Lanjut|Selesaikan)/i });
    if (await konfirmasiSelesaiBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clickVisible(konfirmasiSelesaiBtn);
    }
  }

  await caption(
    page,
    "Keuangan Umum menyimpan SPJ & nota, lalu menutup → SELESAI (UC-15, UC-16)",
    "Total belanja Rp880.000 dari alokasi Rp900.000"
  );
  await checkErrorToast(page);
  await page.waitForTimeout(1000);

  // =========================================================================
  // 6. Verifikasi Status Akhir SELESAI
  // =========================================================================
  await page.keyboard.press("Escape");
  await logout(page);
  await login(page, "keuangan.umum@gmail.com", "Keuangan Umum");
  await bukaDetail(page, kode);

  await expect(dialog(page).getByText(/selesai/i).first()).toBeVisible();

  await caption(
    page,
    "Alur B selesai ✓",
    "DIAJUKAN → DIVERIFIKASI → SEDANG_DIBELANJAKAN → BARANG_DITERIMA → SELESAI"
  );
  await page.waitForTimeout(3000);
});
