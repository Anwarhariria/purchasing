import math
import pandas as pd
import numpy as np
from typing import Tuple, List, Set


NUMERIC_FEATURE_COLS = [
    "lag_1", "lag_2", "lag_3", "ma3",
    "lag_12", "rolling_mean_6", "yoy_ratio",
    "month", "is_semester_start",
]


def generate_period_range(min_period: str, max_period: str) -> List[str]:
    """Menghasilkan deret periode bulanan YYYY-MM dari min_period sampai max_period."""
    start_dt = pd.to_datetime(min_period + "-01")
    end_dt = pd.to_datetime(max_period + "-01")
    return pd.date_range(start_dt, end_dt, freq="MS").strftime("%Y-%m").tolist()


def add_months_to_period(period: str, months: int) -> str:
    """Menambahkan sejumlah bulan ke periode YYYY-MM."""
    dt = pd.to_datetime(period + "-01") + pd.DateOffset(months=months)
    return dt.strftime("%Y-%m")


def build_complete_grid(df: pd.DataFrame) -> pd.DataFrame:
    """
    Membangun grid lengkap per (unit_id, barang_id) untuk seluruh rentang waktu bulanan.
    Bulan tanpa pengajuan diisi qty = 0.0.
    """
    if df.empty:
        return pd.DataFrame(columns=["periode", "unit_id", "barang_id", "qty"])

    df_clean = df.copy()
    df_clean["unit_id"] = df_clean["unit_id"].astype(str)
    df_clean["barang_id"] = df_clean["barang_id"].astype(str)
    df_clean["qty"] = df_clean["qty"].astype(float)

    # Agregasi bila ada duplikat baris pada periode, unit, dan barang yang sama
    df_agg = (
        df_clean.groupby(["periode", "unit_id", "barang_id"], as_index=False)["qty"]
        .sum()
    )

    unique_units = df_clean["unit_id"].unique()
    unique_items = df_clean["barang_id"].unique()
    all_periods = generate_period_range(df_clean["periode"].min(), df_clean["periode"].max())

    # Cartesian product (periode x unit_id x barang_id)
    grid_index = pd.MultiIndex.from_product(
        [all_periods, unique_units, unique_items],
        names=["periode", "unit_id", "barang_id"]
    )
    df_full = pd.DataFrame(index=grid_index).reset_index()

    # Gabungkan dengan data riil, isi bulan tanpa pengajuan dengan 0.0
    merged = pd.merge(df_full, df_agg, on=["periode", "unit_id", "barang_id"], how="left")
    merged["qty"] = merged["qty"].fillna(0.0)
    merged = merged.sort_values(["unit_id", "barang_id", "periode"]).reset_index(drop=True)

    return merged


def compute_lag_features(df_grid: pd.DataFrame, drop_incomplete: bool = True) -> pd.DataFrame:
    """
    Menghitung lag_1, lag_2, lag_3, MA3, lag_12, rolling_mean_6, month, dan is_semester_start.
    Jika drop_incomplete=True, 3 baris pertama tiap deret (yang lag-nya belum lengkap) dibuang.
    Bila riwayat < 13 bulan, lag_12 dan rolling_mean_6 diisi dengan ma3.
    """
    df = df_grid.copy()
    df = df.sort_values(["unit_id", "barang_id", "periode"]).reset_index(drop=True)

    # Lag 1, 2, 3 per (unit_id, barang_id)
    grouped = df.groupby(["unit_id", "barang_id"])["qty"]
    df["lag_1"] = grouped.shift(1)
    df["lag_2"] = grouped.shift(2)
    df["lag_3"] = grouped.shift(3)

    # MA3 baseline (rata-rata bergerak 3 bulan dari lag)
    df["ma3"] = (df["lag_1"] + df["lag_2"] + df["lag_3"]) / 3.0

    # Fitur musiman lanjutan: lag_12 dan rolling_mean_6
    df["lag_12"] = grouped.shift(12)
    # rolling_mean_6 dihitung dari lag 1 s.d. 6 per (unit_id, barang_id)
    df["rolling_mean_6"] = df.groupby(["unit_id", "barang_id"])["qty"].transform(
        lambda s: s.shift(1).rolling(6).mean()
    )

    # Rasio pertumbuhan tahunan: yoy_ratio = ma3 / ma3_tahun_lalu
    lag_12_raw = grouped.shift(12)
    lag_13_raw = grouped.shift(13)
    lag_14_raw = grouped.shift(14)
    ma3_yoy = (lag_12_raw + lag_13_raw + lag_14_raw) / 3.0

    # Pengaman pembagian nol dan fallback bila data riwayat belum cukup
    yoy_ratio = df["ma3"] / ma3_yoy.replace(0, np.nan)
    df["yoy_ratio"] = yoy_ratio.replace([np.inf, -np.inf], np.nan).fillna(1.0).clip(0.1, 10.0)

    # Bila riwayat < 13 bulan / belum cukup, isi dengan ma3
    df["lag_12"] = df["lag_12"].fillna(df["ma3"])
    df["rolling_mean_6"] = df["rolling_mean_6"].fillna(df["ma3"])

    # Ekstraksi komponen kalender
    dt_series = pd.to_datetime(df["periode"] + "-01")
    df["month"] = dt_series.dt.month
    df["is_semester_start"] = df["month"].isin([2, 3, 8, 9]).astype(int)

    if drop_incomplete:
        # Buang baris dengan lag yang tidak lengkap (3 bulan pertama tiap deret)
        df = df.dropna(subset=["lag_1", "lag_2", "lag_3", "ma3"]).reset_index(drop=True)

    return df


def encode_features_for_training(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, List[str], Set[str], Set[str]]:
    """
    Melakukan One-Hot Encoding pada unit_id dan barang_id untuk dataset pelatihan.
    Mengembalikan (X, y, feature_names, known_units, known_items).
    """
    known_units = set(df["unit_id"].unique())
    known_items = set(df["barang_id"].unique())

    # One-hot encoding
    df_encoded = pd.get_dummies(df, columns=["unit_id", "barang_id"], prefix=["unit", "item"], dtype=float)

    # Identifikasi kolom fitur (numeric + dummy columns)
    one_hot_cols = [col for col in df_encoded.columns if col.startswith("unit_") or col.startswith("item_")]
    feature_names = NUMERIC_FEATURE_COLS + sorted(one_hot_cols)

    X = df_encoded[feature_names]
    y = df_encoded["qty"]

    return X, y, feature_names, known_units, known_items


def encode_features_for_prediction(
    df: pd.DataFrame,
    expected_feature_names: List[str]
) -> pd.DataFrame:
    """
    Menyusun ulang kolom fitur pada data prediksi agar persis sama dengan urutan saat training.
    Kolom one-hot yang tidak muncul di data uji diisi 0.0.
    """
    df_encoded = pd.get_dummies(df, columns=["unit_id", "barang_id"], prefix=["unit", "item"], dtype=float)

    # Pastikan seluruh kolom yang diharapkan saat training tersedia
    for col in expected_feature_names:
        if col not in df_encoded.columns:
            df_encoded[col] = 0.0

    return df_encoded[expected_feature_names]
