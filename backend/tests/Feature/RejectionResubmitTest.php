<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\LabStock;
use App\Models\Curriculum;
use App\Models\KatalogBarang;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RejectionResubmitTest extends TestCase
{
    use RefreshDatabase;

    protected User $asdos;
    protected User $koorLab;
    protected User $kaprodi;
    protected User $stafUnit;
    protected User $koorUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asdos = User::factory()->create([
            'name' => 'Aura Maharani',
            'email' => 'asdos@asaindo.ac.id',
            'role' => 'Asdos Kitchen',
        ]);

        $this->koorLab = User::factory()->create([
            'name' => 'Chef Junaedi',
            'email' => 'koor.lab@asaindo.ac.id',
            'role' => 'Koordinator Lab',
        ]);

        $this->kaprodi = User::factory()->create([
            'name' => 'Dr. Maria Kusuma',
            'email' => 'kaprodi@asaindo.ac.id',
            'role' => 'Kaprodi',
        ]);

        $this->stafUnit = User::factory()->create([
            'name' => 'Rizky Ananda',
            'email' => 'staf.pmb@asaindo.ac.id',
            'role' => 'Staf Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
        ]);

        $this->koorUnit = User::factory()->create([
            'name' => 'Budi Santoso',
            'email' => 'koor.pmb@asaindo.ac.id',
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
        ]);
    }

    public function test_pemohon_alur_a_can_resubmit_and_edit_after_ditolak_koord(): void
    {
        // 1. Buat pengajuan Alur A
        $req = ProcurementRequest::create([
            'id' => 'PR-2026-TEST01',
            'item' => 'Bahan Praktikum Test',
            'category' => 'Bahan Praktik Masak',
            'prodi' => 'D3 Perhotelan',
            'qty' => 10,
            'unit' => 'kg',
            'price' => 150000,
            'applicant' => $this->asdos->name,
            'pemohon_id' => (string)$this->asdos->id,
            'date' => now()->toDateString(),
            'department' => 'Laboratorium Kitchen',
            'alur' => 'A',
            'status' => StatusPengajuan::DIAJUKAN->value,
        ]);

        $detail = RequestDetail::create([
            'request_id' => $req->id,
            'name' => 'Daging Sapi',
            'qty' => 5,
            'unit' => 'kg',
            'price' => 120000,
        ]);

        // 2. Koordinator Lab menolak
        $responseReject = $this->actingAs($this->koorLab, 'sanctum')
            ->patchJson("/api/requests/{$req->id}/status", [
                'status' => 'DITOLAK_KOORD',
                'note' => 'Kuantitas terlalu banyak untuk 1 sesi.',
            ]);
        $responseReject->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => 'DITOLAK_KOORD',
        ]);

        // 3. User lain coba edit -> 403
        $responseOtherEdit = $this->actingAs($this->stafUnit, 'sanctum')
            ->putJson("/api/requests/{$req->id}", [
                'details' => [
                    ['id' => $detail->id, 'name' => 'Daging Sapi', 'qty' => 3, 'unit' => 'kg', 'price' => 120000],
                ],
            ]);
        $responseOtherEdit->assertStatus(403);

        // 4. Pemohon mengedit rincian
        $responseEdit = $this->actingAs($this->asdos, 'sanctum')
            ->putJson("/api/requests/{$req->id}", [
                'details' => [
                    ['id' => $detail->id, 'name' => 'Daging Sapi', 'qty' => 3, 'unit' => 'kg', 'price' => 120000],
                ],
            ]);
        $responseEdit->assertStatus(200);

        // 5. Pemohon mengajukan ulang ke DIAJUKAN
        $responseResubmit = $this->actingAs($this->asdos, 'sanctum')
            ->patchJson("/api/requests/{$req->id}/status", [
                'status' => 'DIAJUKAN',
                'note' => 'Kuantitas telah disesuaikan menjadi 3 kg.',
            ]);
        $responseResubmit->assertStatus(200);

        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => 'DIAJUKAN',
        ]);

        // 6. Audit trail tetap menyimpan riwayat penolakan
        $this->assertDatabaseHas('procurement_activity_logs', [
            'procurement_request_id' => $req->id,
            'status_to' => 'DITOLAK_KOORD',
        ]);
        $this->assertDatabaseHas('procurement_activity_logs', [
            'procurement_request_id' => $req->id,
            'status_to' => 'DIAJUKAN',
        ]);
    }

    public function test_koordinator_lab_can_reverify_or_resubmit_after_ditolak_kaprodi(): void
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-2026-TEST02',
            'item' => 'Bahan Praktikum Menu 2',
            'category' => 'Bahan Praktik Masak',
            'prodi' => 'D3 Perhotelan',
            'qty' => 5,
            'unit' => 'kg',
            'price' => 100000,
            'applicant' => $this->asdos->name,
            'pemohon_id' => (string)$this->asdos->id,
            'date' => now()->toDateString(),
            'department' => 'Laboratorium Kitchen',
            'alur' => 'A',
            'status' => StatusPengajuan::DITOLAK_KAPRODI->value,
            'rejection_reason' => 'Perlu sesuaikan jadwal praktikum.',
        ]);

        // Koordinator Lab boleh mengedit qty saat DITOLAK_KAPRODI
        $responseEdit = $this->actingAs($this->koorLab, 'sanctum')
            ->putJson("/api/requests/{$req->id}", [
                'details' => [
                    ['name' => 'Tepung Terigu', 'qty' => 4, 'unit' => 'kg', 'price' => 15000],
                ],
            ]);
        $responseEdit->assertStatus(200);

        // Koordinator Lab boleh memverifikasi ulang langsung ke DIVERIFIKASI_KOORD
        $responseReverify = $this->actingAs($this->koorLab, 'sanctum')
            ->patchJson("/api/requests/{$req->id}/status", [
                'status' => 'DIVERIFIKASI_KOORD',
                'note' => 'Jadwal dan kuantitas telah divalidasi ulang dengan Asdos.',
            ]);
        $responseReverify->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DIVERIFIKASI_KOORD->value, $req->fresh()->status);
    }
}
