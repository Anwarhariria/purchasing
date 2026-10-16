<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\KatalogBarang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use Laravel\Sanctum\Sanctum;

class AlurBKatalogTest extends TestCase
{
    use RefreshDatabase;

    protected User $userStaf;
    protected User $userKeuangan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userStaf = User::create([
            'id' => 'USR-TEST-STAF',
            'name' => 'Dewi Sartika',
            'email' => 'dewi@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Staf Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
            'status' => 'Aktif',
        ]);

        $this->userKeuangan = User::create([
            'id' => 'USR-TEST-KEU',
            'name' => 'Keuangan Umum Test',
            'email' => 'keu.umum.test@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($this->userStaf);

        KatalogBarang::create([
            'id' => 'KAT-001',
            'kode' => 'ATK-HVS-A4',
            'nama' => 'Kertas HVS A4 80gr PaperOne',
            'kategori' => 'Kertas & Dokumen',
            'satuan' => 'Rim',
            'harga_acuan' => 55000,
            'stok_tersedia' => 50,
            'aktif' => true,
        ]);

        KatalogBarang::create([
            'id' => 'KAT-099',
            'kode' => 'ATK-DISCONTINUED',
            'nama' => 'Barang Nonaktif Lama',
            'kategori' => 'Kertas & Dokumen',
            'satuan' => 'Rim',
            'harga_acuan' => 20000,
            'stok_tersedia' => 0,
            'aktif' => false, // Nonaktif
        ]);
    }

    public function test_alur_b_berhasil_dan_mengambil_harga_dari_katalog(): void
    {
        // Client sengaja mengirim price 0 atau salah, backend harus mengambil harga_acuan 55.000 dari katalog
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Kertas HVS',
            'unit_kerja' => 'Biro Administrasi Akademik (BAAK)',
            'applicant' => 'Dewi Sartika',
            'need_by' => '2026-10-25',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 10,
                    'price' => 1000, // Diabaikan backend
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(201);
        $data = $res->json('data');

        // Harga pengajuan = 10 x 55.000 = 550.000
        $this->assertEquals(550000, $data['price']);
        $this->assertEquals(10, $data['qty']);

        $this->assertDatabaseHas('request_details', [
            'name' => 'Kertas HVS A4 80gr PaperOne',
            'qty' => 10,
            'price' => 55000,
        ]);
    }

    public function test_alur_b_estimasi_biaya_tidak_pernah_menolak_pengajuan_besar(): void
    {
        // Meskipun kuantitas sangat banyak dan estimasi biaya sangat besar, sistem TIDAK boleh menolak
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Kertas HVS Skala Kampus',
            'unit_kerja' => 'Penerimaan Mahasiswa Baru',
            'applicant' => 'Budi Staf PMB',
            'need_by' => '2026-10-25',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 2000, // Total = 110.000.000 (tidak ada batas pagu)
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(201);
        $this->assertEquals(110000000, $res->json('data.price'));
    }

    public function test_alur_b_menolak_barang_tidak_ada_di_katalog(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Barang Sembarangan',
            'unit_kerja' => 'Biro Administrasi Akademik (BAAK)',
            'applicant' => 'Dewi Sartika',
            'need_by' => '2026-10-25',
            'details' => [
                [
                    'name' => 'Barang Siluman Tidak Ada di Katalog',
                    'qty' => 5,
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(422);
        $res->assertJsonFragment([
            'status' => 'error',
        ]);
    }

    public function test_alur_b_menolak_barang_yang_sudah_nonaktif(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Barang Nonaktif',
            'unit_kerja' => 'Biro Administrasi Akademik (BAAK)',
            'applicant' => 'Dewi Sartika',
            'need_by' => '2026-10-25',
            'details' => [
                [
                    'name' => 'Barang Nonaktif Lama',
                    'qty' => 5,
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(422);
    }

    public function test_uc24_hak_akses_kelola_katalog_barang(): void
    {
        // 1. Staf pemohon tidak boleh menambah item baru ke katalog (403)
        Sanctum::actingAs($this->userStaf);
        $resStaf = $this->postJson('/api/katalog-barang', [
            'nama' => 'Spidol Emas',
            'satuan' => 'Pcs',
            'harga_acuan' => 25000,
        ]);
        $resStaf->assertStatus(403);

        // 2. Keuangan berhak menambah item baru (201)
        Sanctum::actingAs($this->userKeuangan);
        $resKeuangan = $this->postJson('/api/katalog-barang', [
            'nama' => 'Spidol Emas',
            'satuan' => 'Pcs',
            'harga_acuan' => 25000,
        ]);
        $resKeuangan->assertStatus(201);
        $this->assertDatabaseHas('katalog_barang', ['nama' => 'Spidol Emas']);

        // 3. Keuangan berhak menonaktifkan item
        $itemId = $resKeuangan->json('data.id');
        $resDel = $this->deleteJson("/api/katalog-barang/{$itemId}");
        $resDel->assertStatus(200);
        $this->assertDatabaseHas('katalog_barang', ['id' => $itemId, 'aktif' => false]);
    }

    public function test_alur_b_store_request_details_mempunyai_code_id_berawalan_kat(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Kertas HVS Alur B',
            'unit_kerja' => 'Biro Administrasi Akademik (BAAK)',
            'need_by' => '2026-10-25',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 5,
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);
        $res->assertStatus(201);

        $requestId = $res->json('data.id');
        $detail = \App\Models\RequestDetail::where('request_id', $requestId)->first();

        $this->assertNotNull($detail);
        $this->assertEquals('KAT-001', $detail->code_id);
        $this->assertStringStartsWith('KAT-', $detail->code_id);
    }
}
