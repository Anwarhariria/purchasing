<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\KatalogBarang;
use App\Models\ModelPeramalan;
use App\Models\Ramalan;
use App\Models\Unit;

class ForecastingController extends Controller
{
    protected function getForecastServiceUrl(): string
    {
        return config('services.forecast.url', 'http://127.0.0.1:8001');
    }

    protected function getForecastToken(): string
    {
        return config('services.forecast.token', 'spake-forecast-internal-secret-key-2026');
    }



    /**
     * Daftar 6 unit kerja resmi kampus sesuai SRS
     */
    protected function getOfficialUnits(): array
    {
        $dbUnits = Unit::orderBy('id')->get();
        if ($dbUnits->isNotEmpty()) {
            return $dbUnits->map(function ($u) {
                return [
                    'id' => $u->kode ?: (string)$u->id,
                    'unit_id' => $u->id,
                    'name' => $u->nama,
                    'category' => 'Unit Kerja',
                ];
            })->toArray();
        }

        return [
            ['id' => 'PMB', 'unit_id' => 'PMB', 'name' => 'Penerimaan Mahasiswa Baru', 'category' => 'Unit Kerja'],
            ['id' => 'PERPUS', 'unit_id' => 'PERPUS', 'name' => 'Perpustakaan', 'category' => 'Unit Kerja'],
            ['id' => 'SEKR-S1', 'unit_id' => 'SEKR-S1', 'name' => 'Sekretariat S1 Terapan Perhotelan', 'category' => 'Unit Kerja'],
            ['id' => 'SEKR-S2', 'unit_id' => 'SEKR-S2', 'name' => 'Sekretariat S2 Terapan Pariwisata', 'category' => 'Unit Kerja'],
            ['id' => 'SEKR-D3', 'unit_id' => 'SEKR-D3', 'name' => 'Sekretariat D3 Perhotelan', 'category' => 'Unit Kerja'],
            ['id' => 'LSP', 'unit_id' => 'LSP', 'name' => 'Lembaga Sertifikasi Profesi', 'category' => 'Unit Kerja'],
        ];
    }

    /**
     * GET /api/forecasting/model-info
     * Membaca metadata dari tabel model_peramalan yang aktif di DB.
     * Hanya Super Admin dan Keuangan Umum yang berhak mengakses.
     */
    public function modelInfo(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isSuperAdmin() && !$user->isKeuanganUmum())) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin dan Keuangan Umum yang berhak mengakses informasi model peramalan.',
            ], 403);
        }

        // 1. Coba baca dari tabel model_peramalan yang aktif di DB
        $active = ModelPeramalan::getActiveModel();

        if ($active) {
            $versionNum = (int)filter_var($active->versi, FILTER_SANITIZE_NUMBER_INT) ?: 1;
            $dataPayload = [
                'version' => $versionNum,
                'model_version' => $active->versi,
                'selected_variant' => $active->varian,
                'trained_at' => $active->trained_at ? $active->trained_at->toIso8601String() : null,
                'best_params' => $active->parameter ?? [],
                'mae' => $active->mae_rf,
                'mape' => $active->mape_rf,
                'mape_ma3' => $active->mape_ma3,
                'mape_snaive' => $active->mape_snaive,
                'rolling_windows' => $active->rolling_origin_results ?? [],
                'rolling_origin_results' => $active->rolling_origin_results ?? [],
                'rolling_summary' => [
                    'avg_mape_rf' => $active->mape_rf,
                    'avg_mape_ma3' => $active->mape_ma3,
                    'avg_mape_snaive' => $active->mape_snaive,
                ],
                'training_samples' => $active->jumlah_data,
                'total_records' => $active->jumlah_data,
                'is_simulated_data' => (bool)$active->is_simulated,
                'model_lebih_baik_dari_baseline' => ($active->mape_rf !== null && $active->mape_ma3 !== null && $active->mape_snaive !== null)
                    ? ($active->mape_rf <= min($active->mape_ma3, $active->mape_snaive))
                    : true,
                'artifact_path' => $active->artifact_path,
                'aktif' => (bool)$active->aktif,
                'db_id' => $active->id,
            ];

            return response()->json(array_merge([
                'status' => 'success',
                'data' => $dataPayload,
            ], $dataPayload));
        }

        // 2. Fallback: jika DB belum punya record aktif, coba tanya ke FastAPI service
        try {
            $url = $this->getForecastServiceUrl();
            $token = $this->getForecastToken();

            $response = Http::timeout(5)
                ->withHeaders(['X-Internal-Token' => $token])
                ->get("{$url}/model-info");

            if ($response->successful()) {
                $info = $response->json();
                // Simpan ke DB agar selanjutnya terbaca lokal
                ModelPeramalan::updateOrCreate(
                    ['versi' => $info['model_version'] ?? ('rf_v' . ($info['version'] ?? 1))],
                    [
                        'varian' => $info['selected_variant'] ?? 'residual',
                        'parameter' => $info['best_params'] ?? [],
                        'mae_rf' => $info['rolling_summary']['avg_mae_rf'] ?? null,
                        'mape_rf' => $info['rolling_summary']['avg_mape_rf'] ?? null,
                        'mape_ma3' => $info['rolling_summary']['avg_mape_ma3'] ?? null,
                        'mape_snaive' => $info['rolling_summary']['avg_mape_snaive'] ?? null,
                        'rolling_origin_results' => $info['rolling_windows'] ?? [],
                        'jumlah_data' => $info['total_records'] ?? 0,
                        'sumber_data' => 'Pengadaan Alur B',
                        'is_simulated' => (bool)($info['is_simulated_data'] ?? false),
                        'aktif' => true,
                        'trained_at' => $info['trained_at'] ?? now(),
                        'artifact_path' => null,
                    ]
                );
                return response()->json($info);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Layanan AI Peramalan belum siap atau model belum dilatih.',
                'detail' => $response->body(),
            ], 503);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal terhubung ke layanan AI Peramalan (FastAPI port 8001).',
                'error' => $e->getMessage(),
            ], 503);
        }
    }

    /**
     * GET /api/forecasting/models
     * Daftar seluruh versi model peramalan yang tersimpan di DB.
     */
    public function listModels(Request $request)
    {
        $user = $request->user();
        if (!$user || (!$user->isSuperAdmin() && !$user->isKeuanganUmum())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $models = ModelPeramalan::orderByDesc('id')->get();
        return response()->json([
            'status' => 'success',
            'data' => $models,
        ]);
    }

    /**
     * POST /api/forecasting/activate-model/{id}
     * Super Admin memilih versi model peramalan yang aktif.
     */
    public function activateModel(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin yang berhak mengaktifkan versi model peramalan.',
            ], 403);
        }

        $model = ModelPeramalan::find($id);
        if (!$model) {
            return response()->json([
                'status' => 'error',
                'message' => 'Versi model peramalan tidak ditemukan.',
            ], 404);
        }

        ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
        $model->update(['aktif' => true]);

        return response()->json([
            'status' => 'success',
            'message' => "Versi model {$model->versi} berhasil diaktifkan.",
            'data' => $model,
        ]);
    }

    /**
     * Hitung peramalan lokal (Seasonal Naive atau MA3) saat FastAPI service tidak tersedia.
     */
    protected function calculateLocalFallback(
        array $dataset,
        string $targetPeriod,
        ?string $unitFilter,
        $officialUnitsMap,
        $katalogMap
    ): array {
        $grouped = [];
        foreach ($dataset as $row) {
            $uSlug = $row['unit_id'];
            $uRaw = $row['unit_id'];
            $bId = $row['barang_id'];
            $key = "{$uSlug}___{$bId}";
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'unit_id' => $uSlug,
                    'unit_name' => $uRaw,
                    'barang_id' => $bId,
                    'history' => [],
                ];
            }
            $p = $row['periode'];
            $grouped[$key]['history'][$p] = ($grouped[$key]['history'][$p] ?? 0) + (float)$row['qty'];
        }

        // Tentukan periode 12 bulan lalu untuk Seasonal Naive
        $parts = explode('-', $targetPeriod);
        $yr = (int)$parts[0];
        $mo = (int)$parts[1];
        $lag12Period = sprintf('%04d-%02d', $yr - 1, $mo);

        $enriched = [];
        $totalBiaya = 0;
        $totalQtyPrediksi = 0;

        foreach ($grouped as $data) {
            $uSlug = $data['unit_id'];
            $uRaw = $data['unit_name'];
            if ($unitFilter && $unitFilter !== 'ALL' && $uSlug !== $unitFilter && $uRaw !== $unitFilter) {
                continue;
            }

            $bId = $data['barang_id'];
            $itemInfo = $katalogMap->get($bId);
            $unitInfo = $officialUnitsMap->get($uSlug);

            $namaBarang = $itemInfo ? ($itemInfo->nama ?? $itemInfo->nama_barang ?? "Barang {$bId}") : "Barang {$bId}";
            $satuan = $itemInfo ? $itemInfo->satuan : 'unit';
            $kategori = $itemInfo ? $itemInfo->kategori : 'Kebutuhan Umum';
            $hargaSatuan = $itemInfo ? (float)($itemInfo->harga_acuan ?? $itemInfo->harga_satuan ?? 0.0) : 0.0;

            $history = $data['history'];
            $periodsBefore = array_filter(array_keys($history), fn($p) => $p < $targetPeriod);
            sort($periodsBefore);

            // 1. Seasonal Naive: nilai bulan yang sama tahun lalu
            $snaive = isset($history[$lag12Period]) ? (float)$history[$lag12Period] : null;

            // 2. MA3: rata-rata 3 bulan terakhir sebelum target
            $last3 = array_slice($periodsBefore, -3);
            $ma3 = 0.0;
            if (!empty($last3)) {
                $sum = 0;
                foreach ($last3 as $p) {
                    $sum += (float)($history[$p] ?? 0);
                }
                $ma3 = $sum / count($last3);
            }

            // Fallback: Seasonal Naive jika lag_12 ada, jika belum ada pakai MA3
            $predVal = ($snaive !== null) ? $snaive : $ma3;
            $qtyPred = (int)round($predVal);
            $subtotal = $qtyPred * $hargaSatuan;

            $totalQtyPrediksi += $qtyPred;
            $totalBiaya += $subtotal;

            $enriched[] = [
                'unit_id' => $uSlug,
                'unit_name' => $unitInfo ? $unitInfo['name'] : $uRaw,
                'barang_id' => $bId,
                'barang_name' => $namaBarang,
                'kategori' => $kategori,
                'satuan' => $satuan,
                'harga_satuan' => $hargaSatuan,
                'qty_prediksi' => $qtyPred,
                'qty_snaive' => (int)round($snaive ?? 0),
                'qty_baseline' => (int)round($ma3),
                'tanpa_model' => true,
                'estimasi_biaya' => $subtotal,
            ];
        }

        return [
            'enriched' => $enriched,
            'total_qty' => $totalQtyPrediksi,
            'total_biaya' => $totalBiaya,
        ];
    }

    /**
     * POST /api/forecasting/predict-alur-b
     * Keuangan Umum (semua unit), Koordinator Unit & Staf Unit (unit_id DIPAKSA = unit user, input unit_id lain -> 403); peran lain 403.
     */
    public function predictAlurB(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }

        $targetPeriod = $request->input('target_period');

        // Validasi format target_period jika diberikan
        if ($targetPeriod) {
            if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $targetPeriod)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Format target_period tidak valid. Gunakan format YYYY-MM.',
                ], 422);
            }
        }

        $unitFilter = null;

        $isKeuanganUmumOrAdmin = $user->isSuperAdmin() || $user->isKeuanganUmum();
        $userUnitSlug = $user->getUnitSlugAlurB();

        if ($isKeuanganUmumOrAdmin) {
            $unitFilter = $request->input('unit_id');
        } elseif ($userUnitSlug && ($user->isStafUnit() || $user->isKoordinatorUnit())) {
            $requestedUnit = $request->input('unit_id');
            if ($requestedUnit && $requestedUnit !== 'ALL' && $requestedUnit !== $userUnitSlug) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Akses ditolak. Anda hanya berhak mengakses peramalan untuk unit Anda ({$userUnitSlug}).",
                ], 403);
            }
            $unitFilter = $userUnitSlug;
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Peran Anda tidak memiliki hak akses ke peramalan kebutuhan Alur B.',
            ], 403);
        }

        // 1. Ekstrak riwayat Alur B dari database (gabungan simulasi + riil) menggunakan builder tunggal
        $officialUnitsMap = collect($this->getOfficialUnits())->keyBy('id');
        $dataset = \App\Services\RamalanDatasetBuilder::build();
        $latestPeriodInDb = \App\Services\RamalanDatasetBuilder::getLatestPeriod($dataset, '2026-09');

        // Validasi batasan target_period maksimal 3 bulan ke depan dari periode terakhir
        if ($targetPeriod) {
            $latestParts = explode('-', $latestPeriodInDb);
            $latestMonths = (int)$latestParts[0] * 12 + (int)$latestParts[1];

            $targetParts = explode('-', $targetPeriod);
            $targetMonths = (int)$targetParts[0] * 12 + (int)$targetParts[1];

            if ($targetMonths - $latestMonths > 3) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Target periode peramalan maksimal 3 bulan ke depan.',
                ], 422);
            }
        } else {
            // Tentukan target_period default bila tidak diberikan (bulan depan atau 1 bulan setelah riwayat terakhir)
            $defaultNextMonth = now('Asia/Jakarta')->addMonth()->format('Y-m');
            $parts = explode('-', $latestPeriodInDb);
            $yr = (int)$parts[0];
            $mo = (int)$parts[1];
            $mo += 1;
            if ($mo > 12) {
                $yr += 1;
                $mo = 1;
            }
            $targetPeriod = sprintf('%04d-%02d', $yr, $mo);
            if ($targetPeriod < $defaultNextMonth) {
                $targetPeriod = $defaultNextMonth;
            }
        }

        $katalogMap = KatalogBarang::all()->keyBy('id');
        $activeModel = ModelPeramalan::getActiveModel();
        $activeModelId = $activeModel ? $activeModel->id : null;

        // 2. Cek Cache DB di tabel `ramalan`: bila data untuk target_period & unit sudah ada untuk model aktif, kembalikan langsung
        $isForceRefresh = $request->boolean('refresh') || $request->boolean('force');

        if (!$isForceRefresh && $activeModelId) {
            $ramalanQuery = Ramalan::where('model_id', $activeModelId)
                ->where('periode', $targetPeriod);

            if ($unitFilter && $unitFilter !== 'ALL') {
                $ramalanQuery->where('unit_id', $unitFilter);
            }

            $cachedRamalan = $ramalanQuery->get();

            if ($cachedRamalan->isNotEmpty()) {
                $cachedEnriched = [];
                $cachedTotalBiaya = 0;
                $cachedTotalQty = 0;

                foreach ($cachedRamalan as $row) {
                    $uSlug = $row->unit_id;
                    $bId = $row->katalog_barang_id;
                    $itemInfo = $katalogMap->get($bId);
                    $unitInfo = $officialUnitsMap->get($uSlug);

                    $namaBarang = $itemInfo ? ($itemInfo->nama ?? $itemInfo->nama_barang ?? "Barang {$bId}") : "Barang {$bId}";
                    $satuan = $itemInfo ? $itemInfo->satuan : 'unit';
                    $kategori = $itemInfo ? $itemInfo->kategori : 'Kebutuhan Umum';
                    $hargaSatuan = $itemInfo ? (float)($itemInfo->harga_acuan ?? $itemInfo->harga_satuan ?? 0.0) : 0.0;

                    $qtyPred = (int)$row->qty_prediksi;
                    $subtotal = $qtyPred * $hargaSatuan;

                    $cachedTotalQty += $qtyPred;
                    $cachedTotalBiaya += $subtotal;

                    $cachedEnriched[] = [
                        'unit_id' => $uSlug,
                        'unit_name' => $unitInfo ? $unitInfo['name'] : $uSlug,
                        'barang_id' => $bId,
                        'barang_name' => $namaBarang,
                        'kategori' => $kategori,
                        'satuan' => $satuan,
                        'harga_satuan' => $hargaSatuan,
                        'qty_prediksi' => $qtyPred,
                        'qty_snaive' => (int)($row->qty_snaive ?? 0),
                        'qty_baseline' => (int)($row->qty_ma3 ?? 0),
                        'tanpa_model' => (bool)$row->tanpa_model,
                        'estimasi_biaya' => $subtotal,
                    ];
                }

                return response()->json([
                    'status' => 'success',
                    'model_tidak_tersedia' => false,
                    'cached' => true,
                    'message' => null,
                    'target_period' => $targetPeriod,
                    'available_units' => $this->getOfficialUnits(),
                    'summary' => [
                        'total_items' => count($cachedEnriched),
                        'total_qty_prediksi' => $cachedTotalQty,
                        'total_estimasi_biaya' => $cachedTotalBiaya,
                    ],
                    'predictions' => $cachedEnriched,
                ]);
            }
        }

        // 3. Hubungi FastAPI Forecast Service dengan fallback otomatis
        $isFallback = false;
        $enriched = [];
        $totalBiaya = 0;
        $totalQtyPrediksi = 0;

        try {
            $url = $this->getForecastServiceUrl();
            $token = $this->getForecastToken();

            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Internal-Token' => $token,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$url}/predict", [
                    'dataset' => $dataset,
                    'target_period' => $targetPeriod,
                ]);

            if ($response->successful()) {
                $rawPredictions = $response->json()['predictions'] ?? [];

                foreach ($rawPredictions as $pred) {
                    $uSlug = $pred['unit_id'];
                    $uRaw = $pred['unit_id'];

                    if ($unitFilter && $unitFilter !== 'ALL' && $uSlug !== $unitFilter) {
                        continue;
                    }

                    $bId = $pred['barang_id'];
                    $itemInfo = $katalogMap->get($bId);
                    $unitInfo = $officialUnitsMap->get($uSlug);

                    $namaBarang = $itemInfo ? ($itemInfo->nama ?? $itemInfo->nama_barang ?? "Barang {$bId}") : "Barang {$bId}";
                    $satuan = $itemInfo ? $itemInfo->satuan : 'unit';
                    $kategori = $itemInfo ? $itemInfo->kategori : 'Kebutuhan Umum';
                    $hargaSatuan = $itemInfo ? (float)($itemInfo->harga_acuan ?? $itemInfo->harga_satuan ?? 0.0) : 0.0;

                    $qtyPred = (int)$pred['qty_prediksi'];
                    $subtotal = $qtyPred * $hargaSatuan;

                    $totalQtyPrediksi += $qtyPred;
                    $totalBiaya += $subtotal;

                    $enriched[] = [
                        'unit_id' => $uSlug,
                        'unit_name' => $unitInfo ? $unitInfo['name'] : $uRaw,
                        'barang_id' => $bId,
                        'barang_name' => $namaBarang,
                        'kategori' => $kategori,
                        'satuan' => $satuan,
                        'harga_satuan' => $hargaSatuan,
                        'qty_prediksi' => $qtyPred,
                        'qty_snaive' => (int)($pred['qty_snaive'] ?? 0),
                        'qty_baseline' => (int)$pred['qty_baseline'],
                        'tanpa_model' => (bool)$pred['tanpa_model'],
                        'estimasi_biaya' => $subtotal,
                    ];
                }
            } elseif ($response->status() === 422) {
                // Jangan fallback bila input ditolak oleh layanan AI
                $err = $response->json();
                return response()->json([
                    'status' => 'error',
                    'message' => $err['detail'] ?? $err['message'] ?? 'Input peramalan ditolak oleh layanan model.',
                ], 422);
            } else {
                $isFallback = true;
            }
        } catch (\Throwable $e) {
            $isFallback = true;
        }

        // Jalankan kalkulasi fallback jika service AI down / error
        if ($isFallback) {
            $fbResult = $this->calculateLocalFallback($dataset, $targetPeriod, $unitFilter, $officialUnitsMap, $katalogMap);
            $enriched = $fbResult['enriched'];
            $totalQtyPrediksi = $fbResult['total_qty'];
            $totalBiaya = $fbResult['total_biaya'];
        }

        // 3. Simpan / perbarui hasil ke tabel ramalan
        foreach ($enriched as $item) {
            $uId = $item['unit_id'];
            $bId = $item['barang_id'];
            if (Unit::find($uId) && KatalogBarang::find($bId)) {
                Ramalan::updateOrCreate(
                    [
                        'unit_id' => $uId,
                        'katalog_barang_id' => $bId,
                        'periode' => $targetPeriod,
                    ],
                    [
                        'qty_prediksi' => $item['qty_prediksi'],
                        'qty_ma3' => $item['qty_baseline'],
                        'qty_snaive' => $item['qty_snaive'],
                        'model_id' => $isFallback ? null : $activeModelId,
                        'tanpa_model' => (bool)$item['tanpa_model'],
                    ]
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'model_tidak_tersedia' => $isFallback,
            'message' => $isFallback
                ? 'Layanan AI Peramalan saat ini tidak tersedia. Rekomendasi dihitung menggunakan metode fallback Seasonal Naive / Moving Average 3 Bulan.'
                : null,
            'target_period' => $targetPeriod,
            'available_units' => $this->getOfficialUnits(),
            'summary' => [
                'total_items' => count($enriched),
                'total_qty_prediksi' => $totalQtyPrediksi,
                'total_estimasi_biaya' => $totalBiaya,
            ],
            'predictions' => $enriched,
        ]);
    }

    /**
     * POST /api/forecasting/train-alur-b
     * Hanya Super Admin yang berhak memicu pelatihan ulang model AI Alur B.
     */
    public function trainAlurB(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin yang berhak memicu pelatihan ulang model peramalan.',
            ], 403);
        }

        $officialUnitsMap = collect($this->getOfficialUnits())->keyBy('id');
        $dataset = \App\Services\RamalanDatasetBuilder::build();

        if (empty($dataset)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data riwayat pengadaan Alur B kosong di database.',
            ], 422);
        }

        try {
            $url = $this->getForecastServiceUrl();
            $token = $this->getForecastToken();

            $response = Http::timeout(180)
                ->withHeaders([
                    'X-Internal-Token' => $token,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$url}/train", [
                    'dataset' => $dataset,
                    'is_simulated_data' => true,
                ]);

            if ($response->successful()) {
                $resData = $response->json();
                $metrics = $resData['data'] ?? $resData;

                // Nonaktifkan versi sebelumnya, simpan versi baru ke tabel model_peramalan
                ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
                $modelRecord = ModelPeramalan::create([
                    'versi' => $metrics['model_version'] ?? (isset($metrics['version']) ? ('rf_v' . $metrics['version']) : ($resData['model_version'] ?? ('rf_v' . time()))),
                    'varian' => $metrics['selected_variant'] ?? 'residual',
                    'parameter' => $metrics['best_params'] ?? [],
                    'mae_rf' => $metrics['mae'] ?? ($metrics['mae_rf'] ?? null),
                    'mape_rf' => $metrics['mape'] ?? ($metrics['mape_rf'] ?? null),
                    'mape_ma3' => $metrics['mape_ma3'] ?? null,
                    'mape_snaive' => $metrics['mape_snaive'] ?? null,
                    'rolling_origin_results' => $metrics['rolling_origin_results'] ?? ($metrics['rolling_windows'] ?? []),
                    'jumlah_data' => $metrics['training_samples'] ?? ($metrics['total_records'] ?? count($dataset)),
                    'sumber_data' => 'Pengadaan Alur B',
                    'is_simulated' => (bool)($metrics['is_simulated_data'] ?? true),
                    'aktif' => true,
                    'trained_at' => $metrics['trained_at'] ?? now(),
                    'artifact_path' => $metrics['artifact_path'] ?? ("models/rf_v" . ($metrics['version'] ?? 1) . ".json"),
                ]);

                // Auto-generate ramalan untuk seluruh unit ke tabel ramalan (default bulan depan & bulan berjalan)
                $nextMonth = now('Asia/Jakarta')->addMonth()->format('Y-m');
                $currentMonth = now('Asia/Jakarta')->format('Y-m');
                $targetPeriods = array_values(array_unique([$nextMonth, '2026-11', $currentMonth, '2026-10']));
                foreach ($targetPeriods as $tPeriod) {
                    try {
                        $predRes = Http::timeout(30)
                            ->withHeaders([
                                'X-Internal-Token' => $token,
                                'Content-Type' => 'application/json',
                            ])
                            ->post("{$url}/predict", [
                                'dataset' => $dataset,
                                'target_period' => $tPeriod,
                            ]);

                        if ($predRes->successful()) {
                            $preds = $predRes->json()['predictions'] ?? [];
                            foreach ($preds as $p) {
                                $uId = $p['unit_id'];
                                $bId = $p['barang_id'];
                                if (Unit::find($uId) && KatalogBarang::find($bId)) {
                                    Ramalan::updateOrCreate(
                                        [
                                            'unit_id' => $uId,
                                            'katalog_barang_id' => $bId,
                                            'periode' => $tPeriod,
                                        ],
                                        [
                                            'qty_prediksi' => (float)$p['qty_prediksi'],
                                            'qty_ma3' => (float)($p['qty_baseline'] ?? 0),
                                            'qty_snaive' => (float)($p['qty_snaive'] ?? 0),
                                            'model_id' => $modelRecord->id,
                                            'tanpa_model' => (bool)($p['tanpa_model'] ?? false),
                                        ]
                                    );
                                }
                            }
                        }
                    } catch (\Throwable $ignored) {
                    }
                }

                $resData['db_model_id'] = $modelRecord->id;
                return response()->json($resData);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Pelatihan model gagal diproses oleh AI service.',
                'detail' => $response->json() ?? $response->body(),
            ], 422);

        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Koneksi ke AI service terputus.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
