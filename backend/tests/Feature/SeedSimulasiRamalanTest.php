<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\KatalogBarang;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SeedSimulasiRamalanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_seed_simulasi_creates_expected_requests_and_details(): void
    {
        // Jalankan command simulasi tanpa training
        $this->artisan('ramalan:seed-simulasi', ['--months' => 24])
            ->assertSuccessful();

        // 6 unit x 24 bulan = 144 pengajuan simulasi
        $requests = ProcurementRequest::where('id', 'like', 'PR-SIM-%')->get();
        $this->assertCount(144, $requests);

        // Setiap pengajuan harus Alur B, SELESAI, dan bertanda sumber=simulasi
        foreach ($requests as $req) {
            $this->assertEquals('B', $req->alur);
            $this->assertEquals(StatusPengajuan::SELESAI->value, $req->status);
            $this->assertEquals('simulasi', $req->sumber);
            $this->assertGreaterThan(0, $req->price);
        }

        // 144 pengajuan x 12 barang katalog = 1728 baris detail
        $details = RequestDetail::where('code_id', 'like', 'D-SIM-%')->get();
        $this->assertCount(1728, $details);

        // Pastikan tidak ada kuantitas 0 atau negatif
        foreach ($details as $d) {
            $this->assertGreaterThan(0, $d->qty);
            $this->assertEquals($d->qty, $d->qty_final);
        }
    }

    public function test_seed_simulasi_is_idempotent_when_run_twice(): void
    {
        $this->artisan('ramalan:seed-simulasi', ['--months' => 24])->assertSuccessful();
        $firstCount = ProcurementRequest::where('id', 'like', 'PR-SIM-%')->count();

        // Jalankan kedua kali
        $this->artisan('ramalan:seed-simulasi', ['--months' => 24])->assertSuccessful();
        $secondCount = ProcurementRequest::where('id', 'like', 'PR-SIM-%')->count();

        $this->assertEquals($firstCount, $secondCount);
    }

    public function test_dashboard_keuangan_umum_and_export_excludes_simulasi(): void
    {
        // 1. Buat data simulasi (144 requests sumber=simulasi)
        $this->artisan('ramalan:seed-simulasi', ['--months' => 24])->assertSuccessful();
        $this->assertEquals(144, ProcurementRequest::where('sumber', 'simulasi')->count());

        // 2. Ambil user Keuangan Umum
        $keuanganUmum = \App\Models\User::where('email', 'keuangan.umum@gmail.com')->first();
        $this->assertNotNull($keuanganUmum);

        // 3. Request daftar pengajuan (dashboard / ekspor laporan) oleh Keuangan Umum
        $resList = $this->actingAs($keuanganUmum)
            ->getJson('/api/requests');

        $resList->assertStatus(200);
        $dataList = $resList->json('data');

        // Pastikan TIDAK ADA satupun pengajuan bertanda 'simulasi' di respons daftar pengajuan
        foreach ($dataList as $item) {
            $this->assertNotEquals('simulasi', $item['sumber'] ?? null);
            $this->assertFalse(str_starts_with($item['id'], 'PR-SIM-'));
        }

        // 4. Request KPI dashboard oleh Keuangan Umum
        $resKpis = $this->actingAs($keuanganUmum)
            ->getJson('/api/requests/kpis');

        $resKpis->assertStatus(200);
        $kpiData = $resKpis->json('data');

        // Total requests di KPI hanya menghitung data riil (bukan 168+ data simulasi)
        $this->assertLessThan(50, $kpiData['totalRequests']);
    }

    public function test_seed_simulasi_hapus_option_removes_all_simulated_data(): void
    {
        // 1. Buat data simulasi
        $this->artisan('ramalan:seed-simulasi', ['--months' => 24])->assertSuccessful();
        $this->assertGreaterThan(0, ProcurementRequest::where('sumber', 'simulasi')->count());
        $this->assertGreaterThan(0, RequestDetail::where('code_id', 'like', 'D-SIM-%')->count());

        // 2. Jalankan opsi --hapus
        $this->artisan('ramalan:seed-simulasi', ['--hapus' => true])
            ->expectsOutputToContain('Berhasil menghapus')
            ->assertSuccessful();

        // 3. Pastikan seluruh pengajuan & detail simulasi terhapus
        $this->assertEquals(0, ProcurementRequest::where('sumber', 'simulasi')->count());
        $this->assertEquals(0, ProcurementRequest::where('id', 'like', 'PR-SIM-%')->count());
        $this->assertEquals(0, RequestDetail::where('code_id', 'like', 'D-SIM-%')->count());
    }
}
