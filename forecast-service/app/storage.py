import re
import json
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import joblib

from app.config import MODEL_DIR


def get_next_version() -> int:
    """Mencari nomor versi berikutnya berdasarkan file yang ada di MODEL_DIR."""
    pattern = re.compile(r"^rf_v(\d+)\.joblib$")
    existing_versions = []

    for f in MODEL_DIR.glob("rf_v*.joblib"):
        match = pattern.match(f.name)
        if match:
            existing_versions.append(int(match.group(1)))

    if not existing_versions:
        return 1
    return max(existing_versions) + 1


def get_latest_version() -> Optional[int]:
    """Mencari nomor versi model terakhir yang tersimpan."""
    pattern = re.compile(r"^rf_v(\d+)\.joblib$")
    existing_versions = []

    for f in MODEL_DIR.glob("rf_v*.joblib"):
        match = pattern.match(f.name)
        if match:
            existing_versions.append(int(match.group(1)))

    if not existing_versions:
        return None
    return max(existing_versions)


def save_model(version: int, artifact: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[Path, Path]:
    """Menyimpan artifact model ke .joblib dan metadata ke .json."""
    model_path = MODEL_DIR / f"rf_v{version}.joblib"
    meta_path = MODEL_DIR / f"rf_v{version}.json"

    joblib.dump(artifact, model_path)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    return model_path, meta_path


def load_model(version: Optional[int] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Memuat model artifact dan metadata berdasarkan nomor versi.
    Jika version=None, memuat versi terbaru.
    """
    if version is None:
        version = get_latest_version()
        if version is None:
            raise FileNotFoundError("Belum ada model yang pernah dilatih di direktori models/.")

    model_path = MODEL_DIR / f"rf_v{version}.joblib"
    meta_path = MODEL_DIR / f"rf_v{version}.json"

    if not model_path.exists():
        raise FileNotFoundError(f"File model versi {version} ({model_path.name}) tidak ditemukan.")

    artifact = joblib.load(model_path)

    metadata = {}
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    return artifact, metadata
