import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "hasil",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 8 * 60 * 1000, // 8 menit
  expect: {
    timeout: 15 * 1000, // 15 detik
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    headless: false,
    launchOptions: {
      slowMo: Number(process.env.DEMO_SLOWMO ?? 500),
    },
    video: {
      mode: "on",
      size: { width: 1920, height: 1080 },
    },
    actionTimeout: 20000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Ditaruh SETELAH spread agar tidak tertimpa viewport bawaan 1280x720
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        launchOptions: {
          slowMo: Number(process.env.DEMO_SLOWMO ?? 500),
          args: ["--window-position=0,0", "--start-maximized"],
        },
      },
    },
  ],
});
