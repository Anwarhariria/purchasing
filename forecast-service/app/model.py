import os
import math
from datetime import datetime
from typing import Dict, Any, Tuple, List, Set
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV

from app.features import (
    NUMERIC_FEATURE_COLS,
    build_complete_grid,
    compute_lag_features,
    encode_features_for_training,
    encode_features_for_prediction,
    generate_period_range,
    add_months_to_period,
)


def calculate_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Menghitung Mean Absolute Error (MAE)."""
    if len(y_true) == 0:
        return 0.0
    return float(np.mean(np.abs(y_true - y_pred)))


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Menghitung Mean Absolute Percentage Error (MAPE).
    Baris dengan nilai aktual y_true == 0 diabaikan untuk menghindari pembagian dengan nol.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    nonzero_mask = y_true != 0
    if not np.any(nonzero_mask):
        return 0.0

    ape = np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])
    return float(np.mean(ape) * 100.0)


def split_time_based(
    df_features: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Melakukan time-based split:
    - 3 bulan periode terakhir sebagai data uji (test set), urutan kronologis tetap terjaga tanpa diacak.
    - Periode sebelum data uji sebagai data latih (train set).
    """
    unique_periods = sorted(df_features["periode"].unique())

    if len(unique_periods) > 3:
        test_periods = unique_periods[-3:]
        train_periods = unique_periods[:-3]
    elif len(unique_periods) == 3:
        # Jika periode berfitur lengkap hanya ada 3, pisahkan 1 bulan terakhir untuk uji agar train tidak kosong
        test_periods = unique_periods[-1:]
        train_periods = unique_periods[:-1]
    elif len(unique_periods) == 2:
        test_periods = unique_periods[-1:]
        train_periods = unique_periods[:1]
    else:
        test_periods = unique_periods
        train_periods = unique_periods

    train_df = df_features[df_features["periode"].isin(train_periods)].copy()
    test_df = df_features[df_features["periode"].isin(test_periods)].copy()

    return train_df, test_df


def train_forecast_model(
    raw_df: pd.DataFrame,
    version: int,
    is_simulated_data: bool = False,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Melatih RandomForestRegressor dengan hyperparameter tuning TimeSeriesSplit,
    mengevaluasi time-based split vs baseline MA3 dan Seasonal Naive pada data uji yang persis sama,
    dan mengembalikan (model_artifact, metadata_dict).
    """
    # 1. Validasi minimum data (minimal 6 bulan riwayat)
    unique_raw_periods = sorted(raw_df["periode"].unique())
    if len(unique_raw_periods) < 6:
        raise ValueError(f"Data riwayat belum cukup (minimal 6 bulan, diberikan {len(unique_raw_periods)} bulan)")

    # 2. Bangun grid lengkap & feature engineering
    grid_df = build_complete_grid(raw_df)
    features_df = compute_lag_features(grid_df, drop_incomplete=True)

    if features_df.empty:
        raise ValueError("Data setelah pembentukan fitur kosong.")

    unique_periods = sorted(features_df["periode"].unique())

    # 3. Setup Jendela Rolling-Origin (3 jendela uji)
    if len(unique_periods) >= 6:
        rolling_specs = [
            (unique_periods[:-5], unique_periods[-5:-2], 1),
            (unique_periods[:-4], unique_periods[-4:-1], 2),
            (unique_periods[:-3], unique_periods[-3:], 3),
        ]
        main_train_df = features_df[features_df["periode"].isin(unique_periods[:-3])].copy()
    elif len(unique_periods) >= 3:
        rolling_specs = [
            (unique_periods[:-1], unique_periods[-1:], 1),
        ]
        main_train_df = features_df[features_df["periode"].isin(unique_periods[:-1])].copy()
    else:
        rolling_specs = [
            (unique_periods, unique_periods, 1),
        ]
        main_train_df = features_df.copy()

    # 4. Seleksi Varian (rf_direct vs rf_residual) dan Tuning Hyperparameter
    # HANYA memakai TimeSeriesSplit pada data latih (main_train_df)!
    X_train_main, y_train_main, f_names_main, known_units, known_items = encode_features_for_training(main_train_df)
    lag12_train_main = main_train_df["lag_12"].values

    is_fast_test = os.environ.get("FORECAST_FAST_TEST") == "1"
    if is_fast_test:
        candidate_variants = ["rf_residual"]
        param_grid = [{"max_depth": 5, "min_samples_leaf": 3, "n_estimators": 50}]
        n_splits = 2
    else:
        candidate_variants = ["rf_residual", "rf_direct"]
        param_grid = [
            {"max_depth": d, "min_samples_leaf": l, "n_estimators": n}
            for d in [None, 5, 10]
            for l in [1, 3, 5]
            for n in [200, 400]
        ]
        n_splits = min(3, max(2, len(main_train_df["periode"].unique()) - 1)) if len(main_train_df["periode"].unique()) > 2 else 2

    tscv = TimeSeriesSplit(n_splits=n_splits)

    best_cv_score = float("inf")
    best_variant = "rf_residual"
    best_params = {"max_depth": 5 if is_fast_test else None, "min_samples_leaf": 3, "n_estimators": 50 if is_fast_test else 400}

    for variant in candidate_variants:
        for p in param_grid:
            split_scores = []
            for tr_idx, val_idx in tscv.split(X_train_main):
                rf_cv = RandomForestRegressor(**p, random_state=42, n_jobs=-1)
                if variant == "rf_residual":
                    y_tr_fold = y_train_main.iloc[tr_idx].values - lag12_train_main[tr_idx]
                    rf_cv.fit(X_train_main.iloc[tr_idx], y_tr_fold)
                    pred_cv = np.maximum(0.0, lag12_train_main[val_idx] + rf_cv.predict(X_train_main.iloc[val_idx]))
                else:
                    rf_cv.fit(X_train_main.iloc[tr_idx], y_train_main.iloc[tr_idx])
                    pred_cv = np.maximum(0.0, rf_cv.predict(X_train_main.iloc[val_idx]))

                split_scores.append(calculate_mae(y_train_main.iloc[val_idx].values, pred_cv))

            mean_cv = float(np.mean(split_scores))
            if mean_cv < best_cv_score:
                best_cv_score = mean_cv
                best_variant = variant
                best_params = p

    # 5. Evaluasi Rolling-Origin menggunakan (best_variant, best_params)
    rolling_windows = []
    for tr_p, te_p, win_num in rolling_specs:
        w_tr_df = features_df[features_df["periode"].isin(tr_p)]
        w_te_df = features_df[features_df["periode"].isin(te_p)]

        X_w_tr, y_w_tr, w_f_names, _, _ = encode_features_for_training(w_tr_df)
        X_w_te = encode_features_for_prediction(w_te_df, w_f_names)
        y_w_te = w_te_df["qty"].values
        lag12_w_tr = w_tr_df["lag_12"].values
        lag12_w_te = w_te_df["lag_12"].values
        ma3_w_te = w_te_df["ma3"].values

        eval_model = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
        if best_variant == "rf_residual":
            eval_model.fit(X_w_tr, y_w_tr - lag12_w_tr)
            p_rf = np.maximum(0.0, lag12_w_te + eval_model.predict(X_w_te))
        else:
            eval_model.fit(X_w_tr, y_w_tr)
            p_rf = np.maximum(0.0, eval_model.predict(X_w_te))

        mae_rf_w = calculate_mae(y_w_te, p_rf)
        mape_rf_w = calculate_mape(y_w_te, p_rf)
        mae_sn_w = calculate_mae(y_w_te, lag12_w_te)
        mape_sn_w = calculate_mape(y_w_te, lag12_w_te)
        mae_ma_w = calculate_mae(y_w_te, ma3_w_te)
        mape_ma_w = calculate_mape(y_w_te, ma3_w_te)

        rolling_windows.append({
            "window": win_num,
            "test_periods": te_p,
            "train_periods_count": len(tr_p),
            "mae_rf": round(mae_rf_w, 4),
            "mape_rf": round(mape_rf_w, 2),
            "mae_snaive": round(mae_sn_w, 4),
            "mape_snaive": round(mape_sn_w, 2),
            "mae_ma3": round(mae_ma_w, 4),
            "mape_ma3": round(mape_ma_w, 2),
        })

    # Summary Rolling-Origin
    rf_mapes = [w["mape_rf"] for w in rolling_windows]
    sn_mapes = [w["mape_snaive"] for w in rolling_windows]
    ma_mapes = [w["mape_ma3"] for w in rolling_windows]

    rf_maes = [w["mae_rf"] for w in rolling_windows]
    sn_maes = [w["mae_snaive"] for w in rolling_windows]
    ma_maes = [w["mae_ma3"] for w in rolling_windows]

    rolling_summary = {
        "mean_mape_rf": round(float(np.mean(rf_mapes)), 2),
        "std_mape_rf": round(float(np.std(rf_mapes)), 2),
        "mean_mae_rf": round(float(np.mean(rf_maes)), 4),
        "mean_mape_snaive": round(float(np.mean(sn_mapes)), 2),
        "std_mape_snaive": round(float(np.std(sn_mapes)), 2),
        "mean_mae_snaive": round(float(np.mean(sn_maes)), 4),
        "mean_mape_ma3": round(float(np.mean(ma_mapes)), 2),
        "std_mape_ma3": round(float(np.std(ma_mapes)), 2),
        "mean_mae_ma3": round(float(np.mean(ma_maes)), 4),
    }

    best_baseline_mean_mape = min(rolling_summary["mean_mape_snaive"], rolling_summary["mean_mape_ma3"])
    model_lebih_baik = bool(rolling_summary["mean_mape_rf"] <= best_baseline_mean_mape)

    # Final window (Window 3) metrics
    final_win = rolling_windows[-1]

    # 6. Latih model final pada seluruh data berfitur lengkap menggunakan (best_variant, best_params)
    X_all, y_all, all_feature_names, all_units, all_items = encode_features_for_training(features_df)
    final_model = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
    if best_variant == "rf_residual":
        final_model.fit(X_all, y_all - features_df["lag_12"].values)
    else:
        final_model.fit(X_all, y_all)

    # Feature importances
    importances = final_model.feature_importances_
    feat_imp = {
        name: round(float(imp), 4)
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
    }

    metadata = {
        "version": version,
        "trained_at": datetime.now().isoformat(),
        "total_months": len(unique_raw_periods),
        "row_count": len(features_df),
        "train_rows": len(main_train_df),
        "test_rows": len(features_df) - len(main_train_df),
        "selected_variant": best_variant,
        "mae_rf": final_win["mae_rf"],
        "mape_rf": final_win["mape_rf"],
        "mae_ma3": final_win["mae_ma3"],
        "mape_ma3": final_win["mape_ma3"],
        "mae_snaive": final_win["mae_snaive"],
        "mape_snaive": final_win["mape_snaive"],
        "best_params": best_params,
        "model_lebih_baik_dari_baseline": model_lebih_baik,
        "is_simulated_data": is_simulated_data,
        "rolling_windows": rolling_windows,
        "rolling_summary": rolling_summary,
        "feature_importance": feat_imp,
    }

    model_artifact = {
        "model": final_model,
        "selected_variant": best_variant,
        "feature_names": all_feature_names,
        "known_units": list(all_units),
        "known_items": list(all_items),
        "version": version,
        "metadata": metadata,
    }

    return model_artifact, metadata


def predict_step(
    current_grid: pd.DataFrame,
    target_period: str,
    model_artifact: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Meramalkan kebutuhan 1 bulan target_period menggunakan model_artifact (RF-Residual atau RF-Direct) atau baseline.
    """
    model: RandomForestRegressor = model_artifact["model"]
    variant: str = model_artifact.get("selected_variant", "rf_direct")
    feature_names: List[str] = model_artifact["feature_names"]
    known_units: Set[str] = set(model_artifact["known_units"])
    known_items: Set[str] = set(model_artifact["known_items"])

    unique_units = current_grid["unit_id"].unique()
    unique_items = current_grid["barang_id"].unique()

    # Tambahkan baris target_period dengan qty dummy 0.0 untuk menghitung lag
    rows_target = []
    for u in unique_units:
        for b in unique_items:
            rows_target.append({"periode": target_period, "unit_id": str(u), "barang_id": str(b), "qty": 0.0})

    extended_df = pd.concat([current_grid, pd.DataFrame(rows_target)], ignore_index=True)
    extended_grid = build_complete_grid(extended_df)
    features_df = compute_lag_features(extended_grid, drop_incomplete=False)

    target_features = features_df[features_df["periode"] == target_period].copy().reset_index(drop=True)

    results = []
    for _, row in target_features.iterrows():
        u_str = str(row["unit_id"])
        b_str = str(row["barang_id"])
        ma3_val = float(row["ma3"]) if not pd.isna(row["ma3"]) else 0.0
        qty_baseline = max(0, math.ceil(ma3_val))

        snaive_val = float(row["lag_12"]) if ("lag_12" in row and not pd.isna(row["lag_12"])) else ma3_val
        qty_snaive = max(0, math.ceil(snaive_val))

        is_known = (u_str in known_units) and (b_str in known_items)

        if not is_known:
            results.append({
                "unit_id": u_str,
                "barang_id": b_str,
                "target_period": target_period,
                "qty_prediksi": qty_baseline,
                "qty_baseline": qty_baseline,
                "qty_snaive": qty_snaive,
                "tanpa_model": True,
                "catatan": "Unit atau barang baru (tidak ada di data latih), menggunakan estimasi baseline MA3",
            })
        else:
            # Format 1 baris untuk inferensi model
            single_row_df = pd.DataFrame([row])
            X_encoded = encode_features_for_prediction(single_row_df, feature_names)
            pred_raw = model.predict(X_encoded)[0]

            if variant == "rf_residual":
                qty_pred = max(0, math.ceil(snaive_val + pred_raw))
            else:
                qty_pred = max(0, math.ceil(pred_raw))

            results.append({
                "unit_id": u_str,
                "barang_id": b_str,
                "target_period": target_period,
                "qty_prediksi": qty_pred,
                "qty_baseline": qty_baseline,
                "qty_snaive": qty_snaive,
                "tanpa_model": False,
                "catatan": None,
            })

    return results


def predict_recursive(
    raw_df: pd.DataFrame,
    target_period: str,
    model_artifact: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Melakukan peramalan rekursif jika target_period > 1 bulan setelah data riwayat terakhir.
    Maksimal peramalan 3 bulan ke depan.
    """
    if raw_df.empty:
        raise ValueError("Dataset riwayat kosong.")

    grid_df = build_complete_grid(raw_df)
    latest_period = grid_df["periode"].max()

    dt_latest = pd.to_datetime(latest_period + "-01")
    dt_target = pd.to_datetime(target_period + "-01")

    # Hitung selisih bulan
    month_diff = (dt_target.year - dt_latest.year) * 12 + (dt_target.month - dt_latest.month)

    if month_diff > 3:
        raise ValueError(
            f"Periode target '{target_period}' melebihi batas maksimal peramalan rekursif (maksimal 3 bulan ke depan dari periode terakhir '{latest_period}')."
        )

    if month_diff <= 0:
        # Peramalan langsung pada periode yang tersedia di grid
        return predict_step(grid_df, target_period, model_artifact)

    # Peramalan berantai bulan demi bulan
    working_grid = grid_df.copy()
    current_dt = dt_latest
    latest_predictions = []

    for step in range(1, month_diff + 1):
        next_dt = current_dt + pd.DateOffset(months=1)
        next_period_str = next_dt.strftime("%Y-%m")

        step_predictions = predict_step(working_grid, next_period_str, model_artifact)

        if next_period_str == target_period:
            latest_predictions = step_predictions
            break

        # Masukkan hasil prediksi langkah ini sebagai qty untuk langkah berikutnya
        pred_rows = [
            {
                "periode": next_period_str,
                "unit_id": p["unit_id"],
                "barang_id": p["barang_id"],
                "qty": float(p["qty_prediksi"]),
            }
            for p in step_predictions
        ]
        working_grid = pd.concat([working_grid, pd.DataFrame(pred_rows)], ignore_index=True)
        current_dt = next_dt

    return latest_predictions
