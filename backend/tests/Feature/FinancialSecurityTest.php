<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ProcurementRequest;
use App\Models\User;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FinancialSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $keuanganKitchen;
    protected User $keuanganUmum;

    protected function setUp(): void
    {
        parent::setUp();

        $this->keuanganKitchen = User::create([
            'id' => 'USR-TEST-KK',
            'name' => 'Ratna Sari (Keuangan Kitchen)',
            'email' => 'keu.kitchen.sec@gmail.com',
            'password' => bcrypt('password'),
            'role' => 'Keuangan Kitchen',
            'department' => 'Bagian Keuangan Praktikum & Kasbon',
            'status' => 'Aktif',
        ]);

        $this->keuanganUmum = User::create([
            'id' => 'USR-TEST-KU',
            'name' => 'Siti Aminah (Keuangan Umum)',
            'email' => 'keu.umum.sec@gmail.com',
            'password' => bcrypt('password'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
            'status' => 'Aktif',
        ]);
    }

    public function test_patch_status_to_dana_dicairkan_by_keuangan_kitchen_returns_422_and_status_unchanged(): void
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-A01',
            'alur' => 'A',
            'item' => 'Bahan Kuliner A01',
            'applicant' => 'Aura Maharani',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('Y-m-d'),
            'price' => 500000,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
        ]);

        $res = $this->actingAs($this->keuanganKitchen)->patchJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::DANA_DICAIRKAN->value,
            'note' => 'Bypass keputusan keuangan',
        ]);

        $res->assertStatus(422);
        $this->assertEquals(StatusPengajuan::DISETUJUI_KAPRODI->value, $req->fresh()->status);
    }

    public function test_patch_status_to_sedang_dibelanjakan_by_keuangan_umum_returns_422_and_status_unchanged(): void
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-B01',
            'alur' => 'B',
            'item' => 'ATK B01',
            'applicant' => 'Doni Prasetyo',
            'department' => 'Sekretariat D3',
            'unit_id' => 'SEKR-D3',
            'date' => now()->format('Y-m-d'),
            'price' => 200000,
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
        ]);

        $res = $this->actingAs($this->keuanganUmum)->patchJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            'note' => 'Bypass keputusan keuangan',
        ]);

        $res->assertStatus(422);
        $this->assertEquals(StatusPengajuan::DIVERIFIKASI_KOORD->value, $req->fresh()->status);
    }

    public function test_post_disburse_returns_404(): void
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-D01',
            'alur' => 'A',
            'item' => 'Bahan Kuliner D01',
            'applicant' => 'Aura Maharani',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('Y-m-d'),
            'price' => 300000,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
        ]);

        $res = $this->actingAs($this->keuanganKitchen)->postJson("/api/requests/{$req->id}/disburse", [
            'amount' => 300000,
        ]);

        $res->assertStatus(404);
    }
}
