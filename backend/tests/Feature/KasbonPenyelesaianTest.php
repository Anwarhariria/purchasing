<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\KasbonPenyelesaian;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class KasbonPenyelesaianTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed();
    }

    public function test_penyelesaian_setor_sisa_kasbon_dengan_bukti(): void
    {
        $keuangan = User::where('role', 'Keuangan Kitchen')->first();

        // Buat pengajuan Alur A dengan dana_diterima 300.000 dan actual_spent 250.000 (selisih = -50.000)
        $req = ProcurementRequest::create([
            'id' => 'PR-SETOR-01',
            'alur' => 'A',
            'item' => 'Test Setor Sisa',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani (Asdos Dapur)',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 300000,
            'disbursed_amount' => 300000,
            'dana_diterima' => 300000,
            'actual_spent' => 250000,
            'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
        ]);

        // 1. Coba selesaikan sebelum setor sisa dicatat -> harus 422
        $resCloseBefore = $this->actingAs($keuangan)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Tutup pengajuan.',
        ]);
        $resCloseBefore->assertStatus(422);

        // 2. Coba catat penyelesaian tanpa bukti setor -> harus 422
        $resPenyelesaianNoBukti = $this->actingAs($keuangan)->postJson("/api/kasbon/{$req->id}/penyelesaian", []);
        $resPenyelesaianNoBukti->assertStatus(422);

        // 3. Catat penyelesaian dengan bukti setor valid
        $file = UploadedFile::fake()->create('bukti-transfer-sisa.pdf', 500, 'application/pdf');
        $resPenyelesaian = $this->actingAs($keuangan)->postJson("/api/kasbon/{$req->id}/penyelesaian", [
            'bukti_setor' => $file,
        ]);

        $resPenyelesaian->assertStatus(201);
        $this->assertDatabaseHas('kasbon_penyelesaian', [
            'pengajuan_id' => $req->id,
            'jenis' => 'setor',
            'nominal' => 50000,
        ]);

        // 4. Setelah dicatat penyelesaian, sekarang pengajuan bisa ditutup (SELESAI)
        $resCloseAfter = $this->actingAs($keuangan)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Sisa kasbon telah disetor. Transaksi ditutup.',
        ]);
        $resCloseAfter->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SELESAI->value, $req->fresh()->status);
    }

    public function test_penyelesaian_carry_over_tombok(): void
    {
        $keuangan = User::where('role', 'Keuangan Kitchen')->first();

        // Buat pengajuan dengan dana_diterima 400.000 dan actual_spent 475.000 (selisih = +75.000 tombok)
        $req = ProcurementRequest::create([
            'id' => 'PR-CARRY-01',
            'alur' => 'A',
            'item' => 'Test Tombok Asdos',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani (Asdos Dapur)',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 400000,
            'disbursed_amount' => 400000,
            'dana_diterima' => 400000,
            'actual_spent' => 475000,
            'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
        ]);

        // 1. Coba selesaikan sebelum carry-over dicatat -> harus 422
        $resCloseFail = $this->actingAs($keuangan)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Coba langsung tutup.',
        ]);
        $resCloseFail->assertStatus(422);

        // 2. Catat penyelesaian jenis carry_over
        $resPenyelesaian = $this->actingAs($keuangan)->postJson("/api/kasbon/{$req->id}/penyelesaian", []);
        $resPenyelesaian->assertStatus(201);

        $penyelesaian = KasbonPenyelesaian::where('pengajuan_id', $req->id)->first();
        $this->assertNotNull($penyelesaian);
        $this->assertEquals('carry_over', $penyelesaian->jenis);
        $this->assertEquals(75000, $penyelesaian->nominal);
        $this->assertNull($penyelesaian->kasbon_tujuan_id);

        // 3. Setelah dicatat penyelesaian, sekarang pengajuan bisa ditutup (SELESAI)
        $resCloseSuccess = $this->actingAs($keuangan)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Tombok dicatat carry-over. Transaksi ditutup.',
        ]);
        $resCloseSuccess->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SELESAI->value, $req->fresh()->status);
    }

    public function test_selisih_nol_bisa_langsung_ditutup_tanpa_catatan_penyelesaian(): void
    {
        $keuangan = User::where('role', 'Keuangan Kitchen')->first();

        // Pengajuan dengan dana_diterima = actual_spent = 350.000 (selisih = 0)
        $req = ProcurementRequest::create([
            'id' => 'PR-NOL-01',
            'alur' => 'A',
            'item' => 'Test Selisih Nol',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani (Asdos Dapur)',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 350000,
            'disbursed_amount' => 350000,
            'dana_diterima' => 350000,
            'actual_spent' => 350000,
            'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
        ]);

        // Langsung tutup ke SELESAI tanpa perlu POST penyelesaian
        $resClose = $this->actingAs($keuangan)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Pengeluaran pas, ditutup langsung.',
        ]);

        $resClose->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SELESAI->value, $req->fresh()->status);
    }

    public function test_carry_over_tidak_terbawa_dua_kali_ke_dua_pengajuan_berbeda(): void
    {
        $keuangan = User::where('role', 'Keuangan Kitchen')->first();
        $asdos = 'Bima Sakti (Asdos)';

        // 1. Buat Pengajuan 1 yang menghasilkan carry-over 85.000
        $req1 = ProcurementRequest::create([
            'id' => 'PR-CO-01',
            'alur' => 'A',
            'item' => 'Praktik Pertama',
            'category' => 'Bahan Praktik Masak',
            'applicant' => $asdos,
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 500000,
            'disbursed_amount' => 500000,
            'dana_diterima' => 500000,
            'actual_spent' => 585000,
            'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
        ]);

        // Catat carry over untuk PR-CO-01
        $this->actingAs($keuangan)->postJson("/api/kasbon/{$req1->id}/penyelesaian", []);
        $co1 = KasbonPenyelesaian::where('pengajuan_id', $req1->id)->first();
        $this->assertEquals(85000, $co1->nominal);
        $this->assertNull($co1->kasbon_tujuan_id);

        // 2. Buat Pengajuan 2 untuk Asdos yang sama, berstatus DISETUJUI_KAPRODI dengan price 300.000
        $req2 = ProcurementRequest::create([
            'id' => 'PR-CO-02',
            'alur' => 'A',
            'item' => 'Praktik Kedua',
            'category' => 'Bahan Praktik Masak',
            'applicant' => $asdos,
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 300000,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
        ]);

        // Keuangan mencairkan dana untuk PR-CO-02
        $resDisburse2 = $this->actingAs($keuangan)->postJson("/api/requests/{$req2->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'nominal_transfer' => 300000,
            'catatan_keuangan' => 'Cairkan kasbon kedua.',
            'bukti_transfer_path' => 'transfer/test-co2.pdf',
        ]);
        $resDisburse2->assertStatus(200);

        $req2Fresh = $req2->fresh();
        // Dana diterima harus nominal dasar (300.000) + tombok (85.000) = 385.000
        $this->assertEquals(300000, $req2Fresh->disbursed_amount);
        $this->assertEquals(385000, $req2Fresh->dana_diterima);

        // Entri carry-over sekarang harus tertaut ke PR-CO-02 (kasbon_tujuan_id tidak null lagi)
        $this->assertEquals($req2->id, $co1->fresh()->kasbon_tujuan_id);

        // 3. Buat Pengajuan 3 untuk Asdos yang sama, berstatus DISETUJUI_KAPRODI dengan price 400.000
        $req3 = ProcurementRequest::create([
            'id' => 'PR-CO-03',
            'alur' => 'A',
            'item' => 'Praktik Ketiga',
            'category' => 'Bahan Praktik Masak',
            'applicant' => $asdos,
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'price' => 400000,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
        ]);

        // Keuangan mencairkan dana untuk PR-CO-03
        $resDisburse3 = $this->actingAs($keuangan)->postJson("/api/requests/{$req3->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'nominal_transfer' => 400000,
            'catatan_keuangan' => 'Cairkan kasbon ketiga.',
            'bukti_transfer_path' => 'transfer/test-co3.pdf',
        ]);
        $resDisburse3->assertStatus(200);

        $req3Fresh = $req3->fresh();
        // Dana diterima HARUS HANYA 400.000 (tombok 85.000 TIDAK BOLEH terbawa lagi!)
        $this->assertEquals(400000, $req3Fresh->disbursed_amount);
        $this->assertEquals(400000, $req3Fresh->dana_diterima);
    }
}
