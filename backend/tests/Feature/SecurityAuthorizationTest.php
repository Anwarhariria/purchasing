<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Unit;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed standard units
        Unit::firstOrCreate(['id' => 'PMB'], ['nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB']);
        Unit::firstOrCreate(['id' => 'SEKR-D3'], ['nama' => 'Sekretariat D3 Perhotelan', 'kode' => 'SEKR-D3']);
        Unit::firstOrCreate(['id' => 'PERPUS'], ['nama' => 'Perpustakaan', 'kode' => 'PERPUS']);
    }

    public function test_request_tanpa_token_mengembalikan_401(): void
    {
        $response = $this->getJson('/api/requests');
        $response->assertStatus(401);

        $responsePost = $this->postJson('/api/requests', []);
        $responsePost->assertStatus(401);

        $responseForecast = $this->getJson('/api/forecasting/model-info');
        $responseForecast->assertStatus(401);
    }

    public function test_request_tanpa_token_dan_tanpa_header_accept_mengembalikan_401(): void
    {
        $response = $this->get('/api/requests');
        $response->assertStatus(401);
        $response->assertJson([
            'status' => 'error',
            'message' => 'Unauthenticated.',
        ]);
    }

    public function test_header_x_user_id_dan_x_user_role_diabaikan_tanpa_token(): void
    {
        $response = $this->withHeaders([
            'X-User-Id' => 'USR-001',
            'X-User-Role' => 'Super Admin',
        ])->getJson('/api/requests');

        $response->assertStatus(401);
    }

    public function test_asdos_memanggil_keputusan_keuangan_ditolak_403(): void
    {
        $asdos = User::create([
            'id' => 'USR-TEST-ASDOS',
            'name' => 'Aura Maharani',
            'email' => 'aura.test@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
            'status' => 'Aktif',
        ]);

        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-001',
            'alur' => 'A',
            'item' => 'Bahan Masak',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 200000,
            'qty' => 5,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'date' => '2026-10-14',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($asdos);

        $response = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'Ilegal decision',
            'nominal_transfer' => 200000,
        ]);

        $response->assertStatus(403);
    }

    public function test_koordinator_pmb_meminta_ramalan_unit_lain_ditolak_403(): void
    {
        $koordPmb = User::create([
            'id' => 'USR-TEST-PMB',
            'name' => 'Koordinator PMB',
            'email' => 'pmb.koord@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($koordPmb);

        // PMB koordinator tries to request forecast for SEKR-D3
        $response = $this->postJson('/api/forecasting/predict-alur-b', [
            'target_period' => '2026-11',
            'unit_id' => 'SEKR-D3',
        ]);

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'Akses ditolak. Anda hanya berhak mengakses peramalan untuk unit Anda (PMB).',
        ]);
    }

    public function test_non_super_admin_memanggil_train_alur_b_ditolak_403(): void
    {
        $keuangan = User::create([
            'id' => 'USR-TEST-KEU',
            'name' => 'Keuangan Staff',
            'email' => 'keuangan.staff@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($keuangan);

        $response = $this->postJson('/api/forecasting/train-alur-b');
        $response->assertStatus(403);
        $response->assertJsonFragment([
            'message' => 'Hanya Super Admin yang berhak memicu pelatihan ulang model peramalan.',
        ]);
    }

    public function test_post_auth_quick_login_mengembalikan_404(): void
    {
        $response = $this->postJson('/api/auth/quick-login', [
            'role' => 'Super Admin',
        ]);

        $response->assertStatus(404);
    }

    public function test_non_super_admin_membuat_user_ditolak_403(): void
    {
        $keuangan = User::create([
            'id' => 'USR-TEST-KEU2',
            'name' => 'Keuangan Staff',
            'email' => 'keuangan2@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($keuangan);

        $response = $this->postJson('/api/users', [
            'name' => 'Hacker User',
            'email' => 'hacker@gmail.com',
            'password' => 'secret',
            'role' => 'Super Admin',
        ]);

        $response->assertStatus(403);
    }

    // ==========================================
    // 6 TES KEAMANAN & OTORISASI BARU TAHAP 7:
    // ==========================================

    /**
     * 1. Asdos mencoba PUT status (ditolak 403 saat DIAJUKAN, atau field status diabaikan dan status tidak berubah)
     */
    public function test_asdos_put_status_ditolak_atau_diabaikan_dan_status_tidak_berubah(): void
    {
        $asdos = User::create([
            'id' => 'USR-ASDOS-1',
            'name' => 'Aura Pemohon',
            'email' => 'aura.pemohon@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
        ]);

        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-PUT01',
            'alur' => 'A',
            'item' => 'Bahan Steak',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Pemohon',
            'department' => 'Kitchen',
            'price' => 150000,
            'qty' => 3,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($asdos);

        // a) Asdos PUT saat status DIAJUKAN -> 403 Forbidden (hanya Koordinator yang boleh edit saat DIAJUKAN)
        $resDiajukan = $this->putJson("/api/requests/{$req->id}", [
            'status' => StatusPengajuan::SELESAI->value,
            'item' => 'Manipulated Item',
        ]);
        $resDiajukan->assertStatus(403);
        $this->assertEquals(StatusPengajuan::DIAJUKAN->value, $req->fresh()->status);

        // b) Saat status DITOLAK_KOORD, Asdos berhak merevisi itemnya, tapi field "status" HARUS diabaikan!
        $req->update(['status' => StatusPengajuan::DITOLAK_KOORD->value]);

        $resRevisi = $this->putJson("/api/requests/{$req->id}", [
            'status' => StatusPengajuan::SELESAI->value,
            'purpose' => 'Revisi catatan kebutuhan',
        ]);
        $resRevisi->assertStatus(200);

        // Status TETAP DITOLAK_KOORD (tidak berubah menjadi SELESAI lewat PUT /requests/{id})
        $this->assertEquals(StatusPengajuan::DITOLAK_KOORD->value, $req->fresh()->status);
    }

    /**
     * 2. Asdos A membuka GET /requests/{id} milik Asdos B ditolak 403
     */
    public function test_asdos_a_membuka_detail_pengajuan_milik_asdos_b_ditolak_403(): void
    {
        $asdosA = User::create([
            'id' => 'USR-ASDOS-A',
            'name' => 'Asdos A (Aura)',
            'email' => 'asdos.a@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
        ]);

        $asdosB = User::create([
            'id' => 'USR-ASDOS-B',
            'name' => 'Asdos B (Bima)',
            'email' => 'asdos.b@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
        ]);

        $reqB = ProcurementRequest::create([
            'id' => 'PR-SEC-ASDOS-B',
            'alur' => 'A',
            'item' => 'Bahan Bima',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Asdos B (Bima)',
            'department' => 'Kitchen',
            'price' => 100000,
            'qty' => 2,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($asdosA);

        $res = $this->getJson("/api/requests/{$reqB->id}");
        $res->assertStatus(403);
    }

    /**
     * 3. Koordinator PMB membuka detail pengajuan Sekretariat D3 ditolak 403
     */
    public function test_koordinator_pmb_membuka_detail_sekretariat_d3_ditolak_403(): void
    {
        $koordPmb = User::create([
            'id' => 'USR-KOORD-PMB',
            'name' => 'Koordinator PMB',
            'email' => 'pmb.head@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
        ]);

        $reqSekr = ProcurementRequest::create([
            'id' => 'PR-SEC-D3-01',
            'alur' => 'B',
            'unit_id' => 'SEKR-D3',
            'unit_kerja' => 'Sekretariat D3 Perhotelan',
            'department' => 'Sekretariat D3 Perhotelan',
            'item' => 'Kertas Kop D3',
            'category' => 'Logistik & ATK Unit',
            'applicant' => 'Staf Sekre D3',
            'price' => 250000,
            'qty' => 5,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-25',
        ]);

        Sanctum::actingAs($koordPmb);

        $res = $this->getJson("/api/requests/{$reqSekr->id}");
        $res->assertStatus(403);
    }

    /**
     * 4. Keuangan Umum memutuskan pengajuan Alur A ditolak 403
     */
    public function test_keuangan_umum_memutuskan_pengajuan_alur_a_ditolak_403(): void
    {
        $keuanganUmum = User::create([
            'id' => 'USR-KEU-UMUM',
            'name' => 'Siti Keuangan Umum',
            'email' => 'keu.umum.auth@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
        ]);

        $reqAlurA = ProcurementRequest::create([
            'id' => 'PR-SEC-ALUR-A',
            'alur' => 'A',
            'item' => 'Ikan Salmon Praktik',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 600000,
            'qty' => 3,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($keuanganUmum);

        $res = $this->postJson("/api/requests/{$reqAlurA->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'Keuangan umum mencoba memutuskan Alur A',
            'nominal_transfer' => 600000,
        ]);

        $res->assertStatus(403);
    }

    /**
     * 5. Super Admin memutuskan keuangan ditolak 403
     */
    public function test_super_admin_memutuskan_keuangan_ditolak_403(): void
    {
        $admin = User::create([
            'id' => 'USR-SUPER-ADMIN-SEC',
            'name' => 'Super Administrator',
            'email' => 'admin.sec@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Super Admin',
            'department' => 'IT System',
        ]);

        $reqAlurA = ProcurementRequest::create([
            'id' => 'PR-SEC-SUPER-KEU',
            'alur' => 'A',
            'item' => 'Daging Sapi Praktik',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 500000,
            'qty' => 5,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($admin);

        // Super Admin calls keputusan-keuangan
        $res = $this->postJson("/api/requests/{$reqAlurA->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'Admin mencoba acc keuangan',
            'nominal_transfer' => 500000,
        ]);

        $res->assertStatus(403);

        // disburse endpoint has been removed -> 404
        $resDisburse = $this->postJson("/api/requests/{$reqAlurA->id}/disburse", [
            'nominal' => 500000,
        ]);
        $resDisburse->assertStatus(404);
    }

    /**
     * 6. Koordinator edit qty saat status DIVERIFIKASI_KOORD ditolak 403
     */
    public function test_koordinator_edit_qty_saat_status_diverifikasi_koord_ditolak_403(): void
    {
        $koordLab = User::create([
            'id' => 'USR-KOORD-LAB-SEC',
            'name' => 'Chef Koordinator Lab',
            'email' => 'chef.lab@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Koordinator Lab',
            'department' => 'Kitchen',
        ]);

        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-KOORD-EDIT',
            'alur' => 'A',
            'item' => 'Bahan Praktik Dessert',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 300000,
            'qty' => 6,
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value, // status sudah diverifikasi!
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        RequestDetail::create([
            'code_id' => 'D-01',
            'request_id' => $req->id,
            'name' => 'Whipping Cream',
            'qty' => 6,
            'needed_qty' => 6,
            'stock_in_lab' => 0,
            'unit' => 'liter',
            'price' => 50000,
        ]);

        Sanctum::actingAs($koordLab);

        // Koordinator mencoba mengedit qty saat status DIVERIFIKASI_KOORD
        $res = $this->putJson("/api/requests/{$req->id}", [
            'details' => [
                [
                    'name' => 'Whipping Cream',
                    'qty' => 10,
                ],
            ],
        ]);

        $res->assertStatus(403);
    }

    public function test_login_rate_limiter_returns_429_with_custom_message(): void
    {
        $payload = [
            'email' => 'spam.test@gmail.com',
            'password' => 'wrongpass',
        ];

        // 5 percobaan login gagal pertama (401)
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/api/login', $payload);
            $res->assertStatus(401);
        }

        // Percobaan ke-6 harus diblokir rate limiter dengan 429 dan pesan khusus
        $resThrottled = $this->postJson('/api/login', $payload);
        $resThrottled->assertStatus(429);
        $resThrottled->assertJsonFragment([
            'status' => 'error',
            'message' => 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
        ]);
    }

    /**
     * 7. Super Admin tidak boleh melakukan transisi workflow (Policy::transition -> 403)
     */
    public function test_super_admin_cannot_transition_workflow_status(): void
    {
        $admin = User::create([
            'id' => 'USR-SUPER-ADMIN-WF',
            'name' => 'Super Administrator WF',
            'email' => 'admin.wf@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Super Admin',
            'department' => 'IT System',
        ]);

        $req = ProcurementRequest::create([
            'id' => 'PR-SEC-ADMIN-WF',
            'alur' => 'A',
            'item' => 'Nasi Uduk Praktik',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 300000,
            'qty' => 5,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($admin);

        // Super Admin mencoba transisi dari DIAJUKAN ke DIVERIFIKASI_KOORD via PUT/PATCH status
        $res = $this->putJson("/api/requests/{$req->id}/status", [
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'note' => 'Admin mencoba memverifikasi',
        ]);

        $res->assertStatus(403);
    }

    /**
     * 8. Pemohon lain dengan nama depan yang sama tidak bisa melihat pengajuan milik pemohon lain (scoping pemohon_id)
     */
    public function test_pemohon_scope_uses_pemohon_id_not_like_first_name(): void
    {
        $aura1 = User::create([
            'id' => 'USR-AURA-1',
            'name' => 'Aura Kasih (Asdos Kitchen)',
            'email' => 'aura1@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
        ]);

        $aura2 = User::create([
            'id' => 'USR-AURA-2',
            'name' => 'Aura Maharani (Asdos Kitchen)',
            'email' => 'aura2@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Asdos Kitchen',
            'department' => 'Kitchen',
        ]);

        $req1 = ProcurementRequest::create([
            'id' => 'PR-AURA-01',
            'alur' => 'A',
            'item' => 'Barang Aura Satu',
            'category' => 'Bahan Praktik Masak',
            'applicant' => $aura1->name,
            'pemohon_id' => (string)$aura1->id,
            'department' => 'Kitchen',
            'price' => 200000,
            'qty' => 2,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        // Login sebagai Aura 2
        Sanctum::actingAs($aura2);

        $res = $this->getJson('/api/requests');
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertNotContains('PR-AURA-01', $ids, 'Pengajuan Aura 1 tidak boleh muncul di daftar Aura 2.');
    }

    /**
     * 9. keputusan-keuangan dengan faktor_f tidak sah (mis. 0.7) memvalidasi faktor_f dulu (bukan bukti transfer wajib)
     */
    public function test_keputusan_keuangan_validates_faktor_f_first(): void
    {
        $keuangan = User::create([
            'id' => 'USR-KEU-F-VAL',
            'name' => 'Keuangan Kitchen Val',
            'email' => 'keu.kitchen.val@asaindo.ac.id',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Kitchen',
            'department' => 'Kitchen',
        ]);

        $req = ProcurementRequest::create([
            'id' => 'PR-VAL-F-01',
            'alur' => 'A',
            'item' => 'Bahan Steak Fine Dining',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 500000,
            'qty' => 5,
            'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'date' => '2026-10-15',
            'need_by' => '2026-10-20',
        ]);

        Sanctum::actingAs($keuangan);

        // Kirim faktor_f tidak sah (0.7) tanpa menyertakan bukti transfer
        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
            'faktor_f' => 0.7,
            'catatan_keuangan' => 'Catatan tes validasi f',
            'nominal_transfer' => 350000,
        ]);

        $res->assertStatus(422);
        // Memastikan pesan error adalah mengenai faktor_f, bukan bukti transfer wajib
        $this->assertStringContainsString('faktor f tidak valid', $res->json('message'));
        $this->assertArrayHasKey('faktor_f', $res->json('errors'));
    }
}
