<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\User;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

class BuktiTransferTest extends TestCase
{
    use RefreshDatabase;

    protected User $keuanganKitchen;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->keuanganKitchen = User::create([
            'id' => 'USR-KEU-K',
            'name' => 'Ratna Sari (Keuangan Kitchen)',
            'email' => 'keu.kitchen@spake.test',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Kitchen',
            'department' => 'Bagian Keuangan Praktikum & Kasbon',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($this->keuanganKitchen);
    }

    protected function createRequest(): ProcurementRequest
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-TRF-01',
            'alur' => 'A',
            'item' => 'Bahan Kuliner Sesi 1',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 500000,
            'qty' => 5,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        RequestDetail::create([
            'request_id' => $req->id,
            'name' => 'Daging Ayam',
            'qty' => 5,
            'unit' => 'kg',
            'price' => 100000,
            'needed_qty' => 5,
            'stock_in_lab' => 0,
        ]);

        return $req;
    }

    public function test_f_positif_tanpa_bukti_transfer_ditolak_422(): void
    {
        $req = $this->createRequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'Disetujui penuh',
            'nominal_transfer' => 500000,
        ]);

        $res->assertStatus(422);
        $res->assertJsonFragment(['message' => 'Bukti transfer pencairan dana wajib diunggah (JPG/PNG/PDF, maks 5 MB).']);
    }

    public function test_f_nol_tanpa_bukti_transfer_diterima(): void
    {
        $req = $this->createRequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
            'faktor_f' => 0,
            'catatan_keuangan' => 'Ditolak karena over budget',
            'nominal_transfer' => 0,
        ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => StatusPengajuan::DITOLAK_KEUANGAN->value,
            'faktor_f' => 0,
        ]);
    }

    public function test_f_positif_dengan_upload_bukti_transfer_berhasil_dan_bisa_didownload(): void
    {
        $req = $this->createRequest();
        $file = UploadedFile::fake()->create('bukti_trf.pdf', 200, 'application/pdf');

        $res = $this->post("/api/requests/{$req->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'Transfer via Mandiri Giro',
            'nominal_transfer' => 500000,
            'bukti_transfer' => $file,
        ], ['Accept' => 'application/json']);

        $res->assertStatus(200);

        $fresh = $req->fresh();
        $this->assertNotNull($fresh->bukti_transfer);
        $this->assertTrue(Storage::disk('local')->exists($fresh->bukti_transfer));

        // Test download endpoint
        $downloadRes = $this->get("/api/requests/{$req->id}/berkas/transfer");
        $downloadRes->assertStatus(200);
    }
}
