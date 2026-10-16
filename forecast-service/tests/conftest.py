import os
import sys
import tempfile
import shutil
from pathlib import Path

# Aktifkan mode fast-test untuk pytest suite
os.environ["FORECAST_FAST_TEST"] = "1"

# Isolasi MODEL_DIR ke folder temporary selama pengujian
_test_temp_dir = tempfile.mkdtemp(prefix="spake_models_test_")
os.environ["MODEL_DIR"] = _test_temp_dir

import pytest
from starlette.testclient import TestClient

# Pastikan root forecast-service ada di sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import app.config as config
import app.storage as storage
config.MODEL_DIR = Path(_test_temp_dir)
storage.MODEL_DIR = Path(_test_temp_dir)

from app.main import app
from app.config import INTERNAL_TOKEN


@pytest.fixture(scope="session", autouse=True)
def cleanup_temp_models():
    yield
    if os.path.exists(_test_temp_dir):
        shutil.rmtree(_test_temp_dir, ignore_errors=True)


@pytest.fixture
def auth_headers():
    return {"X-Internal-Token": INTERNAL_TOKEN}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_raw_12m_dataset():
    """
    Dataset sintetis 12 bulan (2025-01 s/d 2025-12) untuk 2 unit dan 2 barang,
    dengan beberapa bulan sengaja kosong untuk menguji zero-filling.
    """
    data = []
    periods = [f"2025-{m:02d}" for m in range(1, 13)]

    # Pola permintaan:
    # Unit U1, Barang B1 (Kertas): lonjakan di awal semester (Mar, Agu)
    # Unit U1, Barang B2 (Spidol): stabil
    # Unit U2, Barang B1: ada bulan kosong (Mei, Jun, Nov)
    for p in periods:
        m = int(p.split("-")[1])
        # U1 - B1
        qty_u1_b1 = 20.0 if m in [3, 8] else (10.0 if m % 2 == 1 else 8.0)
        data.append({"periode": p, "unit_id": "UNIT_D3", "barang_id": "KAT_KERTAS", "qty": qty_u1_b1})

        # U1 - B2
        data.append({"periode": p, "unit_id": "UNIT_D3", "barang_id": "KAT_SPIDOL", "qty": 5.0})

        # U2 - B1 (dengan bulan kosong: skip bulan 5, 6, 11)
        if m not in [5, 6, 11]:
            data.append({"periode": p, "unit_id": "UNIT_PMB", "barang_id": "KAT_KERTAS", "qty": 15.0})

    return data
