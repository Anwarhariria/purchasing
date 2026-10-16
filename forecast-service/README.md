# SPAKE Forecast Service (AI)

Layanan peramalan cerdas kuantitas kebutuhan pengadaan barang unit kerja (Alur B) kampus ASAINDO berbasis **Random Forest Regression** dan pembanding baseline **Moving Average 3 Bulan (MA3)** sesuai SRS rev 14 Okt 2026.

---

## 1. Arsitektur & Logika Model

1. **Input Data**:
   - Menerima deret transaksi bulanan dari Laravel via HTTP JSON (bukan query langsung ke database):
     `{"periode": "YYYY-MM", "unit_id": "...", "barang_id": "...", "qty": float}`.
2. **Feature Engineering**:
   - **Kalender Lengkap**: Mengisi bulan-bulan tanpa pengajuan dengan kuantitas `0.0`.
   - **Fitur Lag**:
     - `lag_1`, `lag_2`, `lag_3`: kuantitas permintaan 1, 2, dan 3 bulan sebelumnya.
     - `ma3`: $\frac{\text{lag\_1} + \text{lag\_2} + \text{lag\_3}}{3}$ (baseline pembanding).
   - **Kalender Akademik**:
     - `month`: angka bulan (1–12).
     - `is_semester_start`: bernilai `1` untuk bulan Februari, Maret, Agustus, dan September (masa awal perkuliahan/ujian), `0` untuk bulan lainnya.
   - **Pembersihan Data Latih**:
     - 3 baris pertama per deret (karena lag belum lengkap) dibuang dari data latih (tidak diisi 0).
   - **One-Hot Encoding**:
     - Kolom `unit_id` dan `barang_id` dikonversi ke one-hot encoding.
     - Daftar kolom one-hot disimpan di artefak model (`rf_v{n}.joblib`) untuk menjamin konsistensi fitur saat inferensi.
     - Unit/barang baru yang belum pernah muncul di data latih ditandai `tanpa_model: true` dan diberikan estimasi baseline MA3.
3. **Model & Evaluasi**:
   - `RandomForestRegressor(n_estimators=200, random_state=42)`.
   - **Time-based split**: 3 bulan periode terakhir dijadikan data uji (urutan kronologis tidak diacak).
   - **Metrik**: MAE dan MAPE (baris aktual $y = 0$ diabaikan saat menghitung MAPE untuk mencegah division by zero). Dihitung pada data uji yang sama persis untuk perbandingan adil antara RF dan MA3.
4. **Peramalan Rekursif**:
   - Jika periode target lebih dari 1 bulan setelah data terakhir, sistem melakukan peramalan berantai (hasil bulan sebelumnya diumpankan sebagai lag bulan berikutnya), maksimal hingga 3 bulan ke depan.

---

## 2. Struktur Direktori

```text
forecast-service/
├── .env.example              # Template konfigurasi port & internal secret
├── requirements.txt          # Dependensi Python ter-pin
├── README.md                 # Dokumentasi arsitektur & API
├── app/
│   ├── config.py             # Konfigurasi & verifikasi token secrets.compare_digest
│   ├── schemas.py            # Pydantic schema request & response
│   ├── features.py           # Feature engineering & one-hot encoding
│   ├── model.py              # Random Forest & recursive multi-step forecasting
│   ├── storage.py            # Model versioning (rf_v{n}.joblib & rf_v{n}.json)
│   └── main.py               # FastAPI application
├── models/                   # Direktori artefak model (diabaikan oleh git)
│   └── .gitkeep
└── tests/                    # Pengujian otomatis pytest
    ├── conftest.py
    ├── test_features.py
    ├── test_metrics.py
    ├── test_split.py
    └── test_api.py
```

---

## 3. Instalasi & Menjalankan Service

### Instalasi Dependensi
```bash
pip install -r requirements.txt
```

### Menjalankan Pengujian Pytest
```bash
pytest
```

### Menjalankan Server FastAPI
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 4. Spesifikasi Endpoint

Seluruh endpoint (kecuali `/health`) mewajibkan header:
`X-Internal-Token: spake-forecast-internal-secret-key-2026`

### 1. `GET /health`
Mengecek status kesehatan service dan versi model aktif terakhir.

### 2. `POST /train`
Melatih model baru dari dataset transaksi historis (minimal 6 bulan data).
- **Body**: `{"dataset": [{"periode": "2025-01", "unit_id": "...", "barang_id": "...", "qty": 10.0}, ...]}`
- **Response**: Metrik evaluasi model baru (MAE RF vs MA3, MAPE RF vs MA3, dan feature importance).

### 3. `POST /predict`
Meramalkan kebutuhan per (unit, barang) pada periode target (maksimal 3 bulan ke depan).
- **Body**:
  ```json
  {
    "dataset": [...],
    "target_period": "2026-02",
    "model_version": 1
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "model_version": 1,
    "target_period": "2026-02",
    "predictions": [
      {
        "unit_id": "UNIT_D3",
        "barang_id": "KAT_KERTAS",
        "target_period": "2026-02",
        "qty_prediksi": 12,
        "qty_baseline": 10,
        "tanpa_model": false,
        "catatan": null
      }
    ]
  }
  ```
