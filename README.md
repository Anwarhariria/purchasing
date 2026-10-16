# SPAKE — Sistem Pengadaan Kampus Terpadu

Sistem Pengadaan Kampus Terpadu Berbasis Web dengan Dual-Workflow Engine, Alokasi Anggaran Parsial, dan Rekonsiliasi Belanja Multi-Divisi — Universitas Asa Indonesia.

Kelompok 1 Capstone Project: Anwar Hari Ria, Ridwan, Ijzel Leili.

SPAKE memiliki dua alur pengadaan:

- **Alur A (Kitchen):** pengadaan bahan praktikum. Asdos Kitchen mengajukan, Koordinator Lab memverifikasi, Kaprodi menyetujui, dan Keuangan Kitchen memutuskan faktor alokasi f lalu mencairkan dana. Setelah itu Asdos belanja dan mengunggah bon, lalu transaksi ditutup dengan carry-over atau setor sisa.
- **Alur B (Unit/ATK):** pengadaan logistik untuk 6 unit kerja. Staf Unit mengajukan dari katalog, dibantu ramalan Random Forest. Koordinator Unit memverifikasi, Keuangan Umum mengalokasikan dana dan menyimpan SPJ, lalu transaksi ditutup.

Aplikasi ini terdiri dari tiga bagian yang harus berjalan bersamaan:

| Bagian | Folder | Teknologi | Alamat lokal |
|---|---|---|---|
| Frontend | `/` (root) | React 19, TanStack Start, Vite 8, Tailwind 4 | http://localhost:8080 |
| Backend API | `backend/` | Laravel 12, Sanctum, MySQL | http://localhost:8000/api |
| Layanan peramalan | `forecast-service/` | Python, FastAPI, scikit-learn | http://127.0.0.1:8001 (internal) |

---

## 1. Yang perlu dipasang dulu

| Perangkat | Versi minimal | Cek dengan |
|---|---|---|
| Git | bebas | `git --version` |
| XAMPP (PHP + MySQL/MariaDB) | PHP **8.2** atau lebih baru | `php -v` |
| Composer | 2.x | `composer -V` |
| Node.js | **20.19** atau lebih baru (disarankan 22 LTS) | `node -v` |
| Python | **3.11** atau lebih baru (tim memakai 3.13) | `python --version` |

Catatan untuk Windows:

- Tambahkan folder PHP XAMPP (mis. `C:\xampp\php`) ke **PATH** agar perintah `php` bisa dipanggil dari terminal.
- Di `C:\xampp\php\php.ini`, pastikan baris berikut **tidak** diawali titik koma (`;`): `extension=fileinfo`, `extension=mbstring`, `extension=openssl`, `extension=pdo_mysql`, dan `extension=zip`. Simpan, lalu restart Apache/terminal.
- Saat memasang Python, centang **"Add python.exe to PATH"**.

---

## 2. Ambil kode

```powershell
git clone https://github.com/Anwarhariria/purchasing.git
cd purchasing
```

---

## 3. Siapkan database

1. Buka **XAMPP Control Panel**, lalu klik **Start** pada **MySQL**.
2. Buka http://localhost/phpmyadmin, pilih tab **SQL**, lalu jalankan:

```sql
CREATE DATABASE spake_db   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE spake_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

- `spake_db`: data aplikasi yang dipakai sehari-hari.
- `spake_test`: khusus untuk `php artisan test`. Test **selalu** mengosongkan database ini, jadi jangan diisi data penting.

---

## 4. Backend (Laravel)

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Buka `backend/.env` dan pastikan bagian database sesuai MySQL Anda. Bawaan XAMPP: user `root`, kata sandi kosong.

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=spake_db
DB_USERNAME=root
DB_PASSWORD=
```

Isi database dengan tabel dan data contoh:

```powershell
php artisan migrate:fresh --seed
```

> `migrate:fresh` **menghapus semua isi** `spake_db` lalu membuatnya ulang. Jalankan hanya saat instalasi pertama atau bila ingin mengulang data dari awal.

---

## 5. Layanan peramalan (Python)

Buka **terminal baru**, lalu dari folder proyek:

```powershell
cd forecast-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Biarkan terminal ini tetap terbuka. Cek di browser: http://127.0.0.1:8001/health harus menampilkan `"status":"ok"`.

> Pengguna macOS/Linux: aktifkan venv dengan `source .venv/bin/activate` dan salin file dengan `cp .env.example .env`.

Setelah layanan berjalan, kembali ke terminal **backend** untuk membuat data riwayat simulasi dan melatih model pertama:

```powershell
php artisan ramalan:seed-simulasi --train
```

Perintah ini membuat riwayat pengadaan 24 bulan untuk 6 unit, melatih model Random Forest, lalu menyimpan ramalan untuk bulan berjalan dan bulan depan. Tanpa langkah ini, halaman "Rekomendasi Kebutuhan" akan kosong.

---

## 6. Jalankan backend

Masih di terminal backend:

```powershell
php artisan serve --port=8000
```

Biarkan tetap terbuka.

Opsional: untuk menjalankan tugas terjadwal (konfirmasi otomatis barang diterima setelah 3×24 jam, dan latih ulang model setiap tanggal 1), buka satu terminal lagi di folder `backend`:

```powershell
php artisan schedule:work
```

---

## 7. Frontend (React)

Buka **terminal baru** di folder proyek (root):

```powershell
copy .env.example .env
npm ci
npm run dev
```

Buka **http://localhost:8080** di browser.

> Gunakan `npm ci` (bukan `npm install`) agar versi paket sama persis dengan `package-lock.json`.

---

## 8. Akun demo

Semua akun memakai kata sandi **`123`**. Halaman login juga menyediakan tombol "Pilihan Akun Cepat".

| Peran | Email |
|---|---|
| Asdos Kitchen | asdos@gmail.com, asdos2@gmail.com |
| Koordinator Lab | koordinator@gmail.com |
| Kaprodi | kaprodi@gmail.com |
| Keuangan Kitchen | keuangan.kitchen@gmail.com |
| Keuangan Umum | keuangan.umum@gmail.com |
| Super Admin | superadmin@gmail.com |
| Staf / Koordinator PMB | staf.pmb@gmail.com / koord.pmb@gmail.com |
| Staf / Koordinator Perpustakaan | staf.perpus@gmail.com / koord.perpus@gmail.com |
| Staf / Koordinator Sekretariat S1 | staf.sekre.s1@gmail.com / koord.sekre.s1@gmail.com |
| Staf / Koordinator Sekretariat S2 | staf.sekre.s2@gmail.com / koord.sekre.s2@gmail.com |
| Staf / Koordinator Sekretariat D3 | staf.sekre@gmail.com / koord.sekre@gmail.com |
| Staf / Koordinator LSP | staf.lsp@gmail.com / koord.lsp@gmail.com |

---

## 9. Ringkasan: menjalankan lagi di hari berikutnya

Setelah instalasi pertama, cukup buka 3 terminal:

| Terminal | Folder | Perintah |
|---|---|---|
| 1 | `forecast-service` | `.venv\Scripts\activate` lalu `python -m uvicorn app.main:app --host 127.0.0.1 --port 8001` |
| 2 | `backend` | `php artisan serve --port=8000` |
| 3 | root | `npm run dev` |

Jangan lupa **Start MySQL** di XAMPP terlebih dahulu.

Setelah `git pull`, jalankan juga perintah berikut bila ada perubahan:

```powershell
cd backend
composer install
php artisan migrate
cd ..
npm ci
```

---

## 10. Menjalankan pengujian

```powershell
# Backend (memakai database spake_test)
cd backend
php artisan test

# Layanan peramalan (venv aktif)
cd forecast-service
python -m pytest -q

# Frontend
npx tsc --noEmit
npx eslint src
npm run build
```

---

## 11. Masalah yang sering muncul

| Gejala | Penyebab & solusi |
|---|---|
| Login gagal dengan error **500** | MySQL belum jalan, atau isi `backend/.env` salah. Start MySQL di XAMPP dan cek `DB_*`. |
| Login gagal dengan error **429** | Terlalu banyak percobaan login (maks. 5 per menit). Tunggu 1 menit. |
| Semua akun demo tiba-tiba hilang | `php artisan test` pernah dijalankan memakai `spake_db`. Pastikan `spake_test` sudah dibuat, lalu jalankan `php artisan migrate:fresh --seed` untuk mengisi ulang. |
| Error **CORS** di console browser | Alamat frontend tidak ada di `CORS_ALLOWED_ORIGINS` pada `backend/.env`. Bawaannya sudah mencakup `localhost:8080` dan `localhost:5173`. |
| Halaman "Rekomendasi Kebutuhan" kosong | Layanan peramalan belum jalan, atau model belum dilatih. Jalankan langkah 5. |
| MySQL XAMPP mati sendiri ("shutdown unexpectedly") | Biasanya log Aria rusak. **Cadangkan** dulu folder `C:\xampp\mysql\data`, lalu pindahkan `aria_log.*` dan `aria_log_control` ke folder lain dan Start ulang MySQL. |
| `npm ci` gagal "package.json and package-lock.json are not in sync" | Jalankan `npm install` sekali, lalu commit `package-lock.json` yang berubah. |
| Port 8000 / 8001 / 8080 sudah dipakai | Tutup aplikasi lain yang memakai port tersebut, atau jalankan di port lain. Bila port frontend berubah, tambahkan juga ke `CORS_ALLOWED_ORIGINS`. |

---

## 12. Struktur folder

```text
purchasing/
├── src/                  # Frontend React (komponen, halaman, API client)
├── public/               # Aset statis (logo, gambar login)
├── backend/              # Laravel 12: controller, service (FSM), policy, migration, seeder, test
├── forecast-service/     # FastAPI + Random Forest: app/, tests/, models/ (artefak model, tidak di-commit)
└── docs/                 # SRS revisi dan PRD
```

Dokumentasi teknis lebih lengkap (arsitektur, ERD, katalog API) ada di dokumen TDD kelompok. Detail layanan peramalan ada di `forecast-service/README.md`.
