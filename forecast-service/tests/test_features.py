import pandas as pd
import pytest

from app.features import (
    build_complete_grid,
    compute_lag_features,
    encode_features_for_training,
    encode_features_for_prediction,
)


def test_build_complete_grid_zero_fills_missing_months():
    # Buat data hanya ada di bulan 1 dan bulan 3 (bulan 2 kosong)
    raw_data = [
        {"periode": "2025-01", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-03", "unit_id": "U1", "barang_id": "B1", "qty": 25.0},
    ]
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)

    # Grid harus memiliki 3 baris: 2025-01, 2025-02, 2025-03
    assert len(grid) == 3
    assert set(grid["periode"].tolist()) == {"2025-01", "2025-02", "2025-03"}

    # Bulan 2025-02 harus bernilai 0.0
    row_feb = grid[grid["periode"] == "2025-02"].iloc[0]
    assert row_feb["qty"] == 0.0
    assert row_feb["unit_id"] == "U1"
    assert row_feb["barang_id"] == "B1"


def test_compute_lag_features_correctness():
    # Buat deret 5 bulan
    raw_data = [
        {"periode": f"2025-0{i}", "unit_id": "U1", "barang_id": "B1", "qty": float(i * 10)}
        for i in range(1, 6)
    ]
    # Nilai qty: Jan=10, Feb=20, Mar=30, Apr=40, Mei=50
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)

    # Drop incomplete = False untuk cek lag NaN pada 3 bulan pertama
    df_with_nan = compute_lag_features(grid, drop_incomplete=False)
    assert len(df_with_nan) == 5

    # Baris Apr (index 3):
    # lag_1 = Mar (30), lag_2 = Feb (20), lag_3 = Jan (10)
    # ma3 = (30 + 20 + 10) / 3 = 20.0
    row_apr = df_with_nan[df_with_nan["periode"] == "2025-04"].iloc[0]
    assert row_apr["lag_1"] == 30.0
    assert row_apr["lag_2"] == 20.0
    assert row_apr["lag_3"] == 10.0
    assert row_apr["ma3"] == pytest.approx(20.0)
    assert row_apr["month"] == 4
    assert row_apr["is_semester_start"] == 0

    # Baris Mei (index 4):
    # lag_1 = Apr (40), lag_2 = Mar (30), lag_3 = Feb (20)
    # ma3 = (40 + 30 + 20) / 3 = 30.0
    row_mei = df_with_nan[df_with_nan["periode"] == "2025-05"].iloc[0]
    assert row_mei["lag_1"] == 40.0
    assert row_mei["lag_2"] == 30.0
    assert row_mei["lag_3"] == 20.0
    assert row_mei["ma3"] == pytest.approx(30.0)


def test_first_3_rows_dropped_from_training():
    """
    Aturan 1: Baris yang lag-nya belum lengkap (3 bulan pertama tiap deret)
    dibuang dari data latih, JANGAN diisi 0.
    """
    raw_data = [
        {"periode": f"2025-0{i}", "unit_id": "U1", "barang_id": "B1", "qty": float(i * 5)}
        for i in range(1, 6)
    ]
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)

    # drop_incomplete = True
    features = compute_lag_features(grid, drop_incomplete=True)

    # Dari 5 bulan, 3 bulan pertama dibuang -> sisa tepat 2 baris (Apr dan Mei)
    assert len(features) == 2
    assert features["periode"].tolist() == ["2025-04", "2025-05"]
    assert not features["lag_1"].isna().any()
    assert not features["lag_2"].isna().any()
    assert not features["lag_3"].isna().any()
    assert not features["ma3"].isna().any()


def test_is_semester_start_flag():
    # Bulan 2 (Feb), 3 (Mar), 8 (Agu), 9 (Sep) -> 1
    # Bulan 1 (Jan), 4 (Apr), 5 (Mei), dll -> 0
    raw_data = [
        {"periode": "2025-02", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-03", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-04", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-08", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-09", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
        {"periode": "2025-10", "unit_id": "U1", "barang_id": "B1", "qty": 10.0},
    ]
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)
    features = compute_lag_features(grid, drop_incomplete=False)

    flags = dict(zip(features["periode"], features["is_semester_start"]))
    assert flags["2025-02"] == 1
    assert flags["2025-03"] == 1
    assert flags["2025-08"] == 1
    assert flags["2025-09"] == 1
    assert flags["2025-04"] == 0
    assert flags["2025-10"] == 0


def test_lag_12_and_rolling_mean_6_fallback_when_short_history():
    """
    SRS Tahap 6b: Bila riwayat < 13 bulan, fitur lag_12 dan rolling_mean_6 diisi dengan ma3.
    """
    # Buat riwayat 7 bulan
    raw_data = [
        {"periode": f"2025-{m:02d}", "unit_id": "U1", "barang_id": "B1", "qty": float(m * 10)}
        for m in range(1, 8)
    ]
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)
    features = compute_lag_features(grid, drop_incomplete=True)

    # Pada data < 13 bulan, lag_12 harus sama dengan ma3
    assert (features["lag_12"] == features["ma3"]).all()
    # Bulan ke-4 s/d ke-6 (karena butuh 6 lag untuk rolling_mean_6 sejati), rolling_mean_6 fallback ke ma3
    row_apr = features[features["periode"] == "2025-04"].iloc[0]
    assert row_apr["rolling_mean_6"] == row_apr["ma3"]


def test_lag_12_and_rolling_mean_6_with_long_history():
    """
    SRS Tahap 6b: Bila riwayat >= 13 bulan, lag_12 mengambil nilai bulan yang sama tahun lalu,
    dan rolling_mean_6 mengambil rata-rata 6 bulan sebelumnya.
    """
    # Buat riwayat 15 bulan: 2024-01 s/d 2025-03
    periods = [f"2024-{m:02d}" for m in range(1, 13)] + [f"2025-01", "2025-02", "2025-03"]
    # Tiap bulan m = nilai qty
    raw_data = [
        {"periode": p, "unit_id": "U1", "barang_id": "B1", "qty": float(idx + 1) * 10.0}
        for idx, p in enumerate(periods)
    ]
    df = pd.DataFrame(raw_data)
    grid = build_complete_grid(df)
    features = compute_lag_features(grid, drop_incomplete=True)

    # Baris 2025-01 (bulan ke-13, idx=12). Bulan yang sama tahun lalu adalah 2024-01 (qty = 10.0).
    row_2025_01 = features[features["periode"] == "2025-01"].iloc[0]
    assert row_2025_01["lag_12"] == pytest.approx(10.0)

    # 6 bulan sebelumnya untuk 2025-01: Jul(70), Aug(80), Sep(90), Oct(100), Nov(110), Dec(120)
    # Rata-rata 6 bulan = (70+80+90+100+110+120)/6 = 95.0
    assert row_2025_01["rolling_mean_6"] == pytest.approx(95.0)
