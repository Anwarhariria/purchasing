import type {
  HistoricalDataPoint,
  ForecastCalculationRow,
  ForecastResult,
} from "@/types/procurement";

// Algoritma 1: Holt's Linear Exponential Smoothing (Double Exponential Smoothing)
export function runHoltLinear(
  history: HistoricalDataPoint[],
  alpha: number,
  beta: number,
  horizon = 1
): ForecastResult {
  const n = history.length;
  if (n < 2) {
    return {
      rows: [],
      nextForecast: 0,
      nextMonthLabel: "Okt 2026",
      horizonForecasts: [],
      mape: 0,
      mad: 0,
      mse: 0,
      rmse: 0,
      evaluation: "Data tidak mencukupi",
    };
  }

  let l = history[0].actual;
  let b = history[1].actual - history[0].actual;
  const rows: ForecastCalculationRow[] = [];

  for (let t = 0; t < n; t++) {
    const act = history[t].actual;
    let fc = 0;

    if (t === 0) {
      fc = act;
    } else {
      fc = Number((l + b).toFixed(2));
      const prevL = l;
      l = alpha * act + (1 - alpha) * (l + b);
      b = beta * (l - prevL) + (1 - beta) * b;
    }

    const err = Number((act - fc).toFixed(2));
    const absErr = Math.abs(err);
    const ape = act > 0 ? Number(((absErr / act) * 100).toFixed(2)) : 0;
    const sqErr = Number((err * err).toFixed(2));

    rows.push({
      month: history[t].month,
      actual: act,
      forecast: fc,
      error: err,
      absError: absErr,
      ape,
      sqError: sqErr,
    });
  }

  // Menghitung metrik akurasi dari t = 1 sampai n-1
  const validRows = rows.slice(1);
  const totalApe = validRows.reduce((sum, r) => sum + r.ape, 0);
  const totalAbs = validRows.reduce((sum, r) => sum + r.absError, 0);
  const totalSq = validRows.reduce((sum, r) => sum + r.sqError, 0);
  const count = validRows.length || 1;

  const mape = Number((totalApe / count).toFixed(2));
  const mad = Number((totalAbs / count).toFixed(2));
  const mse = Number((totalSq / count).toFixed(2));
  const rmse = Number(Math.sqrt(mse).toFixed(2));

  // Proyeksi ke masa depan
  const monthNames = ["Okt 2026", "Nov 2026", "Des 2026", "Jan 2027", "Feb 2027", "Mar 2027"];
  const horizonForecasts: { month: string; forecast: number }[] = [];
  for (let m = 1; m <= horizon; m++) {
    const predVal = Math.max(0, Number((l + m * b).toFixed(1)));
    horizonForecasts.push({
      month: monthNames[m - 1] || `Bulan +${m}`,
      forecast: predVal,
    });
  }

  const nextForecast = horizonForecasts[0]?.forecast || 0;
  const nextMonthLabel = monthNames[0];

  let evaluation = "Sangat Akurat (MAPE < 10%)";
  if (mape >= 10 && mape < 20) evaluation = "Baik (10% - 20%)";
  else if (mape >= 20 && mape < 50) evaluation = "Layak (20% - 50%)";
  else if (mape >= 50) evaluation = "Kurang Akurat (MAPE > 50%)";

  return {
    rows,
    nextForecast,
    nextMonthLabel,
    horizonForecasts,
    mape,
    mad,
    mse,
    rmse,
    evaluation,
  };
}

// Algoritma 2: Single Exponential Smoothing (SES)
export function runSES(
  history: HistoricalDataPoint[],
  alpha: number,
  horizon = 1
): ForecastResult {
  const n = history.length;
  const rows: ForecastCalculationRow[] = [];
  let prevF = history[0].actual;

  for (let t = 0; t < n; t++) {
    const act = history[t].actual;
    const fc = t === 0 ? act : Number(prevF.toFixed(2));
    const err = Number((act - fc).toFixed(2));
    const absErr = Math.abs(err);
    const ape = act > 0 ? Number(((absErr / act) * 100).toFixed(2)) : 0;
    const sqErr = Number((err * err).toFixed(2));

    rows.push({
      month: history[t].month,
      actual: act,
      forecast: fc,
      error: err,
      absError: absErr,
      ape,
      sqError: sqErr,
    });

    prevF = alpha * act + (1 - alpha) * prevF;
  }

  const validRows = rows.slice(1);
  const totalApe = validRows.reduce((sum, r) => sum + r.ape, 0);
  const totalAbs = validRows.reduce((sum, r) => sum + r.absError, 0);
  const totalSq = validRows.reduce((sum, r) => sum + r.sqError, 0);
  const count = validRows.length || 1;

  const mape = Number((totalApe / count).toFixed(2));
  const mad = Number((totalAbs / count).toFixed(2));
  const mse = Number((totalSq / count).toFixed(2));
  const rmse = Number(Math.sqrt(mse).toFixed(2));

  const monthNames = ["Okt 2026", "Nov 2026", "Des 2026", "Jan 2027", "Feb 2027", "Mar 2027"];
  const finalVal = Math.max(0, Number(prevF.toFixed(1)));
  const horizonForecasts: { month: string; forecast: number }[] = [];
  for (let m = 1; m <= horizon; m++) {
    horizonForecasts.push({
      month: monthNames[m - 1] || `Bulan +${m}`,
      forecast: finalVal,
    });
  }

  let evaluation = "Sangat Akurat (MAPE < 10%)";
  if (mape >= 10 && mape < 20) evaluation = "Baik (10% - 20%)";
  else if (mape >= 20 && mape < 50) evaluation = "Layak (20% - 50%)";
  else if (mape >= 50) evaluation = "Kurang Akurat (MAPE > 50%)";

  return {
    rows,
    nextForecast: finalVal,
    nextMonthLabel: monthNames[0],
    horizonForecasts,
    mape,
    mad,
    mse,
    rmse,
    evaluation,
  };
}

// Algoritma 3: Simple Moving Average (SMA - 3 Bulan)
export function runSMA(
  history: HistoricalDataPoint[],
  period = 3,
  horizon = 1
): ForecastResult {
  const n = history.length;
  const rows: ForecastCalculationRow[] = [];

  for (let t = 0; t < n; t++) {
    const act = history[t].actual;
    let fc = act;
    if (t >= period) {
      const slice = history.slice(t - period, t);
      fc = Number((slice.reduce((s, p) => s + p.actual, 0) / period).toFixed(2));
    }

    const err = Number((act - fc).toFixed(2));
    const absErr = Math.abs(err);
    const ape = act > 0 ? Number(((absErr / act) * 100).toFixed(2)) : 0;
    const sqErr = Number((err * err).toFixed(2));

    rows.push({
      month: history[t].month,
      actual: act,
      forecast: fc,
      error: err,
      absError: absErr,
      ape,
      sqError: sqErr,
    });
  }

  const validRows = rows.slice(period);
  const totalApe = validRows.reduce((sum, r) => sum + r.ape, 0);
  const totalAbs = validRows.reduce((sum, r) => sum + r.absError, 0);
  const totalSq = validRows.reduce((sum, r) => sum + r.sqError, 0);
  const count = validRows.length || 1;

  const mape = Number((totalApe / count).toFixed(2));
  const mad = Number((totalAbs / count).toFixed(2));
  const mse = Number((totalSq / count).toFixed(2));
  const rmse = Number(Math.sqrt(mse).toFixed(2));

  const lastSlice = history.slice(n - period);
  const finalVal = Math.max(0, Number((lastSlice.reduce((s, p) => s + p.actual, 0) / period).toFixed(1)));
  const monthNames = ["Okt 2026", "Nov 2026", "Des 2026", "Jan 2027", "Feb 2027", "Mar 2027"];
  const horizonForecasts: { month: string; forecast: number }[] = [];
  for (let m = 1; m <= horizon; m++) {
    horizonForecasts.push({
      month: monthNames[m - 1] || `Bulan +${m}`,
      forecast: finalVal,
    });
  }

  let evaluation = "Sangat Akurat (MAPE < 10%)";
  if (mape >= 10 && mape < 20) evaluation = "Baik (10% - 20%)";
  else if (mape >= 20 && mape < 50) evaluation = "Layak (20% - 50%)";
  else if (mape >= 50) evaluation = "Kurang Akurat (MAPE > 50%)";

  return {
    rows,
    nextForecast: finalVal,
    nextMonthLabel: monthNames[0],
    horizonForecasts,
    mape,
    mad,
    mse,
    rmse,
    evaluation,
  };
}

// Fungsi Pencarian Parameter Optimal (Grid Search Parameter Model)
export function findBestHoltParameters(
  history: HistoricalDataPoint[]
): { bestAlpha: number; bestBeta: number; minMape: number } {
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let minMape = Infinity;

  for (let a = 0.1; a <= 0.9; a += 0.05) {
    for (let b = 0.05; b <= 0.5; b += 0.05) {
      const res = runHoltLinear(history, Number(a.toFixed(2)), Number(b.toFixed(2)));
      if (res.mape < minMape && res.mape > 0) {
        minMape = res.mape;
        bestAlpha = Number(a.toFixed(2));
        bestBeta = Number(b.toFixed(2));
      }
    }
  }

  return { bestAlpha, bestBeta, minMape: Number(minMape.toFixed(2)) };
}
