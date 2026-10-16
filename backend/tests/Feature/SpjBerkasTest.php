<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Enums\StatusPengajuan;

class SpjBerkasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_submit_spj_with_multipart_receipts_saved_to_local_disk(): void
    {
        $asdos = User::firstOrCreate(
            ['email' => 'asdos.spj@gmail.com'],
            [
                'id' => 'USR-ASDOS-SPJ',
                'name' => 'Aura Asdos Test',
                'password' => bcrypt('123'),
                'role' => 'Asdos Kitchen',
                'department' => 'Kitchen',
                'status' => 'Aktif',
            ]
        );

        $req = ProcurementRequest::create([
            'id' => 'REQ-SPJ-001',
            'item' => 'Bahan Praktik Kitchen',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Asdos Test',
            'pemohon_id' => (string)$asdos->id,
            'department' => 'Dapur Kuliner',
            'date' => now()->format('Y-m-d'),
            'need_by' => now()->addDays(3)->format('Y-m-d'),
            'purpose' => 'Praktikum Perkuliahan',
            'alur' => 'A',
            'status' => StatusPengajuan::BARANG_DITERIMA->value,
            'price' => 500000,
            'qty' => 5,
            'disbursed_amount' => 500000,
            'dana_diterima' => 500000,
        ]);

        Sanctum::actingAs($asdos);

        $file1 = UploadedFile::fake()->create('nota1.jpg', 200, 'image/jpeg');
        $file2 = UploadedFile::fake()->create('nota2.pdf', 200, 'application/pdf');

        $response = $this->postJson("/api/requests/{$req->id}/spj", [
            'actual_spent' => 480000,
            'receipts' => [$file1, $file2],
            'note' => 'Nota belanja riil.',
        ]);

        $response->assertStatus(200);
        $body = $response->json();
        $this->assertEquals('success', $body['status']);

        $req->refresh();
        $this->assertEquals(StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value, $req->status);
        $this->assertCount(2, $req->receipt_images);

        $Y = now()->format('Y');
        $m = now()->format('m');
        $this->assertStringContainsString("bon/{$Y}/{$m}/{$req->id}/", $req->receipt_images[0]);
        $this->assertTrue(Storage::disk('local')->exists($req->receipt_images[0]));
        $this->assertTrue(Storage::disk('local')->exists($req->receipt_images[1]));

        // Test download berkas by index 0 (as applicant)
        $dlResponse = $this->get("/api/requests/{$req->id}/berkas/0");
        $dlResponse->assertStatus(200);

        // Test download berkas by filename
        $filename = basename($req->receipt_images[1]);
        $dlPdfResponse = $this->get("/api/requests/{$req->id}/berkas/{$filename}");
        $dlPdfResponse->assertStatus(200);
    }

    public function test_download_berkas_forbidden_for_unauthorized_user(): void
    {
        $req = ProcurementRequest::create([
            'id' => 'REQ-SPJ-002',
            'item' => 'Bahan Praktik Kitchen',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Asdos Test',
            'department' => 'Dapur Kuliner',
            'date' => now()->format('Y-m-d'),
            'need_by' => now()->addDays(3)->format('Y-m-d'),
            'purpose' => 'Praktikum Perkuliahan',
            'alur' => 'A',
            'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
            'price' => 500000,
            'qty' => 5,
            'receipt_images' => ['bon/2026/10/REQ-SPJ-002/nota.jpg'],
        ]);

        Storage::disk('local')->put('bon/2026/10/REQ-SPJ-002/nota.jpg', 'fake-image-binary-data');

        // User dari unit lain / staf unit B
        $stafB = User::firstOrCreate(
            ['email' => 'staf.unit.other@gmail.com'],
            [
                'id' => 'USR-STAF-OTH',
                'name' => 'Staf Other',
                'password' => bcrypt('123'),
                'role' => 'Staf Unit',
                'department' => 'PMB',
                'unit_id' => 'PMB',
                'status' => 'Aktif',
            ]
        );

        Sanctum::actingAs($stafB);

        $response = $this->getJson("/api/requests/{$req->id}/berkas/0");
        $response->assertStatus(403);
    }
}
