<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\KatalogBarang;
use App\Models\ModelPeramalan;
use App\Models\Unit;
use App\Models\StatusLog;
use App\Enums\StatusPengajuan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SeedSimulasiRamalan extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ramalan:seed-simulasi 
                            {--months=24 : Jumlah bulan riwayat pengadaan Alur B (default 24)}
                            {--train : Jalankan pelatihan model AI di forecast-service setelah seeding}
                            {--hapus : Hapus seluruh data pengajuan bersumber simulasi}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Menghasilkan 24 bulan data simulasi pengadaan Alur B (7 unit, 12 katalog barang) dengan sumber=simulasi dan pola realistis, atau menghapus data simulasi.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // 0. Penanganan opsi --hapus
        if ($this->option('hapus')) {
            $simReqs = ProcurementRequest::where('sumber', 'simulasi')
                ->orWhere('id', 'like', 'PR-SIM-%')
                ->get();

            $countReq = $simReqs->count();
            $ids = $simReqs->pluck('id');
            $countDetails = RequestDetail::whereIn('request_id', $ids)->count();

            RequestDetail::whereIn('request_id', $ids)->delete();
            StatusLog::whereIn('pengajuan_id', $ids)->delete();
            ProcurementRequest::whereIn('id', $ids)->delete();

            $this->info("Berhasil menghapus {$countReq} pengajuan simulasi dan {$countDetails} baris detail.");
            return 0;
        }

        $monthsCount = (int) $this->option('months');
        if ($monthsCount < 6) {
            $this->error('Jumlah bulan minimal 6 untuk melatih model.');
            return 1;
        }

        $this->info("Memulai pembuatan data simulasi {$monthsCount} bulan Alur B (sumber=simulasi)...");

        // 1. Definisikan 6 Unit Kerja Kampus SRS
        $dbUnits = Unit::all()->keyBy('id');

        $units = [
            [
                'slug' => 'PMB',
                'name' => $dbUnits->get('PMB')?->nama ?? 'Penerimaan Mahasiswa Baru',
                'applicant' => 'Rizky Ananda (Staf PMB)',
                'scale' => 1.4,
                'type' => 'pmb',
            ],
            [
                'slug' => 'PERPUS',
                'name' => $dbUnits->get('PERPUS')?->nama ?? 'Perpustakaan',
                'applicant' => 'Fajar Nugraha (Staf Perpustakaan)',
                'scale' => 1.1,
                'type' => 'perpus',
            ],
            [
                'slug' => 'SEKR-S1',
                'name' => $dbUnits->get('SEKR-S1')?->nama ?? 'Sekretariat S1 Terapan Perhotelan',
                'applicant' => 'Rini Astuti (Staf Sekretariat S1)',
                'scale' => 1.0,
                'type' => 'akademik',
            ],
            [
                'slug' => 'SEKR-S2',
                'name' => $dbUnits->get('SEKR-S2')?->nama ?? 'Sekretariat S2 Terapan Pariwisata',
                'applicant' => 'Irfan Hakim (Staf Sekretariat S2)',
                'scale' => 0.85,
                'type' => 'akademik',
            ],
            [
                'slug' => 'SEKR-D3',
                'name' => $dbUnits->get('SEKR-D3')?->nama ?? 'Sekretariat D3 Perhotelan',
                'applicant' => 'Siti Rahma (Staf Sekretariat D3)',
                'scale' => 1.0,
                'type' => 'akademik',
            ],
            [
                'slug' => 'LSP',
                'name' => $dbUnits->get('LSP')?->nama ?? 'Lembaga Sertifikasi Profesi',
                'applicant' => 'Teguh Wibowo (Staf LSP)',
                'scale' => 1.1,
                'type' => 'lsp',
            ],
        ];

        // 2. Ambil 12 Katalog Barang Alur B
        $katalogItems = KatalogBarang::where('aktif', true)->orderBy('id')->get();
        if ($katalogItems->isEmpty()) {
            $this->warn('Tabel katalog_barang kosong. Silakan jalankan db:seed terlebih dahulu.');
            return 1;
        }

        // Base demand per item katalog
        $baseDemands = [
            'KAT-001' => 10.0, // Kertas HVS A4
            'KAT-002' => 8.0,  // Kertas HVS F4
            'KAT-003' => 3.0,  // Tinta Canon
            'KAT-004' => 3.0,  // Tinta Epson
            'KAT-005' => 2.0,  // Toner HP 85A
            'KAT-006' => 8.0,  // Map Snelhechter
            'KAT-007' => 6.0,  // Pulpen Gel
            'KAT-008' => 6.0,  // Spidol Whiteboard
            'KAT-009' => 2.0,  // Stapler Max HD-10
            'KAT-010' => 6.0,  // Sabun Dettol
            'KAT-011' => 8.0,  // Tisu Paseo
            'KAT-012' => 6.0,  // Lakban Daimaru
        ];

        // 3. Susun daftar periode bulanan (berakhir di 2026-10)
        // Jika 24 bulan: 2024-11 s/d 2026-10
        $endYear = 2026;
        $endMonth = 10;
        $periods = [];
        for ($i = $monthsCount - 1; $i >= 0; $i--) {
            $dt = (new \DateTimeImmutable(sprintf('%04d-%02d-01', $endYear, $endMonth)))->modify("-{$i} month");
            $periods[] = [
                'periode' => $dt->format('Y-m'),
                'year' => (int) $dt->format('Y'),
                'month' => (int) $dt->format('n'),
                'month_idx' => $monthsCount - $i, // 1 to 24
            ];
        }

        // KUNCI SEED ACAK (seed = 42) supaya hasil simulasi konsisten dan bisa diulang
        mt_srand(42);

        $trainingDataset = [];
        $totalCreatedRequests = 0;
        $totalCreatedDetails = 0;

        $this->output->progressStart(count($units) * count($periods));

        DB::beginTransaction();
        try {
            // Hapus data simulasi sebelumnya (agar idempotent)
            $oldSimIds = ProcurementRequest::where('id', 'like', 'PR-SIM-%')->pluck('id');
            if ($oldSimIds->isNotEmpty()) {
                RequestDetail::whereIn('request_id', $oldSimIds)->delete();
                StatusLog::whereIn('pengajuan_id', $oldSimIds)->delete();
                ProcurementRequest::whereIn('id', $oldSimIds)->delete();
            }

            foreach ($periods as $pInfo) {
                $periode = $pInfo['periode'];
                $month = $pInfo['month'];
                $mIdx = $pInfo['month_idx'];
                $periodeClean = str_replace('-', '', $periode);

                // Trend pertumbuhan ringan (+0.8% per bulan)
                $trend = 1.0 + (0.008 * ($mIdx - 1));

                foreach ($units as $unit) {
                    $unitReqId = "PR-SIM-{$periodeClean}-{$unit['slug']}";
                    $unitPriceTotal = 0.0;
                    $reqDetails = [];

                    foreach ($katalogItems as $kItem) {
                        $itemId = $kItem->id;
                        $base = ($baseDemands[$itemId] ?? 5.0) * $unit['scale'];

                        // Musiman umum: Awal semester (Feb-Mar & Agu-Sep) naik untuk ATK/Kertas/Spidol
                        $seasonality = 1.0;
                        if (in_array($month, [2, 3, 8, 9])) {
                            if (in_array($itemId, ['KAT-001', 'KAT-002', 'KAT-005', 'KAT-007', 'KAT-008', 'KAT-009'])) {
                                $seasonality *= 1.55;
                            }
                        }

                        // Musiman khusus PMB (Mei-Jul peak pendaftaran, Jan-Feb gelombang awal)
                        if ($unit['type'] === 'pmb') {
                            if (in_array($month, [5, 6, 7])) {
                                if (in_array($itemId, ['KAT-001', 'KAT-002', 'KAT-006', 'KAT-007', 'KAT-003', 'KAT-004', 'KAT-005'])) {
                                    $seasonality *= 2.4;
                                }
                            } elseif (in_array($month, [1, 2])) {
                                if (in_array($itemId, ['KAT-001', 'KAT-006', 'KAT-007'])) {
                                    $seasonality *= 1.6;
                                }
                            }
                        }

                        // Musiman khusus LSP (Jun & Des periode uji kompetensi mahasiswa)
                        if ($unit['type'] === 'lsp') {
                            if (in_array($month, [6, 12])) {
                                if (in_array($itemId, ['KAT-001', 'KAT-002', 'KAT-006', 'KAT-007'])) {
                                    $seasonality *= 2.2;
                                }
                            }
                        }

                        // Musiman khusus Perpustakaan (Sep-Okt awal tahun ajaran baru)
                        if ($unit['type'] === 'perpus') {
                            if (in_array($month, [9, 10])) {
                                if (in_array($itemId, ['KAT-012', 'KAT-011', 'KAT-008'])) {
                                    $seasonality *= 1.5;
                                }
                            }
                        }

                        // Noise acak ±15% - 25% (dikunci seed 42)
                        $noise = 1.0 + (mt_rand(-20, 20) / 100.0);

                        // Kuantitas akhir bulat minimal 1
                        $qty = (int) round($base * $trend * $seasonality * $noise);
                        $qty = max(1, $qty);

                        $subtotal = $qty * $kItem->harga_acuan;
                        $unitPriceTotal += $subtotal;

                        $reqDetails[] = [
                            'code_id' => "D-SIM-{$periodeClean}-{$unit['slug']}-{$itemId}",
                            'request_id' => $unitReqId,
                            'name' => $kItem->nama,
                            'qty' => $qty,
                            'needed_qty' => $qty,
                            'stock_in_lab' => 0,
                            'unit' => $kItem->satuan,
                            'price' => $kItem->harga_acuan,
                            'qty_final' => $qty,
                            'created_at' => "{$periode}-05 09:00:00",
                            'updated_at' => "{$periode}-05 09:00:00",
                        ];

                        // Masukkan ke dataset latih (format JSON FastAPI: wajib kode unit)
                        $trainingDataset[] = [
                            'periode' => $periode,
                            'unit_id' => $unit['slug'],
                            'barang_id' => $itemId,
                            'qty' => (float) $qty,
                        ];
                    }

                    // Buat pengajuan Alur B dengan status SELESAI dan sumber simulasi (terisolasi)
                    ProcurementRequest::create([
                        'id' => $unitReqId,
                        'unit_id' => $unit['slug'],
                        'sumber' => 'simulasi',
                        'item' => "Pengadaan Rutin Logistik & ATK {$periode} - {$unit['name']}",
                        'category' => 'Pengadaan Barang & ATK Unit',
                        'unit_kerja' => $unit['name'],
                        'department' => $unit['name'],
                        'applicant' => $unit['applicant'],
                        'date' => "{$periode}-05",
                        'need_by' => "{$periode}-12",
                        'purpose' => "Pemenuhan kebutuhan operasional dan logistik bulanan unit",
                        'alur' => 'B',
                        'status' => StatusPengajuan::SELESAI->value,
                        'price' => $unitPriceTotal,
                        'disbursed_amount' => $unitPriceTotal,
                        'dana_diterima' => $unitPriceTotal,
                        'actual_spent' => $unitPriceTotal,
                        'nominal_transfer' => $unitPriceTotal,
                        'faktor_f' => 1.0,
                        'catatan_keuangan' => 'Pencairan operasional rutin bulanan.',
                        'created_at' => "{$periode}-05 09:00:00",
                        'updated_at' => "{$periode}-15 14:00:00",
                    ]);

                    RequestDetail::insert($reqDetails);

                    $totalCreatedRequests++;
                    $totalCreatedDetails += count($reqDetails);
                    $this->output->progressAdvance();
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error("Gagal melakukan seeding simulasi: " . $e->getMessage());
            return 1;
        }

        $this->output->progressFinish();
        $this->info("Berhasil membuat {$totalCreatedRequests} pengajuan simulasi ({$totalCreatedDetails} baris detail) untuk {$monthsCount} bulan.");

        // 4. Latih model jika diminta (--train atau default bila diminta user)
        if ($this->option('train')) {
            $this->newLine();
            $datasetCount = count($trainingDataset);
            $this->info("Mengirim dataset ({$datasetCount} baris) ke Forecast Service (FastAPI)...");
            return $this->trainModel($trainingDataset);
        }

        return 0;
    }

    /**
     * Mengirim dataset ke endpoint /train forecast-service dan menampilkan tabel metrik evaluasi.
     */
    protected function trainModel(array $dataset): int
    {
        $forecastUrl = env('FORECAST_SERVICE_URL', 'http://127.0.0.1:8001');
        $token = env('FORECAST_INTERNAL_TOKEN', 'spake-forecast-internal-secret-key-2026');

        $this->info("Menghubungi {$forecastUrl}/train...");

        try {
            $response = Http::timeout(180)
                ->withHeaders([
                    'X-Internal-Token' => $token,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$forecastUrl}/train", [
                    'dataset' => $dataset,
                    'is_simulated_data' => true,
                ]);

            if ($response->failed()) {
                $this->error("Gagal melatih model (HTTP {$response->status()}): " . $response->body());
                return 1;
            }

            $resData = $response->json();
            $metrics = $resData['data'];

            // Register trained model in model_peramalan table with aktif = true
            ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
            $newModel = ModelPeramalan::create([
                'versi' => isset($metrics['version']) ? ('rf_v' . $metrics['version']) : ($resData['model_version'] ?? ('rf_v' . time())),
                'varian' => $metrics['selected_variant'] ?? 'residual',
                'parameter' => $metrics['best_params'] ?? [],
                'mae_rf' => $metrics['mae_rf'] ?? null,
                'mape_rf' => $metrics['mape_rf'] ?? null,
                'mape_ma3' => $metrics['mape_ma3'] ?? null,
                'mape_snaive' => $metrics['mape_snaive'] ?? null,
                'rolling_origin_results' => $metrics['rolling_windows'] ?? [],
                'jumlah_data' => $metrics['row_count'] ?? count($dataset),
                'sumber_data' => 'Simulasi Alur B',
                'is_simulated' => true,
                'aktif' => true,
                'trained_at' => now(),
                'artifact_path' => "models/rf_v" . ($metrics['version'] ?? 1) . ".json",
            ]);

            $this->info("Pelatihan model versi {$metrics['version']} berhasil diselesaikan dan terdaftar di model_peramalan (ID: {$newModel->id})!");
            $this->newLine();

            // Tampilkan tabel: Metode x (MAPE Jendela 1, 2, 3, Rata-rata +- Simpangan, MAE)
            $w = $metrics['rolling_windows'] ?? [];
            $s = $metrics['rolling_summary'] ?? [];
            $variantName = ($metrics['selected_variant'] ?? 'rf_residual') === 'rf_residual' ? 'Random Forest (Residual)' : 'Random Forest (Direct)';

            $headers = ['Metode Peramalan', 'MAPE Jendela 1', 'MAPE Jendela 2', 'MAPE Jendela 3', 'Rata-rata ± Simpangan', 'Mean MAE'];
            $rows = [];

            if (count($w) >= 3) {
                $rows[] = [
                    $variantName,
                    $w[0]['mape_rf'] . '%',
                    $w[1]['mape_rf'] . '%',
                    $w[2]['mape_rf'] . '%',
                    $s['mean_mape_rf'] . '% ± ' . $s['std_mape_rf'] . '%',
                    $s['mean_mae_rf'],
                ];
                $rows[] = [
                    'Seasonal Naive (lag_12)',
                    $w[0]['mape_snaive'] . '%',
                    $w[1]['mape_snaive'] . '%',
                    $w[2]['mape_snaive'] . '%',
                    $s['mean_mape_snaive'] . '% ± ' . $s['std_mape_snaive'] . '%',
                    $s['mean_mae_snaive'],
                ];
                $rows[] = [
                    'Moving Average 3 (MA3)',
                    $w[0]['mape_ma3'] . '%',
                    $w[1]['mape_ma3'] . '%',
                    $w[2]['mape_ma3'] . '%',
                    $s['mean_mape_ma3'] . '% ± ' . $s['std_mape_ma3'] . '%',
                    $s['mean_mae_ma3'],
                ];
            } else {
                $rows[] = [$variantName, '-', '-', $metrics['mape_rf'] . '%', $metrics['mape_rf'] . '%', $metrics['mae_rf']];
                $rows[] = ['Seasonal Naive (lag_12)', '-', '-', ($metrics['mape_snaive'] ?? '-') . '%', ($metrics['mape_snaive'] ?? '-') . '%', $metrics['mae_snaive'] ?? '-'];
                $rows[] = ['Moving Average 3 (MA3)', '-', '-', $metrics['mape_ma3'] . '%', $metrics['mape_ma3'] . '%', $metrics['mae_ma3']];
            }

            $this->table($headers, $rows);

            $this->newLine();
            $this->info("Informasi Model: Varian Terpilih = {$metrics['selected_variant']}, Parameter = " . json_encode($metrics['best_params']));
            $this->info("Label Data = " . (!empty($metrics['is_simulated_data']) ? 'Data simulasi' : 'Data riil') . " | Model Unggul vs Baseline = " . ($metrics['model_lebih_baik_dari_baseline'] ? 'YA' : 'TIDAK'));

            // Tampilkan ringkasan Top 5 Feature Importance
            if (!empty($metrics['feature_importance'])) {
                $this->info('Top 5 Feature Importance:');
                $top5 = array_slice($metrics['feature_importance'], 0, 5, true);
                $impRows = [];
                foreach ($top5 as $f => $imp) {
                    $impRows[] = [$f, $imp];
                }
                $this->table(['Fitur', 'Importance'], $impRows);
            }

            // Auto-generate ramalan untuk semua unit agar tabel ramalan terisi penuh
            $this->generatePredictionsForAllUnits($dataset, $newModel->id);

            return 0;
        } catch (\Throwable $e) {
            $this->error("Koneksi ke forecast-service gagal: " . $e->getMessage());
            $this->comment("Pastikan service berjalan di port 8001: uvicorn app.main:app --port 8001");
            return 1;
        }
    }

    /**
     * Menghasilkan ramalan untuk seluruh unit dan catalog item ke tabel ramalan
     */
    protected function generatePredictionsForAllUnits(array $dataset, int $activeModelId): void
    {
        $forecastUrl = env('FORECAST_SERVICE_URL', 'http://127.0.0.1:8001');
        $token = env('FORECAST_INTERNAL_TOKEN', 'spake-forecast-internal-secret-key-2026');
        $nextMonth = now('Asia/Jakarta')->addMonth()->format('Y-m');
        $currentMonth = now('Asia/Jakarta')->format('Y-m');
        $targetPeriods = array_values(array_unique([$nextMonth, '2026-11', $currentMonth, '2026-10']));

        foreach ($targetPeriods as $period) {
            $this->info("Menghasilkan ramalan otomatis untuk seluruh unit pada periode {$period}...");
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(30)
                    ->withHeaders([
                        'X-Internal-Token' => $token,
                        'Content-Type' => 'application/json',
                    ])
                    ->post("{$forecastUrl}/predict", [
                        'dataset' => $dataset,
                        'target_period' => $period,
                    ]);

                if ($response->successful()) {
                    $preds = $response->json()['predictions'] ?? [];
                    $saved = 0;
                    foreach ($preds as $p) {
                        $uId = $p['unit_id'];
                        $bId = $p['barang_id'];
                        if (\App\Models\Unit::find($uId) && \App\Models\KatalogBarang::find($bId)) {
                            \App\Models\Ramalan::updateOrCreate(
                                [
                                    'unit_id' => $uId,
                                    'katalog_barang_id' => $bId,
                                    'periode' => $period,
                                ],
                                [
                                    'qty_prediksi' => (float)$p['qty_prediksi'],
                                    'qty_ma3' => (float)($p['qty_baseline'] ?? 0),
                                    'qty_snaive' => (float)($p['qty_snaive'] ?? 0),
                                    'model_id' => $activeModelId,
                                    'tanpa_model' => (bool)($p['tanpa_model'] ?? false),
                                ]
                            );
                            $saved++;
                        }
                    }
                    $this->info("Berhasil menyimpan {$saved} baris ramalan ({$period}) untuk seluruh unit.");
                }
            } catch (\Throwable $e) {
                $this->warn("Gagal auto-generate ramalan untuk {$period}: " . $e->getMessage());
            }
        }
    }
}
