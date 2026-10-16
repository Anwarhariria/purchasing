import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

# Base directory of forecast-service
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present
load_dotenv(BASE_DIR / ".env")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "spake-forecast-internal-secret-key-2026")
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(BASE_DIR / "models")))
if not MODEL_DIR.is_absolute():
    MODEL_DIR = BASE_DIR / MODEL_DIR
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def verify_internal_token(provided_token: str | None) -> bool:
    if not provided_token:
        return False
    return secrets.compare_digest(provided_token.strip(), INTERNAL_TOKEN.strip())
