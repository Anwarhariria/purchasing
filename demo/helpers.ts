import { type Page } from "@playwright/test";

export const PASSWORD = "123";

/**
 * Menyisipkan / memperbarui overlay keterangan (caption) di bagian bawah tengah layar.
 */
export async function caption(page: Page, judul: string, sub?: string) {
  await page.evaluate(
    ({ judul, sub }) => {
      let el = document.getElementById("demo-caption");
      if (!el) {
        el = document.createElement("div");
        el.id = "demo-caption";
        el.style.position = "fixed";
        el.style.bottom = "16px";
        el.style.left = "16px";
        el.style.zIndex = "999999";
        el.style.backgroundColor = "rgba(30, 58, 138, 0.92)"; // #1E3A8A opasitas 0.92
        el.style.color = "#FFFFFF";
        el.style.padding = "6px 14px";
        el.style.borderRadius = "8px";
        el.style.boxShadow =
          "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";
        el.style.textAlign = "left";
        el.style.pointerEvents = "none";
        el.style.fontFamily =
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        el.style.transition = "all 0.3s ease";
        el.style.maxWidth = "420px";
        el.style.opacity = "0.95";
        document.body.appendChild(el);
      }
      el.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; line-height: 1.3;">${judul}</div>
        ${sub ? `<div style="font-size: 11px; margin-top: 2px; opacity: 0.9; font-weight: 400;">${sub}</div>` : ""}
      `;
    },
    { judul, sub }
  );
  await page.waitForTimeout(1200);
}

/**
 * Melakukan login pengguna dengan penanganan rate-limit 429.
 */
export async function login(page: Page, email: string, peran: string) {
  await page.goto("/");
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await caption(page, "Login sebagai " + peran, email);

  const performLogin = async (): Promise<boolean> => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill(email);
    await passwordInput.fill(PASSWORD);

    const loginPromise = page
      .waitForResponse(
        (r) => r.url().includes("/api/login") && r.request().method() === "POST",
        { timeout: 10000 }
      )
      .catch(() => null);

    await passwordInput.press("Enter");
    const resp = await loginPromise;

    if (resp && resp.status() === 429) {
      await caption(
        page,
        "Rate limit login terdeteksi (429)",
        "Menunggu 65 detik sebelum mengulangi login..."
      );
      await page.waitForTimeout(65000);
      return false;
    }

    await page.waitForSelector('input[type="password"]', {
      state: "detached",
      timeout: 15000,
    });
    return true;
  };

  let success = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    success = await performLogin();
    if (success) break;
  }
  await page.waitForTimeout(1000);
}

/**
 * Logout pengguna dan membersihkan storage.
 */
export async function logout(page: Page) {
  try {
    const keluarBtn = page.getByRole("button", { name: /Keluar/i });
    if (await keluarBtn.isVisible({ timeout: 2000 })) {
      await keluarBtn.click();
    }
  } catch {
    // Abaikan bila tombol keluar tidak ditemukan
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
}

/**
 * Membuka modal detail pengajuan berdasarkan kode pengajuan (ID).
 */
export async function bukaDetail(page: Page, kode: string) {
  // Sebelum mencari baris, tunggu sampai tabel memuat data
  await page.locator("tr").nth(1).waitFor({ state: "visible", timeout: 15000 });

  // Selalu isi kotak pencarian /Cari PR/ dengan kode
  const searchInput = page.getByPlaceholder(/Cari PR/i);
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(kode);
  await page.waitForTimeout(800);

  const targetRow = page.locator(`tr:has-text("${kode}")`).first();
  await targetRow.waitFor({ state: "visible", timeout: 15000 });
  const detailBtn = targetRow.getByRole("button", { name: /Detail/i }).first();
  await detailBtn.click();
  await page
    .locator("[role=dialog]")
    .last()
    .waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(800);
}

/**
 * Menavigasi menu sidebar via tombol aside.
 */
export async function menu(page: Page, teks: string) {
  const btn = page.locator("aside button").filter({ hasText: teks }).first();
  await btn.click();
  await page.waitForTimeout(1500);
}

/**
 * Mengambil dialog aktif teratas.
 */
export function dialog(page: Page) {
  return page.locator("[role=dialog]").last();
}

/**
 * Klik elemen dengan scrollIntoViewIfNeeded dan hover singkat agar terlihat di video rekaman.
 */
export async function clickVisible(locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  try {
    await locator.hover({ timeout: 2000 });
  } catch {}
  await locator.page().waitForTimeout(250);
  await locator.click();
}

/**
 * Memeriksa apakah ada toast error Sonner yang muncul di layar.
 */
export async function checkErrorToast(page: Page) {
  const errorToast = page
    .locator(
      "[data-sonner-toast][data-type='error'], [data-sonner-toast]:has-text('Gagal'), [data-sonner-toast]:has-text('Error')"
    )
    .first();
  if (await errorToast.isVisible({ timeout: 300 }).catch(() => false)) {
    const text = await errorToast.innerText().catch(() => "Unknown error toast");
    throw new Error(`Toast Error Terdeteksi: ${text}`);
  }
}
