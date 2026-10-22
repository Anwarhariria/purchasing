# Panduan Skrip Demo Otomatis SPAKE (Playwright)

Skrip demo otomatis ini menjalankan alur kerja end-to-end secara visual berbasis Playwright browser (Chromium terlihat di layar, dengan pergerakan pelan, teks keterangan per langkah / caption overlay, dan perekaman video interaksi).

---

## 1. Prasyarat Layanan

Sebelum menjalankan skrip demo, pastikan seluruh layanan berikut sudah aktif:
1. **Database MySQL**: Database `spake_db` aktif dan siap menerima migrasi/seeding.
2. **Backend Laravel** (`:8000`):
   ```bash
   cd backend
   php artisan serve --port=8000
   ```
3. **Forecast Service FastAPI** (`:8001`):
   ```bash
   cd forecast-service
   uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```
4. **Frontend SPAKE Vite** (`:8080`):
   ```bash
   npm run dev
   ```

---

## 2. Urutan Perintah Demo

Jalankan perintah berikut dari direktori root proyek:

### A. Reset Data Demo Awal (Migrasi & Training Ramalan)
```bash
npm run demo:reset
```
*Perintah ini akan menjalankan `migrate:fresh --seed --force` dan melatih model Random Forest `ramalan:seed-simulasi --train`.*

### B. Menjalankan Demo Alur A (Praktikum Kitchen & Kasbon D3)
```bash
npm run demo:alur-a
```
*Menyimulasikan pengajuan bahan praktikum oleh Asdos, revisi/penolakan oleh Koordinator Lab, persetujuan Kaprodi, pencairan dana kasbon (f = 0.5) oleh Keuangan Kitchen, konfirmasi barang, pelaporan bon (tombok carry-over), hingga ditutup SELESAI.*

### C. Menjalankan Demo Alur B (Pengadaan Rutin Logistik & ATK Unit)
```bash
npm run demo:reset
npm run demo:alur-b
```
*Menyimulasikan pengajuan dari rekomendasi peramalan AI oleh Staf Sekretariat D3, verifikasi Koordinator Unit, alokasi anggaran (f = 1) oleh Keuangan Umum, konfirmasi barang, unggah SPJ & nota belanja, hingga ditutup SELESAI.*

### D. Menjalankan Kedua Alur Sekaligus
```bash
npm run demo
```

---

## 3. Lokasi Rekaman Video Demo

Setiap eksekusi test akan merekam video layar beresolusi 1366x768 yang tersimpan pada:
```
demo/hasil/**/video.webm
```
*Catatan: folder `demo/hasil/` telah diabaikan di `.gitignore` agar tidak masuk ke riwayat repositori git.*

---

## 4. Cara Mengatur Kecepatan Demo (Slow-Motion)

Secara default, browser bergerak dengan jeda `slowMo: 500 ms`. Jika ingin memperlambat lebih santai (misalnya 1000 ms per aksi):

**Di PowerShell (Windows):**
```powershell
$env:DEMO_SLOWMO=1000; npm run demo:alur-a
```

**Di Bash (Linux/macOS):**
```bash
DEMO_SLOWMO=1000 npm run demo:alur-a
```
