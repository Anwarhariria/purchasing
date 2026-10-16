# Product Requirements Document (PRD) — SPAKE
## Sistem Pengadaan Kampus ASAINDO (Versi MVP)
*Referensi: SRS Kelompok 1 — Revisi 7 Oktober 2026 | Durasi: 16 Minggu Capstone Project*

---

## 1. Ringkasan Eksekutif & Nilai Utama
**SPAKE (Sistem Pengadaan Kampus ASAINDO)** adalah aplikasi web terpadu dan responsif untuk mendigitalisasi serta mempercepat rantai pengadaan barang di lingkungan Universitas Asa Indonesia. SPAKE menjalankan dua alur kerja independen dalam satu sistem (*Dual-Workflow*):
1. **Alur A (Kitchen / Praktikum):** Pengadaan bahan praktikum mahasiswa Program Studi D3 Perhotelan berbasis resep silabus kurikulum dan integrasi stok chiller.
2. **Alur B (Umum & ATK):** Pengadaan logistik, alat tulis kantor, dan perlengkapan operasional untuk 6 unit kerja internal universitas berbasis katalog barang.

### Tiga Nilai Utama (Core Value Proposition)
1. **Persetujuan Berjenjang Terakselerasi:** Memangkas *lead time* persetujuan dari 3–5 hari kerja manual menjadi **≤ 1 × 24 jam** berkat notifikasi otomatis, *state machine* valid, dan eskalasi terukur.
2. **Alokasi Anggaran Parsial Fleksibel:** Kemampuan alokasi proporsional ($f \in \{1, 0.5, 0.25, 0\}$) oleh Bagian Keuangan saat ketersediaan likuiditas kas kampus terbatas, dengan penghitungan otomatis pada kuantitas pengadaan.
3. **Buku Kasbon Asdos Real-Time:** Eliminasi masalah asisten dosen menombok uang pribadi tanpa jejak melalui pencatatan dana diterima, belanja riil dari bon terverifikasi, sisa kembalian yang wajib disetor, serta *carry-over* otomatis tombok ke pencairan berikutnya hingga saldo akhir = 0.

---

## 2. Masalah dan Metrik Keberhasilan

### Masalah Utama
* Pengadaan kertas (*hardcopy form*) memakan waktu 3–5 hari kerja dan tidak dapat dipantau statusnya (*blind spot*).
* Asdos sering menombok uang pribadi di pasar subuh tanpa kepastian kapan diganti.
* Koordinator Lab dan Keuangan tidak memiliki visibilitas atas saldo riil kasbon yang dipegang maupun ditalangi Asdos.
* Terjadi pemborosan bahan praktikum karena pengadaan tidak memperhitungkan sisa stok bahan di *chiller*.

### Metrik Keberhasilan (Target MVP)
| Metrik | Kondisi Awal | Target | Cara Ukur |
| :--- | :--- | :--- | :--- |
| **Lead time persetujuan** | 3–5 hari kerja | ≤ 1 × 24 jam | Selisih waktu `DIAJUKAN` → `DANA_DICAIRKAN` / `SEDANG_DIBELANJAKAN` |
| **Transaksi selesai terekonsiliasi** | Tidak tercatat | 100% | Persentase status `SELESAI` yang memiliki bon valid + konfirmasi penerimaan |
| **Penyelesaian Kasbon Asdos** | Tidak tercatat | 100% | Setiap akun kasbon memiliki saldo akhir = Rp0 (setor lunas / *carry-over* impas) |
| **Pemborosan bahan praktikum** | Baseline semester lalu | Turun 80% | Kalkulasi kebutuhan bersih $\max(0, \text{Gross} - \text{Stok Chiller})$ |
| **Formulir manual kertas** | 100% formulir fisik | 0% (*paperless*) | Seluruh pengajuan tercatat di dalam basis data SPAKE |

---

## 3. Struktur Pengguna & Peran (RBAC)

Sistem memiliki **6 peran login aktif** (ditambah 1 peran operasional di luar sistem):

1. **Pemohon – Asdos Kitchen (4 Akun):** Ajukan bahan praktikum, update stok *chiller*, konfirmasi penerimaan barang, unggah nota/bon belanja, dan akses Buku Kasbon pribadinya.
2. **Pemohon – Staf Unit (6 Unit Kerja):** Ajukan ATK dan logistik kantor dari katalog barang, konfirmasi penerimaan barang.
3. **Koordinator Lab Kitchen (1 Akun):** Verifikasi pengajuan bahan, kelola item (edit qty, tambah barang, hapus barang dengan alasan), kelola stok *chiller*, pantau Buku Kasbon seluruh Asdos (*read-only*).
4. **Koordinator Unit Kerja (1 Akun):** Verifikasi pengajuan ATK/logistik 6 unit kerja, edit kuantitas usulan.
5. **Kaprodi D3 Perhotelan (1 Akun):** Kelola kurikulum & resep praktikum per kelompok, validasi kesesuaian silabus akademik, edit qty usulan.
6. **Keuangan Kitchen (1 Akun):** Alokasi parsial kas ($f$), cairkan kasbon (+ pelunasan tombok *carry-over*), verifikasi bon nota belanja, proses setor sisa kembalian, kelola Buku Kasbon seluruh Asdos, tutup transaksi.
7. **Keuangan Umum & ATK (1 Akun):** Alokasi anggaran Alur B, tugaskan petugas pembelanja (*offline*), verifikasi/input bon pembelian, tutup transaksi.
8. **Super Admin IT (1 Akun):** Manajemen akun pengguna, hak akses RBAC, master program studi, katalog barang, dan monitoring log audit sistem.
9. **Petugas Pembelanja (Luar Sistem):** Membeli barang fisik Alur B, mengantar barang ke unit kerja, dan menyerahkan nota ke Bagian Keuangan.

---

## 4. Ruang Lingkup MVP (MoSCoW)

### Must Have
- Autentikasi dan otorisasi berbasis peran (RBAC) untuk 6 peran pengguna.
- *Dual-Workflow Engine*: Alur A (Kitchen) dan Alur B (Logistik/ATK).
- Kelola item pengajuan oleh Koordinator Lab Kitchen:
  - **F-KL-01:** Edit kuantitas barang ($\text{Qty} > 0$, riwayat tercatat di audit log).
  - **F-KL-02:** Tambah barang baru dari master bahan (*tagging* "ditambah Koordinator").
  - **F-KL-03:** Hapus barang (*soft-delete* disertai alasan wajib, minimal sisa 1 barang).
  - **F-KL-04:** Verifikasi (`DIVERIFIKASI_KOORD`) atau Tolak (`DITOLAK_KOORD`). Penolakan Kaprodi mengembalikan status ke antrean Koordinator sebagai `DIAJUKAN`.
  - **F-KL-05:** Manajemen dan pembaruan stok *chiller* lab.
  - **F-KL-06:** Monitoring Buku Kasbon Asdos (*read-only*).
- Fitur Keuangan Kitchen:
  - **F-KK-01:** Alokasi parsial $f \in \{1, 0.5, 0.25, 0\}$ (catatan wajib jika $f < 1$), perhitungan nominal pencairan ($\text{Disetujui} \times f + \text{Tombok Carry-Over}$), unggah bukti transfer kasbon.
  - **F-KK-02:** Verifikasi bon belanja fisik vs nominal riil yang diinput Asdos.
  - **F-KK-03:** Pencatatan setor sisa kembalian (dengan bukti setor) atau otomatisasi *carry-over* tombok Asdos.
  - **F-KK-04:** Dasbor komprehensif Buku Kasbon per Asdos + filter + ekspor.
  - **F-KK-05:** Penutupan transaksi (`SELESAI`) dengan proteksi *read-only*.
- Konfirmasi penerimaan barang oleh pemohon + *auto-confirmation timeout* (72 jam).
- Audit trail dan notifikasi internal (lonceng).

### Should Have / Could Have
- Ekspor laporan Excel (.xlsx) & PDF untuk TM-1, Rekapitulasi Bon Belanja, dan Lembar Pertanggungjawaban (LPJ).
- Modul peramalan kebutuhan bahan (*forecasting* Holt's Linear / SES) dan *one-click draft generation*.

### Won't Have (Out of Scope MVP)
- Integrasi pihak ketiga berbayar (WhatsApp Gateway / SMS provider).
- *Automated bank payment gateway* (transfer bank tetap manual via *m-banking/teller*, sistem mencatat nomor referensi dan bukti transfer).
- Aplikasi *native mobile* (iOS/Android) — digantikan oleh Progressive/Responsive Web Mobile (< 640 px).
- Manajemen stok fisik gudang untuk Unit Umum/ATK (stok inventaris hanya untuk bahan lab *chiller*).

---

## 5. Spesifikasi Detail Modul Buku Kasbon Asdos

Modul Buku Kasbon Asdos berfungsi untuk menjamin akuntabilitas perputaran uang muka kerja praktikum.

### 5.1 Formula Matematika Transaksi
Untuk setiap pengajuan belanja $i$:
$$\text{Selisih}_i = \text{Dana Diterima}_i - \text{Belanja Riil}_i$$

* **Kasus 1 ($\text{Selisih}_i > 0$):** Sisa Kas (Kembalian). Asdos wajib menyetorkan uang kembali ke Keuangan.
* **Kasus 2 ($\text{Selisih}_i < 0$):** Uang Tombok Asdos. Menjadi kewajiban universitas yang dicatat sebagai *Carry-Over*.
* **Kasus 3 ($\text{Selisih}_i = 0$):** Transaksi impas.

Formula pencairan kasbon berikutnya untuk Asdos yang sama:
$$\text{Pencairan Kasbon}_{(t+1)} = \left(\text{Dana Disetujui}_{(t+1)} \times f\right) + \sum \text{Tombok Belum Diganti}$$

### 5.2 Skema Tabel Ringkasan Kasbon per Asdos
| Nama Asdos | Dana Diterima (Rp) | Belanja Riil (Rp) | Sisa Kas Belum Disetor (Rp) | Tombok Belum Diganti (Rp) | Status Kasbon | Tindakan Cepat |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Aura Maharani** | 1.500.000 | 1.420.000 | 80.000 | 0 | `Menunggu Setoran` | Catat Setoran |
| **Bima Sakti** | 1.200.000 | 1.285.000 | 0 | 85.000 | `Carry-Over Berikutnya` | Detail Kasbon |
| **Citra Lestari** | 900.000 | 900.000 | 0 | 0 | `Lunas` | Lihat Arsip |

---

## 6. Diagram State Machine Status Pengadaan

```
DIAJUKAN
   ├── [Setuju Koord] ──> DIVERIFIKASI_KOORD
   │                          ├── [Alur A: Setuju Kaprodi] ──> DISETUJUI_KAPRODI
   │                          │                                  ├── [Cairkan f > 0] ──> DANA_DICAIRKAN
   │                          │                                  └── [Tolak Keuangan] ─> DITOLAK_KEU (Final)
   │                          ├── [Alur B: Keuangan B] ─────> MENUNGGU_ALOKASI_KEU ──> SEDANG_DIBELANJAKAN
   │                          └── [Alur A: Tolak Kaprodi] ───> DIAJUKAN (Kembali ke antrean Koord)
   └── [Tolak Koord] ───> DITOLAK_KOORD (Revisi Pemohon)

DANA_DICAIRKAN / SEDANG_DIBELANJAKAN
   └── [Belanja / Serahkan Barang] ──> BARANG_DITERIMA (Manual / Auto 72 Jam)
                                           └── [Unggah Bon / Nota] ──> BON_DIUNGGAH
                                                                         └── [Verifikasi & Selesai Kasbon] ──> SELESAI
```

---

## 7. Risiko dan Keputusan Desain (Risks & Decisions)

### 7.1 Risiko Operasional & Mitigasi
1. **Risiko 1: Akumulasi Uang Tombok Asdos Menumpuk (*Deficit Snowball*)**
   * *Deskripsi:* Jika praktikum berjalan padat sementara pencairan kasbon berikutnya tertunda, Asdos dapat menombok dalam nominal yang membebani finansial pribadi.
   * *Keputusan Desain:* Sistem menetapkan *Threshold Warning* (peringatan otomatis) ketika akumulasi tombok seorang Asdos menembus $\ge \text{Rp250.000}$. Saat ambang batas ini terlampaui, Keuangan Kitchen menerima notifikasi prioritas tinggi untuk melakukan *Direct Reimbursement* (pembayaran penggantian langsung) tanpa harus menunggu pengajuan bahan berikutnya.

2. **Risiko 2: Efek Pemotongan Alokasi Anggaran Parsial ($f < 1$) terhadap Kelancaran Praktikum**
   * *Deskripsi:* Ketika kas kampus terbatas dan Keuangan memilih faktor alokasi $f = 0.5$ atau $0.25$, pemotongan kuantitas bahan dapat menyebabkan mahasiswa kekurangan bahan praktik.
   * *Keputusan Desain:* Alokasi parsial wajib disertai catatan rasionalisasi dari Keuangan. Sistem secara cerdas mengizinkan Koordinator Lab dan Dosen Pengampu untuk memilih: (a) mengurangi jumlah porsi masakan per kelompok, atau (b) menggabungkan 2 kelompok menjadi 1 workstation praktikum, tanpa membatalkan sesi kurikulum.

3. **Risiko 3: Petugas Pembelanja Alur B Bekerja di Luar Sistem (*Offline Blind Spot*)**
   * *Deskripsi:* Petugas pembelanja fisik Alur B tidak memiliki akun sistem, sehingga ada celah keterlambatan penyerahan nota fisik ke Keuangan.
   * *Keputusan Desain:* SPAKE memberlakukan *Service Level Agreement (SLA)* di antarmuka Keuangan Umum & ATK: jika pengajuan Alur B berstatus `SEDANG_DIBELANJAKAN` selama $> 48$ jam tanpa input bon, sistem memunculkan indikator peringatan kuning/merah agar Keuangan segera menagih nota ke petugas belanja lapangan.

4. **Risiko 4: Pemohon Lupa Konfirmasi Penerimaan Barang**
   * *Deskripsi:* Barang sudah diterima tetapi pemohon tidak menekan tombol konfirmasi, menyebabkan alur kasbon dan penutupan transaksi tersendat.
   * *Keputusan Desain:* Diterapkan mekanisme *Auto-Confirmation Scheduler*: jika barang telah berstatus dikirim/dibelanjakan selama $3 \times 24$ jam (72 jam) tanpa konfirmasi manual atau komplain penolakan dari pemohon, sistem otomatis memindahkan status ke `BARANG_DITERIMA` dengan catatan sistem `Konfirmasi Otomatis oleh Scheduler`.

### 7.2 Keputusan Arsitektur Teknis
1. **Pemisahan Logika Buku Kasbon (Database View vs Tabel Statis)**
   * *Keputusan:* Buku Kasbon Asdos **tidak disimpan sebagai tabel terpisah** melainkan dikalkulasikan secara *dynamic aggregated view* / *computed projection* dari tabel `kasbon`, `bon_belanja` (status terverifikasi), dan `kasbon_penyelesaian`.
   * *Rasional:* Mencegah *race condition*, ketidaksinkronan angka (*data drift*), dan duplikasi saldo saat terjadi pembatalan bon atau koreksi nilai verifikasi.

2. **Dual-Mode Demo & Produksi (In-Memory Frontend TanStack Start + REST Backend Laravel 12)**
   * *Keputusan:* Mengacu pada dokumen `AGENTS.md`, SPAKE dibangun agar memiliki kapabilitas *full standalone interactive demo* di sisi *client-side React state* (agar pengujian skenario role-playing langsung dapat dicoba di browser tanpa dependensi instalasi database lokal), sekaligus terhubung mulus via REST API Client (`SpakeApi`) ke backend Laravel 12 & MySQL ketika server aktif.

3. **Soft-Delete pada Penghapusan Item Pengajuan (F-KL-03)**
   * *Keputusan:* Item pengajuan yang dihapus Koordinator tidak dihapus secara permanen (`DELETE`), melainkan diisi kolom `deleted_at` dan `alasan_hapus`.
   * *Rasional:* Menjamin transparansi dan *auditability* bagi Kaprodi dan Pemohon saat melihat rincian riwayat perubahan bahan pengajuan.
