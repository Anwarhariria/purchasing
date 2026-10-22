<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\KatalogBarang;
use App\Models\User;
use App\Models\Unit;
use App\Models\ModelPeramalan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

class KatalogBarangCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $keuanganUmum;
    protected User $stafUnit;
    protected User $koordUnit;
    protected User $asdosKitchen;

    protected function setUp(): void
    {
        parent::setUp();

        Unit::firstOrCreate(['id' => 'PMB'], [
            'name' => 'Penerimaan Mahasiswa Baru',
            'type' => 'Administrasi',
            'created_at' => now(),
        ]);

        $this->superAdmin = User::create([
            'id' => 'USR-SUPER-01',
            'name' => 'Admin Test',
            'email' => 'superadmin.crud@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Super Admin',
            'department' => 'IT',
            'status' => 'Aktif',
        ]);

        $this->keuanganUmum = User::create([
            'id' => 'USR-KEU-01',
            'name' => 'Keuangan Test',
            'email' => 'keuangan.crud@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Keuangan',
            'status' => 'Aktif',
        ]);

        $this->stafUnit = User::create([
            'id' => 'USR-STAF-01',
            'name' => 'Staf Test',
            'email' => 'staf.crud@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Staf Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
            'status' => 'Aktif',
        ]);

        $this->koordUnit = User::create([
            'id' => 'USR-KOORD-01',
            'name' => 'Koordinator Test',
            'email' => 'koord.crud@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
            'status' => 'Aktif',
        ]);

        $this->asdosKitchen = User::create([
            'id' => 'USR-ASDOS-01',
            'name' => 'Asdos Test',
            'email' => 'asdos.crud@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
            'status' => 'Aktif',
        ]);

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
            'id' => 'KAT-002',
            'kode' => 'ATK-MAP-SNEL',
            'nama' => 'Map Snelhechter Plastik Folio',
            'kategori' => 'Kertas & Dokumen',
            'satuan' => 'Pack',
            'harga_acuan' => 65000,
            'stok_tersedia' => 20,
            'aktif' => true,
        ]);
    }

    public function test_super_admin_dan_keuangan_umum_bisa_crud_katalog(): void
    {
        // 1. Super Admin: Tambah barang baru (id harus KAT-003 berikutnya)
        Sanctum::actingAs($this->superAdmin);
        $resStore = $this->postJson('/api/katalog-barang', [
            'nama' => 'Spidol Whiteboard Snowman',
            'satuan' => 'Lusin',
            'harga_acuan' => 75000,
            'kategori' => 'Alat Tulis Kantor',
            'stok_tersedia' => 10,
        ]);

        $resStore->assertStatus(201);
        $dataStore = $resStore->json('data');
        $this->assertEquals('KAT-003', $dataStore['id']);
        $this->assertEquals('Spidol Whiteboard Snowman', $dataStore['nama']);
        $this->assertEquals(75000, $dataStore['harga_acuan']);
        $this->assertTrue($dataStore['aktif']);

        // 2. Keuangan Umum: Ubah harga
        Sanctum::actingAs($this->keuanganUmum);
        $resUpdate = $this->putJson('/api/katalog-barang/KAT-003', [
            'harga_acuan' => 80000,
        ]);
        $resUpdate->assertStatus(200);
        $this->assertEquals(80000, $resUpdate->json('data.harga_acuan'));

        // 3. Keuangan Umum: Nonaktifkan barang
        $resDelete = $this->deleteJson('/api/katalog-barang/KAT-003');
        $resDelete->assertStatus(200);
        $this->assertFalse($resDelete->json('data.aktif'));

        // 4. GET /api/katalog-barang tanpa all=1 -> KAT-003 tidak muncul
        $resIndexNormal = $this->getJson('/api/katalog-barang');
        $resIndexNormal->assertStatus(200);
        $idsNormal = collect($resIndexNormal->json('data'))->pluck('id')->all();
        $this->assertNotContains('KAT-003', $idsNormal);
        $this->assertCount(2, $idsNormal);

        // 5. GET /api/katalog-barang?all=1 -> KAT-003 muncul dengan status nonaktif
        $resIndexAll = $this->getJson('/api/katalog-barang?all=1');
        $resIndexAll->assertStatus(200);
        $itemsAll = collect($resIndexAll->json('data'));
        $kat003 = $itemsAll->firstWhere('id', 'KAT-003');
        $this->assertNotNull($kat003);
        $this->assertFalse($kat003['aktif']);
        $this->assertCount(3, $itemsAll);
    }

    public function test_role_selain_super_admin_dan_keuangan_umum_ditolak_403(): void
    {
        $unauthorizedUsers = [$this->stafUnit, $this->koordUnit, $this->asdosKitchen];

        foreach ($unauthorizedUsers as $user) {
            Sanctum::actingAs($user);

            // Tambah
            $this->postJson('/api/katalog-barang', [
                'nama' => 'Barang Ilegal',
                'satuan' => 'Pcs',
                'harga_acuan' => 10000,
            ])->assertStatus(403);

            // Ubah
            $this->putJson('/api/katalog-barang/KAT-001', [
                'harga_acuan' => 99999,
            ])->assertStatus(403);

            // Nonaktifkan
            $this->deleteJson('/api/katalog-barang/KAT-001')->assertStatus(403);
        }
    }

    public function test_validasi_store_dan_update_katalog(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // 1. Harga acuan 0 ditolak 422
        $resZeroPrice = $this->postJson('/api/katalog-barang', [
            'nama' => 'Buku Catatan',
            'satuan' => 'Buah',
            'harga_acuan' => 0,
        ]);
        $resZeroPrice->assertStatus(422);

        // 2. Harga acuan negatif ditolak 422
        $resNegPrice = $this->postJson('/api/katalog-barang', [
            'nama' => 'Buku Catatan',
            'satuan' => 'Buah',
            'harga_acuan' => -1000,
        ]);
        $resNegPrice->assertStatus(422);

        // 3. Nama kosong ditolak 422
        $resEmptyName = $this->postJson('/api/katalog-barang', [
            'nama' => '',
            'satuan' => 'Buah',
            'harga_acuan' => 10000,
        ]);
        $resEmptyName->assertStatus(422);

        // 4. Kode duplikat pada store ditolak 422
        $resDupStore = $this->postJson('/api/katalog-barang', [
            'nama' => 'Kertas Lain',
            'kode' => 'ATK-HVS-A4', // sama dengan KAT-001
            'satuan' => 'Rim',
            'harga_acuan' => 50000,
        ]);
        $resDupStore->assertStatus(422);

        // 5. Update kode sendiri -> berhasil (200)
        $resOwnCode = $this->putJson('/api/katalog-barang/KAT-001', [
            'kode' => 'ATK-HVS-A4',
        ]);
        $resOwnCode->assertStatus(200);

        // 6. Update kode orang lain (KAT-002 pakai kode KAT-001) ditolak 422
        $resDupUpdate = $this->putJson('/api/katalog-barang/KAT-002', [
            'kode' => 'ATK-HVS-A4',
        ]);
        $resDupUpdate->assertStatus(422);
    }

    public function test_setelah_harga_kat_001_diubah_endpoint_peramalan_menggunakan_harga_baru(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Buat model peramalan aktif
        ModelPeramalan::where('aktif', true)->update(['aktif' => false]);
        ModelPeramalan::create([
            'versi' => 'rf_v_test',
            'varian' => 'residual',
            'parameter' => ['n_estimators' => 10],
            'aktif' => true,
        ]);

        // Mock response AI service
        Http::fake([
            '*/predict' => Http::response([
                'status' => 'success',
                'predictions' => [
                    [
                        'unit_id' => 'PMB',
                        'barang_id' => 'KAT-001',
                        'qty_prediksi' => 10,
                        'qty_baseline' => 8,
                        'qty_snaive' => 9,
                        'tanpa_model' => false,
                    ],
                ],
            ], 200),
        ]);

        // Ubah harga acuan KAT-001 menjadi 60.000 (dari awal 55.000)
        $resUpdate = $this->putJson('/api/katalog-barang/KAT-001', [
            'harga_acuan' => 60000,
        ]);
        $resUpdate->assertStatus(200);
        $this->assertEquals(60000, $resUpdate->json('data.harga_acuan'));

        // Panggil endpoint peramalan predict-alur-b
        $resForecast = $this->postJson('/api/forecasting/predict-alur-b', [
            'unit_id' => 'PMB',
            'target_period' => '2026-11',
            'refresh' => true,
        ]);

        $resForecast->assertStatus(200);
        $preds = collect($resForecast->json('predictions'));
        $itemPred = $preds->firstWhere('barang_id', 'KAT-001');

        $this->assertNotNull($itemPred);
        // harga_satuan = 60.000, estimasi_biaya = 10 x 60.000 = 600.000
        $this->assertEquals(60000, $itemPred['harga_satuan']);
        $this->assertEquals(600000, $itemPred['estimasi_biaya']);
    }
}
