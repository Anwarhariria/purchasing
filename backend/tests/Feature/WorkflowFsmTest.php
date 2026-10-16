<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\StatusLog;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkflowFsmTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_alur_a_full_lifecycle(): void
    {
        // 1. Asdos submits request
        $asdos = User::where('role', 'Asdos Kitchen')->first();
        $koordLab = User::where('role', 'Koordinator Lab')->first();
        $kaprodi = User::where('role', 'Kaprodi')->first();
        $keuangan = User::where('role', 'Keuangan Kitchen')->first();

        $createResponse = $this->actingAs($asdos)->postJson('/api/requests', [
            'alur' => 'A',
            'item' => 'Nasi Liwet Solo',
            'applicant' => $asdos->name,
            'category' => 'Bahan Praktik Masak',
            'prodi' => 'D3 Perhotelan',
            'semester' => 1,
            'course' => 'Dasar Masak Nusantara',
            'menu' => 'Nasi Liwet Solo',
            'academic_importance' => 'Tinggi',
            'price' => 250000,
            'need_by' => '2026-10-25',
            'purpose' => 'Praktik nasi liwet',
            'details' => [
                [
                    'name' => 'Beras Pandan Wangi',
                    'qty' => 5,
                    'unit' => 'kg',
                    'price' => 18000,
                    'needed_qty' => 5,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $requestId = $createResponse->json('data.id');

        $req = ProcurementRequest::find($requestId);
        $this->assertEquals(StatusPengajuan::DIAJUKAN->value, $req->status);

        // 2. Koordinator Lab verifies: DIAJUKAN -> DIVERIFIKASI_KOORD
        $step1 = $this->actingAs($koordLab)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'note' => 'Standar porsi resep telah disesuaikan.',
        ]);
        $step1->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DIVERIFIKASI_KOORD->value, $req->fresh()->status);

        // 3. Kaprodi approves: DIVERIFIKASI_KOORD -> DISETUJUI_KAPRODI
        $step2 = $this->actingAs($kaprodi)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'note' => 'Kurikulum praktikum disetujui.',
        ]);
        $step2->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DISETUJUI_KAPRODI->value, $req->fresh()->status);

        // 4. Keuangan Kitchen disburses: DISETUJUI_KAPRODI -> DANA_DICAIRKAN
        $step3 = $this->actingAs($keuangan)->postJson("/api/requests/{$requestId}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'nominal_transfer' => 90000,
            'catatan_keuangan' => 'Transfer dana kasbon via BCA.',
            'bukti_transfer_path' => 'transfer/test.pdf',
        ]);
        $step3->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DANA_DICAIRKAN->value, $req->fresh()->status);

        // 5. Asdos confirms receipt: DANA_DICAIRKAN -> BARANG_DITERIMA
        $step4 = $this->actingAs($asdos)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::BARANG_DITERIMA->value,
            'note' => 'Bahan beras telah dibeli dan diterima.',
        ]);
        $step4->assertStatus(200);
        $this->assertEquals(StatusPengajuan::BARANG_DITERIMA->value, $req->fresh()->status);

        // 6. Asdos uploads expense report: BARANG_DITERIMA -> LAPORAN_BELANJA_DIAJUKAN
        $step5 = $this->actingAs($asdos)->postJson("/api/requests/{$requestId}/spj", [
            'actual_spent' => 90000,
            'receipt_images' => ['/receipts/bon-supermarket.jpg'],
            'note' => 'Nota belanja supermarket dilampirkan.',
        ]);
        $step5->assertStatus(200);
        $this->assertEquals(StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value, $req->fresh()->status);

        // 7. Keuangan closes: LAPORAN_BELANJA_DIAJUKAN -> SELESAI
        $step6 = $this->actingAs($keuangan)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'LPJ diverifikasi dan transaksi resmi ditutup.',
        ]);
        $step6->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SELESAI->value, $req->fresh()->status);

        // Verify status_logs
        $logs = StatusLog::where('pengajuan_id', $requestId)->get();
        $this->assertCount(7, $logs); // Created + 6 transitions
    }

    public function test_alur_b_full_lifecycle(): void
    {
        // 1. Staff creates Alur B request
        $staf = User::firstOrCreate(
            ['email' => 'staf.sekre@gmail.com'],
            [
                'name' => 'Doni Prasetyo (Staf Sekretariat D3)',
                'password' => bcrypt('password'),
                'role' => 'Staf Unit',
                'department' => 'Sekretariat D3',
                'unit_id' => 'SEKR-D3',
            ]
        );

        $koordUnit = User::firstOrCreate(
            ['email' => 'koord.sekre@gmail.com'],
            [
                'name' => 'Koordinator Sekretariat D3',
                'password' => bcrypt('password'),
                'role' => 'Koordinator Unit',
                'department' => 'Sekretariat D3',
                'unit_id' => 'SEKR-D3',
            ]
        );

        $keuangan = User::where('role', 'Keuangan Umum')->first();

        $createResponse = $this->actingAs($staf)->postJson('/api/requests', [
            'alur' => 'B',
            'item' => 'Kertas HVS A4 & Map Arsip',
            'applicant' => $staf->name,
            'category' => 'ATK & Cetak',
            'unit_kerja' => 'Sekretariat D3',
            'unit_id' => 'SEKR-D3',
            'price' => 550000,
            'need_by' => '2026-10-30',
            'purpose' => 'Kebutuhan cetak ijazah & transkrip',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 10,
                    'unit' => 'rim',
                    'price' => 55000,
                    'needed_qty' => 10,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $requestId = $createResponse->json('data.id');

        $req = ProcurementRequest::find($requestId);
        $this->assertEquals(StatusPengajuan::DIAJUKAN->value, $req->status);
        $this->assertEquals('B', $req->alur);

        // 2. Koordinator Unit verifies: DIAJUKAN -> DIVERIFIKASI_KOORD
        $step1 = $this->actingAs($koordUnit)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'note' => 'Kebutuhan ATK Sekretariat D3 disetujui koordinator unit.',
        ]);
        $step1->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DIVERIFIKASI_KOORD->value, $req->fresh()->status);

        // 3. Keuangan Umum approves and buys: DIVERIFIKASI_KOORD -> SEDANG_DIBELANJAKAN
        $step2 = $this->actingAs($keuangan)->postJson("/api/requests/{$requestId}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'nominal_transfer' => 550000,
            'catatan_keuangan' => 'PO diterbitkan ke vendor kertas.',
            'bukti_transfer_path' => 'transfer/test-po.pdf',
        ]);
        $step2->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SEDANG_DIBELANJAKAN->value, $req->fresh()->status);

        // 4. Staf confirms goods receipt: SEDANG_DIBELANJAKAN -> BARANG_DITERIMA
        $step3 = $this->actingAs($staf)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::BARANG_DITERIMA->value,
            'note' => '10 rim kertas telah tiba di Sekretariat D3.',
        ]);
        $step3->assertStatus(200);
        $this->assertEquals(StatusPengajuan::BARANG_DITERIMA->value, $req->fresh()->status);

        // 5. Keuangan Umum closes: BARANG_DITERIMA -> SELESAI (wajib bon diinput)
        // 5a. Coba tutup tanpa bon -> harus 422
        $step4Fail = $this->actingAs($keuangan)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Coba selesaikan tanpa bon.',
        ]);
        $step4Fail->assertStatus(422);

        // 5b. Unggah faktur/bon belanja via endpoint SPJ -> harus 200
        $stepSpj = $this->actingAs($keuangan)->postJson("/api/requests/{$requestId}/spj", [
            'actual_spent' => 550000,
            'receipt_images' => ['/receipts/bon-kertas-baak.jpg'],
            'note' => 'Faktur vendor diunggah.',
        ]);
        $stepSpj->assertStatus(200);

        // 5c. Tutup dengan status SELESAI -> harus 200
        $step4 = $this->actingAs($keuangan)->putJson("/api/requests/{$requestId}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Faktur vendor diverifikasi dan pembayaran selesai.',
        ]);
        $step4->assertStatus(200);
        $this->assertEquals(StatusPengajuan::SELESAI->value, $req->fresh()->status);

        // Verify status_logs
        $logs = StatusLog::where('pengajuan_id', $requestId)->get();
        $this->assertCount(5, $logs); // Created + 4 successful transitions
    }

    public function test_invalid_fsm_transition_rejected_with_422(): void
    {
        $keuUmum = User::where('role', 'Keuangan Umum')->first();

        // Alur B: Keuangan Umum mencoba menutup pengajuan BARANG_DITERIMA tanpa bukti bon -> 422
        $req = ProcurementRequest::create([
            'id' => 'PR-TEST-INV',
            'alur' => 'B',
            'unit_id' => 'PMB',
            'item' => 'Invalid Flow Test',
            'category' => 'Logistik & ATK Unit',
            'applicant' => 'Rizky Ananda',
            'department' => 'Penerimaan Mahasiswa Baru',
            'date' => now()->format('d M Y'),
            'need_by' => now()->addDays(5)->format('Y-m-d'),
            'price' => 100000,
            'status' => StatusPengajuan::BARANG_DITERIMA->value,
        ]);

        $res = $this->actingAs($keuUmum)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::SELESAI->value,
            'note' => 'Langsung selesaikan tanpa review bon.',
        ]);

        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['status']);

        // Verifikasi langsung ke WorkflowService::transition untuk loncatan status tidak valid
        try {
            \App\Services\WorkflowService::transition(
                $req,
                StatusPengajuan::DIAJUKAN->value,
                $keuUmum,
                'Loncatan status tidak valid'
            );
            $this->fail('Seharusnya melempar ValidationException');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertTrue(true);
        }
    }

    public function test_rejection_requires_notes(): void
    {
        $koordLab = User::where('role', 'Koordinator Lab')->first();

        $req = ProcurementRequest::create([
            'id' => 'PR-TEST-REJ',
            'alur' => 'A',
            'item' => 'Rejection Test',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani (Asdos)',
            'department' => 'Lab Perhotelan',
            'date' => now()->format('d M Y'),
            'need_by' => now()->addDays(5)->format('Y-m-d'),
            'price' => 100000,
            'status' => StatusPengajuan::DIAJUKAN->value,
        ]);

        // Rejection without note should fail
        $res = $this->actingAs($koordLab)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::DITOLAK_KOORD->value,
            'note' => '',
        ]);

        $res->assertStatus(422);

        // Rejection with valid note succeeds
        $resSuccess = $this->actingAs($koordLab)->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::DITOLAK_KOORD->value,
            'note' => 'Kuantitas melebihi batas standar per porsi.',
        ]);

        $resSuccess->assertStatus(200);
        $this->assertEquals(StatusPengajuan::DITOLAK_KOORD->value, $req->fresh()->status);
    }
}
