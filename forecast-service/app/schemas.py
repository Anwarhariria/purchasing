from typing import Any
from pydantic import BaseModel, Field, field_validator


class DatasetRow(BaseModel):
    periode: str = Field(..., description="Periode dalam format YYYY-MM (misal '2026-03')")
    unit_id: str = Field(..., description="ID atau nama unit kerja")
    barang_id: str = Field(..., description="ID atau nama katalog barang")
    qty: float = Field(..., description="Kuantitas barang yang diajukan")

    @field_validator("periode")
    @classmethod
    def validate_periode(cls, v: str) -> str:
        parts = v.strip().split("-")
        if len(parts) != 2 or len(parts[0]) != 4 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("Periode harus berformat YYYY-MM")
        month = int(parts[1])
        if month < 1 or month > 12:
            raise ValueError("Bulan pada periode harus antara 01 dan 12")
        return f"{parts[0]}-{int(parts[1]):02d}"

    @field_validator("unit_id", "barang_id", mode="before")
    @classmethod
    def convert_to_str(cls, v: Any) -> str:
        return str(v).strip()


class TrainRequest(BaseModel):
    dataset: list[DatasetRow] = Field(..., description="Daftar baris transaksi historis")
    is_simulated_data: bool = Field(default=False, description="Tandai apakah dataset bersumber dari simulasi")


class TrainMetrics(BaseModel):
    version: int
    trained_at: str
    total_months: int
    row_count: int
    train_rows: int
    test_rows: int
    selected_variant: str = "rf_residual"
    mae_rf: float
    mape_rf: float
    mae_ma3: float
    mape_ma3: float
    mae_snaive: float = 0.0
    mape_snaive: float = 0.0
    best_params: dict[str, Any] = Field(default_factory=dict)
    model_lebih_baik_dari_baseline: bool = False
    is_simulated_data: bool = False
    rolling_windows: list[dict[str, Any]] = Field(default_factory=list)
    rolling_summary: dict[str, Any] = Field(default_factory=dict)
    feature_importance: dict[str, float]


class TrainResponse(BaseModel):
    status: str = "success"
    message: str
    data: TrainMetrics


class PredictRequest(BaseModel):
    dataset: list[DatasetRow] = Field(..., description="Dataset riwayat pengadaan")
    target_period: str = Field(..., description="Periode target peramalan (YYYY-MM)")
    model_version: int | None = Field(default=None, description="Nomor versi model opsional (default: versi terbaru)")

    @field_validator("target_period")
    @classmethod
    def validate_target_period(cls, v: str) -> str:
        parts = v.strip().split("-")
        if len(parts) != 2 or len(parts[0]) != 4 or not parts[0].isdigit() or not parts[1].isdigit():
            raise ValueError("Target periode harus berformat YYYY-MM")
        month = int(parts[1])
        if month < 1 or month > 12:
            raise ValueError("Bulan pada target periode harus antara 01 dan 12")
        return f"{parts[0]}-{int(parts[1]):02d}"


class PredictionItem(BaseModel):
    unit_id: str
    barang_id: str
    target_period: str
    qty_prediksi: int
    qty_baseline: int
    qty_snaive: int | None = None
    tanpa_model: bool = False
    catatan: str | None = None


class PredictResponse(BaseModel):
    status: str = "success"
    model_version: int | str
    target_period: str
    predictions: list[PredictionItem]
