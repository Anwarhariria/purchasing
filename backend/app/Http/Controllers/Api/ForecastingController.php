<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ForecastingController extends Controller
{
    protected function getDataset()
    {
        return [
            [
                'id' => 'ING-01',
                'name' => 'Daging Tenderloin Meltique/Wagyu',
                'unit' => 'kg',
                'category' => 'Bahan Segar / Basah (Perishable)',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 12],
                    ['month' => 'Nov 2025', 'actual' => 15],
                    ['month' => 'Des 2025', 'actual' => 18],
                    ['month' => 'Jan 2026', 'actual' => 8],
                    ['month' => 'Feb 2026', 'actual' => 14],
                    ['month' => 'Mar 2026', 'actual' => 20],
                    ['month' => 'Apr 2026', 'actual' => 22],
                    ['month' => 'Mei 2026', 'actual' => 25],
                    ['month' => 'Jun 2026', 'actual' => 19],
                    ['month' => 'Jul 2026', 'actual' => 10],
                    ['month' => 'Agu 2026', 'actual' => 16],
                    ['month' => 'Sep 2026', 'actual' => 24],
                ],
            ],
            [
                'id' => 'ING-02',
                'name' => 'Butter Elle & Vire',
                'unit' => 'kg',
                'category' => 'Bahan Segar / Basah (Perishable)',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 8],
                    ['month' => 'Nov 2025', 'actual' => 10],
                    ['month' => 'Des 2025', 'actual' => 12],
                    ['month' => 'Jan 2026', 'actual' => 5],
                    ['month' => 'Feb 2026', 'actual' => 9],
                    ['month' => 'Mar 2026', 'actual' => 14],
                    ['month' => 'Apr 2026', 'actual' => 16],
                    ['month' => 'Mei 2026', 'actual' => 18],
                    ['month' => 'Jun 2026', 'actual' => 13],
                    ['month' => 'Jul 2026', 'actual' => 7],
                    ['month' => 'Agu 2026', 'actual' => 11],
                    ['month' => 'Sep 2026', 'actual' => 17],
                ],
            ],
            [
                'id' => 'ING-03',
                'name' => 'Cooking Cream',
                'unit' => 'liter',
                'category' => 'Bahan Segar / Basah (Perishable)',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 10],
                    ['month' => 'Nov 2025', 'actual' => 12],
                    ['month' => 'Des 2025', 'actual' => 15],
                    ['month' => 'Jan 2026', 'actual' => 6],
                    ['month' => 'Feb 2026', 'actual' => 11],
                    ['month' => 'Mar 2026', 'actual' => 16],
                    ['month' => 'Apr 2026', 'actual' => 18],
                    ['month' => 'Mei 2026', 'actual' => 20],
                    ['month' => 'Jun 2026', 'actual' => 15],
                    ['month' => 'Jul 2026', 'actual' => 8],
                    ['month' => 'Agu 2026', 'actual' => 13],
                    ['month' => 'Sep 2026', 'actual' => 19],
                ],
            ],
            [
                'id' => 'ING-04',
                'name' => 'Beras Putih Premium',
                'unit' => 'kg',
                'category' => 'Bahan Kering / Tahan Lama',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 30],
                    ['month' => 'Nov 2025', 'actual' => 35],
                    ['month' => 'Des 2025', 'actual' => 40],
                    ['month' => 'Jan 2026', 'actual' => 15],
                    ['month' => 'Feb 2026', 'actual' => 32],
                    ['month' => 'Mar 2026', 'actual' => 45],
                    ['month' => 'Apr 2026', 'actual' => 48],
                    ['month' => 'Mei 2026', 'actual' => 52],
                    ['month' => 'Jun 2026', 'actual' => 38],
                    ['month' => 'Jul 2026', 'actual' => 20],
                    ['month' => 'Agu 2026', 'actual' => 35],
                    ['month' => 'Sep 2026', 'actual' => 50],
                ],
            ],
            [
                'id' => 'ING-05',
                'name' => 'Tepung Terigu Protein Tinggi (Cakra)',
                'unit' => 'kg',
                'category' => 'Bahan Kering / Tahan Lama',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 25],
                    ['month' => 'Nov 2025', 'actual' => 28],
                    ['month' => 'Des 2025', 'actual' => 32],
                    ['month' => 'Jan 2026', 'actual' => 12],
                    ['month' => 'Feb 2026', 'actual' => 26],
                    ['month' => 'Mar 2026', 'actual' => 36],
                    ['month' => 'Apr 2026', 'actual' => 40],
                    ['month' => 'Mei 2026', 'actual' => 44],
                    ['month' => 'Jun 2026', 'actual' => 30],
                    ['month' => 'Jul 2026', 'actual' => 15],
                    ['month' => 'Agu 2026', 'actual' => 28],
                    ['month' => 'Sep 2026', 'actual' => 42],
                ],
            ],
            [
                'id' => 'ING-06',
                'name' => 'Telur Ayam Negeri',
                'unit' => 'butir',
                'category' => 'Bahan Segar / Basah (Perishable)',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 120],
                    ['month' => 'Nov 2025', 'actual' => 150],
                    ['month' => 'Des 2025', 'actual' => 180],
                    ['month' => 'Jan 2026', 'actual' => 60],
                    ['month' => 'Feb 2026', 'actual' => 130],
                    ['month' => 'Mar 2026', 'actual' => 190],
                    ['month' => 'Apr 2026', 'actual' => 210],
                    ['month' => 'Mei 2026', 'actual' => 240],
                    ['month' => 'Jun 2026', 'actual' => 160],
                    ['month' => 'Jul 2026', 'actual' => 80],
                    ['month' => 'Agu 2026', 'actual' => 140],
                    ['month' => 'Sep 2026', 'actual' => 220],
                ],
            ],
            [
                'id' => 'ING-07',
                'name' => 'Ayam Broiler Utuh',
                'unit' => 'ekor',
                'category' => 'Bahan Segar / Basah (Perishable)',
                'history' => [
                    ['month' => 'Okt 2025', 'actual' => 15],
                    ['month' => 'Nov 2025', 'actual' => 18],
                    ['month' => 'Des 2025', 'actual' => 22],
                    ['month' => 'Jan 2026', 'actual' => 8],
                    ['month' => 'Feb 2026', 'actual' => 16],
                    ['month' => 'Mar 2026', 'actual' => 24],
                    ['month' => 'Apr 2026', 'actual' => 26],
                    ['month' => 'Mei 2026', 'actual' => 30],
                    ['month' => 'Jun 2026', 'actual' => 20],
                    ['month' => 'Jul 2026', 'actual' => 10],
                    ['month' => 'Agu 2026', 'actual' => 18],
                    ['month' => 'Sep 2026', 'actual' => 28],
                ],
            ],
        ];
    }

    public function ingredients()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->getDataset(),
        ]);
    }

    public function calculate(Request $request)
    {
        $id = $request->input('ingredient_id', 'ING-01');
        $alpha = (float)$request->input('alpha', 0.3);
        $beta = (float)$request->input('beta', 0.2);
        $horizon = (int)$request->input('horizon', 1);

        $dataset = $this->getDataset();
        $selected = collect($dataset)->firstWhere('id', $id) ?? $dataset[0];
        $history = $selected['history'];
        $n = count($history);

        if ($n < 2) {
            return response()->json(['status' => 'error', 'message' => 'Data tidak cukup'], 400);
        }

        $l = $history[0]['actual'];
        $b = $history[1]['actual'] - $history[0]['actual'];
        $rows = [];

        for ($t = 0; $t < $n; $t++) {
            $act = $history[$t]['actual'];
            if ($t === 0) {
                $fc = $act;
            } else {
                $fc = round($l + $b, 2);
                $prevL = $l;
                $l = $alpha * $act + (1 - $alpha) * ($l + $b);
                $b = $beta * ($l - $prevL) + (1 - $beta) * $b;
            }

            $err = round($act - $fc, 2);
            $absErr = abs($err);
            $ape = $act > 0 ? round(($absErr / $act) * 100, 2) : 0;
            $sqErr = round($err * $err, 2);

            $rows[] = [
                'month' => $history[$t]['month'],
                'actual' => $act,
                'forecast' => $fc,
                'error' => $err,
                'absError' => $absErr,
                'ape' => $ape,
                'sqError' => $sqErr,
            ];
        }

        $validRows = array_slice($rows, 1);
        $count = count($validRows) ?: 1;
        $totalApe = array_sum(array_column($validRows, 'ape'));
        $totalAbs = array_sum(array_column($validRows, 'absError'));
        $totalSq = array_sum(array_column($validRows, 'sqError'));

        $mape = round($totalApe / $count, 2);
        $mad = round($totalAbs / $count, 2);
        $mse = round($totalSq / $count, 2);
        $rmse = round(sqrt($mse), 2);

        $monthNames = ['Okt 2026', 'Nov 2026', 'Des 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027'];
        $horizonForecasts = [];
        for ($m = 1; $m <= $horizon; $m++) {
            $predVal = max(0, round($l + $m * $b, 1));
            $horizonForecasts[] = [
                'month' => $monthNames[$m - 1] ?? "Bulan +{$m}",
                'forecast' => $predVal,
            ];
        }

        $evaluation = 'Sangat Akurat (MAPE < 10%)';
        if ($mape >= 10 && $mape < 20) $evaluation = 'Baik (10% - 20%)';
        elseif ($mape >= 20 && $mape < 50) $evaluation = 'Layak (20% - 50%)';
        elseif ($mape >= 50) $evaluation = 'Kurang Akurat (MAPE > 50%)';

        return response()->json([
            'status' => 'success',
            'data' => [
                'ingredient' => $selected,
                'rows' => $rows,
                'nextForecast' => $horizonForecasts[0]['forecast'] ?? 0,
                'nextMonthLabel' => $monthNames[0],
                'horizonForecasts' => $horizonForecasts,
                'mape' => $mape,
                'mad' => $mad,
                'mse' => $mse,
                'rmse' => $rmse,
                'evaluation' => $evaluation,
            ],
        ]);
    }
}
