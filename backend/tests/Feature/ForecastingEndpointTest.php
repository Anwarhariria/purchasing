<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\KatalogBarang;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\ModelPeramalan;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

class ForecastingEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::firstOrCreate(
            ['email' => 'superadmin.test@gmail.com'],
            [
                'id' => 'USR-SUPER-TEST',
                'name' => 'Super Admin Test',
                'password' => bcrypt('123'),
                'role' => 'Super Admin',
                'department' => 'IT',
                'status' => 'Aktif',
            ]
        );

        Sanctum::actingAs($admin);

        // Pastikan ada ModelPeramalan aktif yang mandiri untuk test
        ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
        ModelPeramalan::create([
            'versi' => 'v1.0.0-test',
            'varian' => 'RF-residual',
            'parameter' => ['n_estimators' => 50, 'max_depth' => 5],
            'mae_rf' => 1.25,
            'mape_rf' => 12.5,
            'mape_ma3' => 18.0,
            'mape_snaive' => 15.0,
            'rolling_origin_results' => [
                'windows' => [
                    ['window' => 1, 'mape_rf' => 12.0, 'mape_ma3' => 18.5, 'mape_snaive' => 15.2],
                    ['window' => 2, 'mape_rf' => 13.0, 'mape_ma3' => 17.5, 'mape_snaive' => 14.8],
                    ['window' => 3, 'mape_rf' => 12.5, 'mape_ma3' => 18.0, 'mape_snaive' => 15.0],
                ],
                'summary' => [
                    'mean_rf' => 12.5, 'std_rf' => 0.5,
                    'mean_ma3' => 18.0, 'std_ma3' => 0.5,
                    'mean_snaive' => 15.0, 'std_snaive' => 0.2,
                ],
            ],
            'jumlah_data' => 24,
            'sumber_data' => 'Pengadaan Alur B',
            'is_simulated' => true,
            'aktif' => true,
            'trained_at' => now(),
            'artifact_path' => 'models/v1.0.0-test.joblib',
        ]);
    }

    public function test_model_info_returns_active_model_metadata(): void
    {
        $response = $this->getJson('/api/forecasting/model-info');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                'version',
                'trained_at',
                'rolling_windows',
                'rolling_summary',
                'selected_variant',
                'best_params',
            ],
        ]);
    }

    public function test_predict_alur_b_generates_predictions(): void
    {
        // Pastikan ada katalog barang di DB
        if (KatalogBarang::count() === 0) {
            KatalogBarang::create([
                'id' => 'KAT-001',
                'kode' => 'KAT-001',
                'nama' => 'Kertas HVS A4 75gsm',
                'kategori' => 'Alat Tulis Kantor',
                'satuan' => 'Rim',
                'harga_acuan' => 52000,
                'stok_tersedia' => 10,
                'aktif' => true,
            ]);
        }

        for ($m = 1; $m <= 6; $m++) {
            $period = sprintf('2026-%02d', $m);
            $req = ProcurementRequest::create([
                'id' => "PR-TEST-{$m}",
                'item' => 'Pengadaan ATK Bulanan',
                'category' => 'Alat Tulis Kantor & Kertas',
                'applicant' => 'Rizky Ananda',
                'department' => 'Penerimaan Mahasiswa Baru',
                'date' => "{$period}-01",
                'created_at' => "{$period}-01 08:00:00",
                'status' => 'Selesai',
                'sumber' => 'simulasi',
            ]);
            RequestDetail::create([
                'code_id' => 'KAT-001',
                'request_id' => $req->id,
                'name' => 'Kertas HVS A4 75gsm',
                'qty' => 10,
                'unit' => 'Rim',
                'price' => 52000,
            ]);
        }

        Http::fake([
            '*/predict' => Http::response([
                'model_version' => 'v1.0.0-test',
                'target_period' => '2026-07',
                'predictions' => [
                    [
                        'unit_id' => 'PMB',
                        'item_name' => 'Kertas HVS A4 75gsm',
                        'qty_prediksi' => 15,
                        'qty_ma3' => 10,
                        'qty_snaive' => 12,
                        'qty_baseline' => 12,
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'target_period' => '2026-07',
            'unit_id' => 'PMB',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'target_period',
            'available_units',
            'summary' => [
                'total_items',
                'total_qty_prediksi',
                'total_estimasi_biaya',
            ],
            'predictions',
        ]);

        $body = $response->json();
        $this->assertEquals('2026-07', $body['target_period']);
        if (!empty($body['predictions'])) {
            $first = $body['predictions'][0];
            $this->assertArrayHasKey('qty_prediksi', $first);
            $this->assertArrayHasKey('qty_snaive', $first);
            $this->assertArrayHasKey('qty_baseline', $first);
            $this->assertEquals('PMB', $first['unit_id']);
        }
    }

    public function test_predict_alur_b_fallback_when_forecast_service_is_down(): void
    {
        KatalogBarang::firstOrCreate(
            ['id' => 'KAT-001'],
            [
                'kode' => 'KAT-001',
                'nama' => 'Kertas HVS A4 75gsm',
                'kategori' => 'Alat Tulis Kantor',
                'satuan' => 'Rim',
                'harga_acuan' => 52000,
                'stok_tersedia' => 10,
                'aktif' => true,
            ]
        );

        for ($m = 1; $m <= 6; $m++) {
            $period = sprintf('2026-%02d', $m);
            $req = ProcurementRequest::firstOrCreate(
                ['id' => "PR-FB-TEST-{$m}"],
                [
                    'item' => 'Pengadaan ATK Bulanan',
                    'category' => 'Alat Tulis Kantor & Kertas',
                    'applicant' => 'Rizky Ananda',
                    'department' => 'Penerimaan Mahasiswa Baru',
                    'unit_id' => 'PMB',
                    'date' => "{$period}-01",
                    'created_at' => "{$period}-01 08:00:00",
                    'status' => 'Selesai',
                    'sumber' => 'simulasi',
                ]
            );
            RequestDetail::firstOrCreate(
                ['request_id' => $req->id, 'code_id' => 'KAT-001'],
                [
                    'name' => 'Kertas HVS A4 75gsm',
                    'qty' => 12,
                    'unit' => 'Rim',
                    'price' => 52000,
                ]
            );
        }

        // Fake HTTP so forecast service appears down / error 500
        Http::fake([
            '*/predict' => Http::response(['error' => 'Service Unavailable'], 500),
        ]);

        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'target_period' => '2026-07',
            'unit_id' => 'PMB',
        ]);

        $response->assertStatus(200);
        $body = $response->json();
        $this->assertEquals('success', $body['status']);
        $this->assertTrue($body['model_tidak_tersedia']);
        $this->assertNotEmpty($body['predictions']);
        $first = $body['predictions'][0];
        $this->assertTrue($first['tanpa_model']);
        $this->assertArrayHasKey('qty_prediksi', $first);
        $this->assertArrayHasKey('qty_snaive', $first);
        $this->assertArrayHasKey('qty_baseline', $first);

        // Pastikan tersimpan ke tabel ramalan
        $this->assertDatabaseHas('ramalan', [
            'unit_id' => 'PMB',
            'periode' => '2026-07',
            'tanpa_model' => true,
        ]);
    }

    public function test_predict_alur_b_validates_target_period_format(): void
    {
        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'target_period' => '2026-13', // bulan 13 tidak valid
            'unit_id' => 'PMB',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'status' => 'error',
            'message' => 'Format target_period tidak valid. Gunakan format YYYY-MM.',
        ]);
    }

    public function test_predict_alur_b_rejects_more_than_three_months_ahead(): void
    {
        // Setup data 6 bulan sampai 2026-06
        for ($m = 1; $m <= 6; $m++) {
            $period = sprintf('2026-%02d', $m);
            $req = ProcurementRequest::firstOrCreate(
                ['id' => "PR-LIM-TEST-{$m}"],
                [
                    'item' => 'Pengadaan ATK Bulanan',
                    'category' => 'Alat Tulis Kantor & Kertas',
                    'applicant' => 'Rizky Ananda',
                    'department' => 'Penerimaan Mahasiswa Baru',
                    'date' => "{$period}-01",
                    'created_at' => "{$period}-01 08:00:00",
                    'status' => 'Selesai',
                    'sumber' => 'simulasi',
                ]
            );
        }

        // 2026-11 is > 3 months from 2026-06 (or latest period in DB)
        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'target_period' => '2027-10',
            'unit_id' => 'PMB',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'status' => 'error',
            'message' => 'Target periode peramalan maksimal 3 bulan ke depan.',
        ]);
    }

    public function test_predict_alur_b_all_units_return_tanpa_model_false(): void
    {
        $units = ['PMB', 'PERPUS', 'SEKR-S1', 'SEKR-S2', 'SEKR-D3', 'LSP'];

        // Siapkan request details dengan masing-masing unit
        foreach ($units as $u) {
            $req = ProcurementRequest::create([
                'id' => "PR-ALL-{$u}",
                'item' => 'Pengadaan ATK Bulanan',
                'category' => 'Alat Tulis Kantor & Kertas',
                'applicant' => "Staf {$u}",
                'department' => $u,
                'unit_id' => $u,
                'alur' => 'B',
                'date' => '2026-06-01',
                'created_at' => '2026-06-01 08:00:00',
                'status' => 'Selesai',
                'sumber' => 'simulasi',
            ]);
            RequestDetail::create([
                'code_id' => 'KAT-001',
                'request_id' => $req->id,
                'name' => 'Kertas HVS A4 75gsm',
                'qty' => 10,
                'unit' => 'Rim',
                'price' => 52000,
            ]);
        }

        $fakePredictions = [];
        foreach ($units as $u) {
            $fakePredictions[] = [
                'unit_id' => $u,
                'barang_id' => 'KAT-001',
                'qty_prediksi' => 20,
                'qty_baseline' => 15,
                'qty_snaive' => 18,
                'tanpa_model' => false,
            ];
        }

        Http::fake([
            '*/predict' => Http::response([
                'status' => 'success',
                'predictions' => $fakePredictions,
            ], 200),
        ]);

        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'unit_id' => 'ALL',
            'target_period' => '2026-07',
        ]);

        $response->assertStatus(200);
        $preds = $response->json('predictions');
        $this->assertCount(6, $preds);

        foreach ($preds as $p) {
            $this->assertFalse($p['tanpa_model'], "Unit {$p['unit_id']} should have tanpa_model = false");
            $this->assertContains($p['unit_id'], $units);
        }

        Http::assertSent(function ($request) use ($units) {
            if (str_contains($request->url(), '/predict')) {
                $dataset = $request['dataset'] ?? [];
                foreach ($dataset as $row) {
                    if (!in_array($row['unit_id'], $units)) {
                        return false;
                    }
                }
                return true;
            }
            return true;
        });
    }

    public function test_predict_alur_b_uses_database_cache_unless_force_refresh(): void
    {
        $activeModel = ModelPeramalan::where('aktif', true)->first();
        \App\Models\Unit::firstOrCreate(['id' => 'PMB'], ['nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB']);
        $kat = KatalogBarang::firstOrCreate(
            ['id' => 'KAT-001'],
            ['nama' => 'Kertas HVS', 'satuan' => 'Rim', 'harga_acuan' => 50000, 'kategori' => 'Kertas & Dokumen']
        );

        // Pre-insert ke tabel ramalan
        \App\Models\Ramalan::create([
            'unit_id' => 'PMB',
            'katalog_barang_id' => $kat->id,
            'periode' => '2026-11',
            'qty_prediksi' => 25,
            'qty_ma3' => 20,
            'qty_snaive' => 22,
            'model_id' => $activeModel->id,
            'tanpa_model' => false,
        ]);

        // Panggilan biasa tanpa refresh -> Wajib membaca dari cache DB tanpa memanggil service AI
        $respCached = $this->postJson('/api/forecasting/predict-alur-b', [
            'unit_id' => 'PMB',
            'target_period' => '2026-11',
        ]);

        $respCached->assertStatus(200);
        $this->assertTrue($respCached->json('cached'));
        $this->assertEquals(25, $respCached->json('predictions.0.qty_prediksi'));

        // Panggilan dengan force=true (Muat Ulang) -> Wajib menghubungi service AI
        Http::fake([
            '*/predict' => Http::response([
                'status' => 'success',
                'predictions' => [
                    [
                        'unit_id' => 'PMB',
                        'barang_id' => 'KAT-001',
                        'qty_prediksi' => 30,
                        'qty_baseline' => 20,
                        'qty_snaive' => 22,
                        'tanpa_model' => false,
                    ],
                ],
            ], 200),
        ]);

        $respForce = $this->postJson('/api/forecasting/predict-alur-b', [
            'unit_id' => 'PMB',
            'target_period' => '2026-11',
            'force' => true,
        ]);

        $respForce->assertStatus(200);
        $this->assertFalse($respForce->json('cached') ?? false);
        $this->assertEquals(30, $respForce->json('predictions.0.qty_prediksi'));
        Http::assertSent(fn($req) => str_contains($req->url(), '/predict'));
    }

    public function test_predict_alur_b_handles_real_request_with_text_date(): void
    {
        $kat = KatalogBarang::firstOrCreate(
            ['id' => 'KAT-001'],
            ['nama' => 'Kertas HVS A4 75gsm', 'satuan' => 'Rim', 'harga_acuan' => 52000, 'kategori' => 'Alat Tulis Kantor', 'aktif' => true]
        );

        $units = ['PMB', 'PERPUS', 'SEKR-S1', 'SEKR-S2', 'SEKR-D3', 'LSP'];
        foreach ($units as $u) {
            \App\Models\Unit::firstOrCreate(['id' => $u], ['nama' => $u, 'kode' => $u]);

            // Pengajuan riil dengan date berformat teks Indonesia "02 Okt 2026"
            $req = ProcurementRequest::create([
                'id' => "PR-REAL-{$u}",
                'item' => 'Pengadaan ATK Riil',
                'category' => 'Alat Tulis Kantor',
                'applicant' => 'Staf ' . $u,
                'department' => $u,
                'unit_id' => $u,
                'alur' => 'B',
                'date' => '02 Okt 2026',
                'created_at' => '2026-10-02 08:30:00',
                'status' => 'Selesai',
                'sumber' => 'riil',
            ]);
            RequestDetail::create([
                'code_id' => 'KAT-001',
                'request_id' => $req->id,
                'name' => 'Kertas HVS A4 75gsm',
                'qty' => 5,
                'unit' => 'Rim',
                'price' => 52000,
            ]);
        }

        $fakePredictions = [];
        foreach ($units as $u) {
            $fakePredictions[] = [
                'unit_id' => $u,
                'barang_id' => 'KAT-001',
                'qty_prediksi' => 20,
                'qty_baseline' => 15,
                'qty_snaive' => 18,
                'tanpa_model' => false,
            ];
        }

        Http::fake([
            '*/predict' => Http::response([
                'status' => 'success',
                'predictions' => $fakePredictions,
            ], 200),
        ]);

        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'unit_id' => 'ALL',
            'target_period' => '2026-11',
            'force' => true,
        ]);

        $response->assertStatus(200);
        $preds = $response->json('predictions');
        $this->assertCount(6, $preds);

        foreach ($preds as $p) {
            $this->assertFalse($p['tanpa_model'], "Unit {$p['unit_id']} should have tanpa_model = false");
        }

        Http::assertSent(function ($request) {
            if (str_contains($request->url(), '/predict')) {
                $dataset = $request['dataset'] ?? [];
                foreach ($dataset as $row) {
                    if (!preg_match('/^\d{4}-\d{2}$/', $row['periode'])) {
                        return false;
                    }
                }
                return true;
            }
            return true;
        });
    }
}
