import numpy as np
import pytest

from app.model import calculate_mae, calculate_mape


def test_calculate_mae():
    y_true = np.array([10.0, 20.0, 30.0])
    y_pred = np.array([12.0, 18.0, 35.0])
    # abs errors: 2.0, 2.0, 5.0 -> mean = 9.0 / 3 = 3.0
    mae = calculate_mae(y_true, y_pred)
    assert mae == pytest.approx(3.0)


def test_calculate_mape_ignores_zero_actual():
    """
    SRS: Abaikan aktual = 0 saat menghitung MAPE.
    """
    y_true = np.array([0.0, 100.0, 0.0, 50.0])
    y_pred = np.array([10.0, 110.0, 5.0, 40.0])

    # Nilai pada index 0 dan 2 diabaikan karena y_true = 0.
    # Non-zero actuals:
    # index 1: |100 - 110| / 100 = 10 / 100 = 10%
    # index 3: |50 - 40| / 50 = 10 / 50 = 20%
    # Mean MAPE = (10% + 20%) / 2 = 15.0%
    mape = calculate_mape(y_true, y_pred)
    assert mape == pytest.approx(15.0)


def test_calculate_mape_all_zeros_returns_zero():
    y_true = np.array([0.0, 0.0, 0.0])
    y_pred = np.array([5.0, 2.0, 1.0])
    mape = calculate_mape(y_true, y_pred)
    assert mape == 0.0


def test_calculate_mape_empty_returns_zero():
    y_true = np.array([])
    y_pred = np.array([])
    assert calculate_mape(y_true, y_pred) == 0.0
    assert calculate_mae(y_true, y_pred) == 0.0
