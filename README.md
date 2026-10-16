# SPAKE - Sistem Pengadaan Kampus Terpadu
Universitas Asa Indonesia (ASAINDO)

SPAKE adalah aplikasi sistem pengadaan barang dan logistik internal kampus yang mendukung alur kerja peran multi-level (Pemohon/Asdos, Koordinator, Kaprodi, Keuangan Kitchen, Keuangan Umum, dan Super Admin IT) serta monitoring siklus pengadaan terintegrasi.

## Fitur Utama

- **Dashboard Berbasis Peran**:
  - Pemohon (Staf / Asisten Lab)
  - Bagian Umum / Koordinator Unit (Sarpras & Pengadaan)
  - Keuangan Kitchen & Keuangan Umum (Verifikasi & Alokasi Kasbon/Belanja)
  - Super Admin (IT & Manajemen Pengguna)
- **Monitoring Siklus 6 Tahapan Pengadaan**
- **Sistem Prioritas Belanja (Algoritma SAW)**
- **Ekspor Rekap Laporan Pengadaan (.CSV)**

## Pengembangan Lokal

```sh
npm install
npm run dev
```

Server pengembangan lokal akan berjalan pada `http://localhost:8080/`.

## Pengujian Backend & Database Khusus Test

Untuk menjalankan suite pengujian backend Laravel tanpa menghapus data pengembangan (`spake_db`), buat database khusus pengujian `spake_test` sekali saja via phpMyAdmin atau MySQL CLI:

```sql
CREATE DATABASE spake_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Konfigurasi pengujian di `backend/phpunit.xml` otomatis menggunakan `<env name="DB_DATABASE" value="spake_test"/>`.
Jalankan pengujian backend dengan:

```sh
cd backend
php artisan test
```
