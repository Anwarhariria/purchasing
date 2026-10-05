# SPAKE Backend - Laravel 12 & MySQL

Backend RESTful API untuk Sistem Pengadaan Kampus ASAINDO (SPAKE) yang dibangun menggunakan **Laravel 12**, **MySQL**, dan **Laravel Sanctum**.

---

## 🚀 Panduan Menjalankan

### 1. Prasyarat
- **PHP**: Versi >= 8.2 (sudah terpasang di `C:\xampp\php\php.exe`)
- **MySQL**: MySQL Daemon berjalan di `127.0.0.1:3306` (via XAMPP Control Panel)
- **Composer**: Composer 2.8+

### 2. Konfigurasi Database (.env)
Database `spake_db` telah dibuat otomatis di MySQL:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=spake_db
DB_USERNAME=root
DB_PASSWORD=
```

### 3. Migrasi & Seeder Database
Untuk menjalankan migrasi dan mengisi data awal (users, pengajuan, resep kurikulum, stok lab, notifikasi):
```bash
cd backend
php artisan migrate:fresh --seed
```

### 4. Menjalankan Server Laravel
```bash
cd backend
php artisan serve --port=8000
```
Server API akan aktif di: **`http://127.0.0.1:8000`**

---

## 🔐 Akun Bawaan (Default Dummy Users)

| Peran (Role) | Email | Password | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Staf / Asdos** | `asdos@gmail.com` | `123` | Buat pengajuan, cek stok, upload bon belanja, SPJ |
| **Koordinator** | `koordinator@gmail.com` | `123` | Verifikasi standar resep masakan, penyesuaian Qty |
| **Kaprodi** | `kaprodi@gmail.com` | `123` | ACC permohonan belanja, kurikulum prodi |
| **Bagian Keuangan** | `keuangan@gmail.com` | `123` | Pencairan dana, validasi bon LPJ, penggantian selisih |
| **Super Admin** | `superadmin@gmail.com` | `123` | Kelola master data pengguna, kurikulum & log sistem |

---

## 📡 Daftar Endpoint API Utama (`/api/...`)

### 1. Autentikasi (`/api/auth`)
- `POST /api/auth/login`: Login dengan email dan password. Mengembalikan Bearer Token.
- `POST /api/auth/quick-login`: Login instan berbasis peran (`role: "Staf / Asdos"`) atau email.
- `GET /api/auth/me`: Mengambil data profil user yang sedang login (`auth:sanctum`).
- `POST /api/auth/logout`: Menghapus token sesi aktif.
- `GET /api/users`: Daftar seluruh pengguna sistem.
- `POST /api/users`: Menambah akun pengguna baru.

### 2. Pengadaan & Alur Siklus (`/api/requests`)
- `GET /api/requests`: Mengambil seluruh daftar pengajuan bahan (mendukung filter `?status=...&prodi=...`).
- `GET /api/requests/kpis`: Metrik ringkasan peran (total biaya, menunggu persetujuan, total pencairan, selisih belanja).
- `GET /api/requests/fifo-ranking`: Perangkingan prioritas antrean berbasis **First-In, First-Out (FIFO)** (nomor antrean & durasi tunggu).
- `GET /api/requests/saw-ranking`: Hasil perangkingan prioritas pengadaan dengan algoritma **Simple Additive Weighting (SAW)**.
- `GET /api/requests/{id}`: Detail lengkap satu pengajuan beserta rincian bahan (line-item ingredients).
- `POST /api/requests`: Membuat pengajuan bahan baru (otomatis membuat ID `PR-2026-XXX` dan notifikasi Koordinator).
- `PUT /api/requests/{id}`: Memperbarui data umum dan penyesuaian Qty bahan masakan.
- `PATCH /api/requests/{id}/status`: Mengubah status workflow pengadaan dan otomatis menembak notifikasi ke peran terkait.
- `POST /api/requests/{id}/disburse`: Pencairan dana oleh Bagian Keuangan.
- `POST /api/requests/{id}/spj`: Penyerahan laporan belanja riil, bukti bon/struk, dan kalkulasi otomatis selisih lebih/kurang oleh Asdos.
- `POST /api/requests/{id}/reimburse`: Penggantian uang belanja kurang oleh Keuangan & penutupan transaksi (`Selesai`).
- `DELETE /api/requests/{id}`: Menghapus pengajuan.

### 3. Inventaris Stok Lab (`/api/stocks`)
- `GET /api/stocks`: Daftar stok barang di laboratorium.
- `GET /api/stocks/map`: Map format dictionary `{ [namaBahan]: { stock, unit, costPerUnit } }`.
- `POST /api/stocks`: Tambah bahan baru ke stok lab.
- `PUT /api/stocks/{id}`: Update kuantitas stok atau batas minimum stok.
- `DELETE /api/stocks/{id}`: Hapus stok.

### 4. Kurikulum & Resep Masakan (`/api/curriculums`)
- `GET /api/curriculums`: Daftar resep master per prodi, semester, dan matakuliah. Mendukung `?format=tree` untuk format pohon bertingkat.
- `POST /api/curriculums`: Tambah resep kurikulum baru.

### 5. Notifikasi Sistem (`/api/notifications`)
- `GET /api/notifications`: Daftar notifikasi real-time (mendukung filter `?role=...`).
- `PATCH /api/notifications/{id}/read`: Tandai notifikasi telah dibaca.
- `POST /api/notifications/read-all`: Tandai semua notifikasi peran telah dibaca.

### 6. Peramalan Kebutuhan (`/api/forecasting`)
- `GET /api/forecasting/ingredients`: Dataset histori konsumsi bahan masakan per bulan.
- `POST /api/forecasting/calculate`: Menghitung peramalan kebutuhan masa depan dengan parameter Holt's Linear / SES beserta metrik akurasi (MAPE, MAD, MSE, RMSE).
