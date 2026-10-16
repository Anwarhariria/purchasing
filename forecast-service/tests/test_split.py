import pandas as pd
import pytest

from app.model import split_time_based


def test_split_preserves_temporal_order_not_shuffled():
    """
    SRS: Evaluasi time-based split (3 bulan terakhir sebagai data uji, tidak diacak).
    """
    # 8 periode berurutan (misal: 2025-04 s/d 2025-11 yang sudah berfitur lengkap)
    periods = [f"2025-{m:02d}" for m in range(4, 12)]
    data = []
    for p in periods:
        data.append({"periode": p, "unit_id": "U1", "barang_id": "B1", "qty": 10.0, "ma3": 10.0})
        data.append({"periode": p, "unit_id": "U2", "barang_id": "B2", "qty": 20.0, "ma3": 20.0})

    df = pd.DataFrame(data)
    train_df, test_df = split_time_based(df)

    train_periods = sorted(train_df["periode"].unique().tolist())
    test_periods = sorted(test_df["periode"].unique().tolist())

    # 3 bulan terakhir: 2025-09, 2025-10, 2025-11
    assert test_periods == ["2025-09", "2025-10", "2025-11"]
    # Bulan latih: 2025-04 s/d 2025-08
    assert train_periods == ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08"]

    # Pastikan tidak ada kebocoran waktu: seluruh periode latih strictly < periode uji
    assert max(train_periods) < min(test_periods)

    # Pastikan tidak ada periode yang tumpang tindih
    assert set(train_periods).isdisjoint(set(test_periods))


def test_split_small_dataset_no_empty_train():
    """
    Jika periode berfitur lengkap hanya ada 3 bulan, split tetap menyisakan data latih.
    """
    periods = ["2025-04", "2025-05", "2025-06"]
    data = [{"periode": p, "unit_id": "U1", "barang_id": "B1", "qty": 10.0, "ma3": 10.0} for p in periods]
    df = pd.DataFrame(data)

    train_df, test_df = split_time_based(df)
    assert len(train_df) > 0
    assert len(test_df) > 0
    assert max(train_df["periode"].unique()) < min(test_df["periode"].unique())
