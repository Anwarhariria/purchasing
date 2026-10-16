import pytest
from starlette.testclient import TestClient


def test_health_check_unauthenticated(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "forecast-service"


def test_auth_internal_token_protection(client: TestClient, sample_raw_12m_dataset):
    # Tanpa token -> 401
    res_no_token = client.post("/train", json={"dataset": sample_raw_12m_dataset})
    assert res_no_token.status_code == 401
    assert "token internal tidak valid" in res_no_token.json()["detail"]

    # Token salah -> 401
    res_wrong_token = client.post(
        "/train",
        json={"dataset": sample_raw_12m_dataset},
        headers={"X-Internal-Token": "token-palsu-ngawur"}
    )
    assert res_wrong_token.status_code == 401


def test_train_data_less_than_6_months_returns_422(client: TestClient, auth_headers):
    """
    Aturan 4: bila riwayat kurang dari 6 bulan, /train mengembalikan 422
    dengan pesan 'Data riwayat belum cukup (minimal 6 bulan)'.
    """
    short_dataset = [
        {"periode": f"2025-0{m}", "unit_id": "UNIT_D3", "barang_id": "KAT_KERTAS", "qty": 10.0}
        for m in range(1, 5)  # Hanya 4 bulan
    ]
    response = client.post("/train", json={"dataset": short_dataset}, headers=auth_headers)
    assert response.status_code == 422
    assert "Data riwayat belum cukup (minimal 6 bulan)" in response.json()["detail"]


def test_train_success_and_metrics_evaluation(client: TestClient, auth_headers, sample_raw_12m_dataset):
    """
    Uji pelatihan model dengan dataset 12 bulan:
    - Menyimpan model rf_v{n}.joblib
    - Mengembalikan metrik evaluasi RF dan MA3 pada data uji yang sama
    """
    response = client.post("/train", json={"dataset": sample_raw_12m_dataset}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"

    data = body["data"]
    assert "version" in data
    assert data["version"] >= 1
    assert data["total_months"] == 12
    assert "mae_rf" in data
    assert "mape_rf" in data
    assert "mae_ma3" in data
    assert "mape_ma3" in data
    assert "mae_snaive" in data
    assert "mape_snaive" in data
    assert "best_params" in data
    assert isinstance(data["best_params"], dict)
    assert "model_lebih_baik_dari_baseline" in data
    assert isinstance(data["model_lebih_baik_dari_baseline"], bool)
    assert "feature_importance" in data
    assert isinstance(data["feature_importance"], dict)


def test_model_info_endpoint(client: TestClient, auth_headers, sample_raw_12m_dataset):
    # Latih model dengan flag is_simulated_data = True
    train_res = client.post(
        "/train",
        json={"dataset": sample_raw_12m_dataset, "is_simulated_data": True},
        headers=auth_headers
    )
    v = train_res.json()["data"]["version"]

    res = client.get("/model-info")
    assert res.status_code == 200
    meta = res.json()["data"]
    assert meta["version"] == v
    assert meta["is_simulated_data"] is True
    assert "mae_snaive" in meta
    assert "mape_snaive" in meta


def test_predict_standard_1_month_ahead(client: TestClient, auth_headers, sample_raw_12m_dataset):
    """
    Peramalan 1 bulan ke depan (2026-01 setelah data riwayat terakhir 2025-12).
    """
    # Pastikan model terlatih dahulu
    client.post("/train", json={"dataset": sample_raw_12m_dataset}, headers=auth_headers)

    pred_req = {
        "dataset": sample_raw_12m_dataset,
        "target_period": "2026-01",
    }
    response = client.post("/predict", json=pred_req, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["target_period"] == "2026-01"

    preds = body["predictions"]
    assert len(preds) > 0

    for item in preds:
        assert "qty_prediksi" in item
        assert "qty_baseline" in item
        assert isinstance(item["qty_prediksi"], int)
        assert item["qty_prediksi"] >= 0
        assert item["qty_baseline"] >= 0
        assert item["tanpa_model"] is False


def test_predict_unseen_unit_or_item_returns_baseline_only(client: TestClient, auth_headers, sample_raw_12m_dataset):
    """
    Aturan 2: Bila unit/barang belum pernah ada di data latih -> kembalikan qty_baseline saja
    dan tandai "tanpa_model": true.
    """
    # Latih model dengan data latih awal (hanya berisi UNIT_D3 & UNIT_PMB, KAT_KERTAS & KAT_SPIDOL)
    train_res = client.post("/train", json={"dataset": sample_raw_12m_dataset}, headers=auth_headers)
    trained_v = train_res.json()["data"]["version"]

    # Saat /predict, berikan riwayat yang menyertakan UNIT_BARU_ASING
    dataset_with_new_unit = list(sample_raw_12m_dataset)
    for m in range(1, 13):
        dataset_with_new_unit.append({
            "periode": f"2025-{m:02d}",
            "unit_id": "UNIT_BARU_ASING",
            "barang_id": "KAT_KERTAS",
            "qty": 30.0,
        })

    pred_req = {
        "dataset": dataset_with_new_unit,
        "target_period": "2026-01",
        "model_version": trained_v,
    }
    response = client.post("/predict", json=pred_req, headers=auth_headers)
    assert response.status_code == 200

    predictions = response.json()["predictions"]
    new_unit_items = [p for p in predictions if p["unit_id"] == "UNIT_BARU_ASING"]
    assert len(new_unit_items) > 0

    for p in new_unit_items:
        # Unit baru harus ditandai tanpa_model=True
        assert p["tanpa_model"] is True
        # Prediksi disamakan dengan baseline
        assert p["qty_prediksi"] == p["qty_baseline"]
        assert "Unit atau barang baru" in p["catatan"]


def test_predict_recursive_2_months_ahead(client: TestClient, auth_headers, sample_raw_12m_dataset):
    """
    Aturan 3: Peramalan rekursif bila target_period > 1 bulan setelah data terakhir (misal 2026-02).
    """
    client.post("/train", json={"dataset": sample_raw_12m_dataset}, headers=auth_headers)

    # Data riwayat terakhir adalah 2025-12. Target 2026-02 (2 bulan ke depan).
    pred_req = {
        "dataset": sample_raw_12m_dataset,
        "target_period": "2026-02",
    }
    response = client.post("/predict", json=pred_req, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["target_period"] == "2026-02"
    assert len(body["predictions"]) > 0
    for p in body["predictions"]:
        assert p["qty_prediksi"] >= 0


def test_predict_exceeding_3_months_limit_returns_422(client: TestClient, auth_headers, sample_raw_12m_dataset):
    """
    Aturan 3: Batasi peramalan rekursif maksimal 3 bulan ke depan.
    Jika 4 bulan ke depan (2026-04 dari 2025-12) -> 422.
    """
    client.post("/train", json={"dataset": sample_raw_12m_dataset}, headers=auth_headers)

    pred_req = {
        "dataset": sample_raw_12m_dataset,
        "target_period": "2026-04",  # 4 bulan setelah 2025-12
    }
    response = client.post("/predict", json=pred_req, headers=auth_headers)
    assert response.status_code == 422
    assert "maksimal 3 bulan ke depan" in response.json()["detail"]
