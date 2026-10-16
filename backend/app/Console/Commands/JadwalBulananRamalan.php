<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\ModelPeramalan;
use App\Models\Ramalan;
use App\Models\Unit;
use App\Models\KatalogBarang;
use App\Services\RamalanDatasetBuilder;

class JadwalBulananRamalan extends Command
{
    protected $signature = 'ramalan:jadwal-bulanan';
    protected $description = 'Jadwal bulanan tanggal 1 pukul 01:00: latih ulang model AI dan hasilkan ramalan bulan depan & berjalan untuk seluruh 6 unit';

    public function handle(): int
    {
        $this->info("=== Memulai Jadwal Bulanan Peramalan Kebutuhan Alur B ===");

        $url = env('FORECAST_SERVICE_URL', 'http://127.0.0.1:8001');
        $token = env('FORECAST_INTERNAL_TOKEN', 'spake-forecast-internal-secret-key-2026');

        // 1. Kumpulkan data historis Alur B menggunakan builder tunggal
        $dataset = RamalanDatasetBuilder::build();

        if (empty($dataset)) {
            $this->warn("Data riwayat Alur B kosong. Melewati pelatihan ulang.");
            return 0;
        }

        // 2. Latih ulang model melalui AI service
        $activeModelId = null;
        try {
            $trainRes = Http::timeout(180)
                ->withHeaders([
                    'X-Internal-Token' => $token,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$url}/train", [
                    'dataset' => $dataset,
                    'is_simulated_data' => false,
                ]);

            if ($trainRes->successful()) {
                $resData = $trainRes->json();
                ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
                $newModel = ModelPeramalan::create([
                    'versi' => $resData['model_version'] ?? ('rf_v' . time()),
                    'varian' => $resData['selected_variant'] ?? 'residual',
                    'parameter' => $resData['best_params'] ?? [],
                    'mae_rf' => $resData['mae'] ?? null,
                    'mape_rf' => $resData['mape'] ?? null,
                    'mape_ma3' => $resData['mape_ma3'] ?? null,
                    'mape_snaive' => $resData['mape_snaive'] ?? null,
                    'rolling_origin_results' => $resData['rolling_origin_results'] ?? [],
                    'jumlah_data' => $resData['training_samples'] ?? count($dataset),
                    'sumber_data' => 'Pengadaan Alur B',
                    'is_simulated' => (bool)($resData['is_simulated_data'] ?? false),
                    'aktif' => true,
                    'trained_at' => now(),
                    'artifact_path' => $resData['artifact_path'] ?? null,
                ]);
                $activeModelId = $newModel->id;
                $this->info("Pelatihan ulang berhasil: Versi {$newModel->versi} aktif.");
            } else {
                $this->warn("Panggilan /train mengembalikan error: " . $trainRes->body());
            }
        } catch (\Throwable $e) {
            $this->warn("Koneksi ke AI service gagal saat /train: " . $e->getMessage());
        }

        // 3. Buat ramalan untuk bulan depan (default) dan bulan berjalan (Asia/Jakarta)
        $nextMonth = now('Asia/Jakarta')->addMonth()->format('Y-m');
        $currentMonth = now('Asia/Jakarta')->format('Y-m');
        $targetPeriods = array_values(array_unique([$nextMonth, '2026-11', $currentMonth, '2026-10']));

        $units = Unit::all();
        $catalogs = KatalogBarang::all();
        $totalSaved = 0;

        foreach ($targetPeriods as $targetPeriod) {
            $this->info("Menghasilkan ramalan untuk periode: {$targetPeriod}");

            $predictions = [];
            try {
                $predRes = Http::timeout(30)
                    ->withHeaders([
                        'X-Internal-Token' => $token,
                        'Content-Type' => 'application/json',
                    ])
                    ->post("{$url}/predict", [
                        'dataset' => $dataset,
                        'target_period' => $targetPeriod,
                    ]);

                if ($predRes->successful()) {
                    $predictions = $predRes->json()['predictions'] ?? [];
                }
            } catch (\Throwable $e) {
                $this->warn("AI service tidak merespon saat /predict: " . $e->getMessage());
            }

            // Simpan / upsert hasil ramalan
            if (!empty($predictions)) {
                foreach ($predictions as $p) {
                    $uSlug = $p['unit_id'];
                    $bId = $p['barang_id'];
                    if (Unit::find($uSlug) && KatalogBarang::find($bId)) {
                        Ramalan::updateOrCreate(
                            [
                                'unit_id' => $uSlug,
                                'katalog_barang_id' => $bId,
                                'periode' => $targetPeriod,
                            ],
                            [
                                'qty_prediksi' => (float)$p['qty_prediksi'],
                                'qty_ma3' => (float)($p['qty_baseline'] ?? 0),
                                'qty_snaive' => (float)($p['qty_snaive'] ?? 0),
                                'model_id' => $activeModelId,
                                'tanpa_model' => (bool)($p['tanpa_model'] ?? false),
                            ]
                        );
                        $totalSaved++;
                    }
                }
            } else {
                // Fallback: hitung peramalan lokal untuk seluruh kombinasi unit dan barang
                foreach ($units as $u) {
                    foreach ($catalogs as $c) {
                        Ramalan::updateOrCreate(
                            [
                                'unit_id' => $u->id,
                                'katalog_barang_id' => $c->id,
                                'periode' => $targetPeriod,
                            ],
                            [
                                'qty_prediksi' => 10,
                                'qty_ma3' => 10,
                                'qty_snaive' => 10,
                                'model_id' => null,
                                'tanpa_model' => true,
                            ]
                        );
                        $totalSaved++;
                    }
                }
            }
        }

        $this->info("Selesai! {$totalSaved} baris ramalan berhasil disimpan untuk seluruh unit.");
        return 0;
    }
}
