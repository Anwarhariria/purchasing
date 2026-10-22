<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\KatalogBarang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class AlurBHargaInputTest extends TestCase
{
    use RefreshDatabase;

    protected User $userStaf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userStaf = User::create([
            'id' => 'USR-TEST-STAF-01',
            'name' => 'Dewi Sartika',
            'email' => 'staf.sekre.test@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Staf Unit',
            'unit_id' => 'SEKR-S1',
            'department' => 'Sekretariat S1',
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
            'id' => 'KAT-005',
            'kode' => 'TON-HP-85A',
            'nama' => 'Toner Cartridge HP LaserJet 85A (CE285A)',
            'kategori' => 'Tinta & Toner',
            'satuan' => 'Cartridge',
            'harga_acuan' => 385000,
            'stok_tersedia' => 6,
            'aktif' => true,
        ]);
    }

    public function test_alur_b_dengan_kat_005_custom_price_dan_unit(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Toner Custom',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => 'KAT-005',
                    'name' => 'Toner Cartridge HP LaserJet 85A (CE285A)',
                    'qty' => 2,
                    'price' => 400000,
                    'unit' => 'Dus',
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(201);
        $data = $res->json('data');

        $this->assertEquals(800000, $data['price']);
        $this->assertEquals(2, $data['qty']);

        $this->assertDatabaseHas('request_details', [
            'code_id' => 'KAT-005',
            'qty' => 2,
            'price' => 400000,
            'unit' => 'Dus',
        ]);
    }

    public function test_alur_b_dengan_kat_001_tanpa_price_fallback_ke_katalog(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Kertas HVS',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => 'KAT-001',
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 3,
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(201);
        $data = $res->json('data');

        // Harga pengajuan = 3 x 55.000 = 165.000
        $this->assertEquals(165000, $data['price']);
        $this->assertEquals(3, $data['qty']);

        $this->assertDatabaseHas('request_details', [
            'code_id' => 'KAT-001',
            'qty' => 3,
            'price' => 55000,
            'unit' => 'Rim',
        ]);
    }

    public function test_alur_b_barang_di_luar_katalog_berhasil_dengan_code_id_null(): void
    {
        $payload = [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Pengadaan Baterai',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => null,
                    'name' => 'Baterai AA',
                    'qty' => 4,
                    'unit' => 'Pack',
                    'price' => 25000,
                ],
            ],
        ];

        $res = $this->postJson('/api/requests', $payload);

        $res->assertStatus(201);
        $data = $res->json('data');

        $this->assertEquals(100000, $data['price']);
        $this->assertEquals(4, $data['qty']);

        $this->assertDatabaseHas('request_details', [
            'name' => 'Baterai AA',
            'code_id' => null,
            'qty' => 4,
            'unit' => 'Pack',
            'price' => 25000,
        ]);
    }

    public function test_validasi_error_price_negatif_qty_nol_dan_custom_tanpa_harga(): void
    {
        // 1. price -1 -> 422
        $resNegativePrice = $this->postJson('/api/requests', [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Test Harga Negatif',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => 'KAT-001',
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 1,
                    'unit' => 'Rim',
                    'price' => -1,
                ],
            ],
        ]);
        $resNegativePrice->assertStatus(422);

        // 2. qty 0 -> 422
        $resZeroQty = $this->postJson('/api/requests', [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Test Qty Nol',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => 'KAT-001',
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 0,
                    'unit' => 'Rim',
                    'price' => 55000,
                ],
            ],
        ]);
        $resZeroQty->assertStatus(422);

        // 3. barang di luar katalog tanpa harga -> 422
        $resNoPriceCustom = $this->postJson('/api/requests', [
            'alur' => 'B',
            'category' => 'Logistik & ATK Unit',
            'item' => 'Test Custom Tanpa Harga',
            'unit_kerja' => 'Sekretariat S1',
            'applicant' => 'Dewi Sartika',
            'need_by' => now()->toDateString(),
            'details' => [
                [
                    'code_id' => null,
                    'name' => 'Barang Khusus Luar Katalog',
                    'qty' => 2,
                    'unit' => 'Unit',
                    // price omitted
                ],
            ],
        ]);
        $resNoPriceCustom->assertStatus(422);
    }
}
