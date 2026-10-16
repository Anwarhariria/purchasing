from fastapi import FastAPI, Header, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from app.config import verify_internal_token, HOST, PORT
from app.schemas import (
    TrainRequest,
    TrainResponse,
    TrainMetrics,
    PredictRequest,
    PredictResponse,
    PredictionItem,
)
from app.model import train_forecast_model, predict_recursive
from app.storage import get_next_version, save_model, load_model, get_latest_version

app = FastAPI(
    title="SPAKE Forecast Service (AI)",
    description="Layanan peramalan kebutuhan pengadaan Alur B berbasis Random Forest Regression & MA3",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_internal_token(x_internal_token: str | None = Header(None, alias="X-Internal-Token")):
    """Dependency untuk memvalidasi header X-Internal-Token menggunakan secrets.compare_digest."""
    if not verify_internal_token(x_internal_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akses ditolak: token internal tidak valid atau tidak disertakan.",
        )
    return True


@app.get("/health", tags=["System"])
def health_check():
    """Endpoint pengecekan kesiapan layanan (publik/tanpa token)."""
    latest_v = get_latest_version()
    return {
        "status": "ok",
        "service": "forecast-service",
        "version": "1.0.0",
        "latest_model_version": latest_v,
    }


@app.post("/train", response_model=TrainResponse, tags=["Forecast"])
def train_model(
    request: TrainRequest,
    _: bool = Depends(require_internal_token),
):
    """
    Melatih model Random Forest pada dataset transaksi historis.
    Evaluasi time-based split 3 bulan terakhir vs baseline MA3.
    """
    if len(request.dataset) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Dataset pelatihan tidak boleh kosong.",
        )

    # Konversi ke pandas DataFrame
    raw_df = pd.DataFrame([row.model_dump() for row in request.dataset])

    # Cek jumlah bulan riwayat
    unique_months = raw_df["periode"].unique()
    if len(unique_months) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Data riwayat belum cukup (minimal 6 bulan)",
        )

    try:
        next_ver = get_next_version()
        artifact, metadata = train_forecast_model(
            raw_df,
            version=next_ver,
            is_simulated_data=request.is_simulated_data,
        )
        save_model(next_ver, artifact, metadata)

        return TrainResponse(
            status="success",
            message=f"Model versi {next_ver} berhasil dilatih dan disimpan.",
            data=TrainMetrics(**metadata),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat melatih model: {str(e)}",
        )


@app.get("/model-info", tags=["Forecast"])
def get_model_info(version: int | None = None):
    """Mengembalikan metadata model terbaru (atau versi tertentu)."""
    try:
        _, metadata = load_model(version)
        return {
            "status": "success",
            "data": metadata,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model belum tersedia atau belum pernah dilatih.",
        )


@app.post("/predict", response_model=PredictResponse, tags=["Forecast"])
def predict(
    request: PredictRequest,
    _: bool = Depends(require_internal_token),
):
    """
    Meramalkan kuantitas barang Alur B per unit kerja untuk periode target.
    Mendukung peramalan rekursif hingga maksimal 3 bulan ke depan.
    """
    if len(request.dataset) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Dataset riwayat untuk peramalan tidak boleh kosong.",
        )

    # Muat artifact model
    try:
        artifact, metadata = load_model(request.model_version)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    raw_df = pd.DataFrame([row.model_dump() for row in request.dataset])

    try:
        predictions_data = predict_recursive(
            raw_df=raw_df,
            target_period=request.target_period,
            model_artifact=artifact,
        )

        prediction_items = [PredictionItem(**item) for item in predictions_data]

        return PredictResponse(
            status="success",
            model_version=artifact["version"],
            target_period=request.target_period,
            predictions=prediction_items,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat melakukan peramalan: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
