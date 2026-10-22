import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..", "backend");

console.log("==> Reset database SPAKE: migrate:fresh --seed --force...");
try {
  execSync("php artisan migrate:fresh --seed --force", {
    cwd: backendDir,
    stdio: "inherit",
  });
} catch (err) {
  console.error("Gagal menjalankan migrate:fresh --seed --force:", err);
  process.exit(1);
}

console.log("==> Mengecek ketersediaan forecast-service di http://127.0.0.1:8001/health...");
try {
  const resp = await fetch("http://127.0.0.1:8001/health", { signal: AbortSignal.timeout(3000) });
  if (!resp.ok) {
    throw new Error(`Status HTTP ${resp.status}`);
  }
} catch (err) {
  console.error("\n[ERROR] Jalankan dulu forecast-service (lihat README langkah 5)\n");
  process.exit(1);
}

console.log("==> Menjalankan peramalan Alur B: ramalan:seed-simulasi --train...");
try {
  execSync("php artisan ramalan:seed-simulasi --train", {
    cwd: backendDir,
    stdio: "inherit",
  });
} catch (err) {
  console.error("Gagal menjalankan ramalan:seed-simulasi --train:", err);
  process.exit(1);
}

console.log("==> Reset data demo SPAKE selesai sukses!");
