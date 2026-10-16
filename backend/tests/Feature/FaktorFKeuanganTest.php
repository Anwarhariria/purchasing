<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\KasbonPenyelesaian;
use App\Models\User;
use App\Enums\StatusPengajuan;
use Illuminate\Foundation\Testing\RefreshDatabase;

use Laravel\Sanctum\Sanctum;

class FaktorFKeuanganTest extends TestCase
{
    use RefreshDatabase;

    protected User $keuanganKitchen;
    protected User $keuanganUmum;

    protected function setUp(): void
    {
        parent::setUp();

        $this->keuanganKitchen = User::create([
            'id' => 'USR-004-K',
            'name' => 'Ratna Sari (Keuangan Kitchen)',
            'email' => 'keu.kitchen@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Kitchen',
            'department' => 'Bagian Keuangan Praktikum & Kasbon',
            'status' => 'Aktif',
        ]);

        $this->keuanganUmum = User::create([
            'id' => 'USR-004-U',
            'name' => 'Siti Aminah (Keuangan Umum)',
            'email' => 'keu.umum@gmail.com',
            'password' => bcrypt('123'),
            'role' => 'Keuangan Umum',
            'department' => 'Bagian Keuangan Umum',
            'status' => 'Aktif',
        ]);

        Sanctum::actingAs($this->keuanganKitchen);
    }

    protected function createAlurARequest($status = StatusPengajuan::DISETUJUI_KAPRODI->value): ProcurementRequest
    {
        $req = ProcurementRequest::create([
            'id' => 'PR-2026-F01',
            'alur' => 'A',
            'item' => 'Bahan Praktik Kuliner',
            'category' => 'Bahan Praktik Masak',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'price' => 500000,
            'qty' => 15,
            'status' => $status,
            'date' => '2026-10-14',
            'need_by' => '2026-10-20',
        ]);

        RequestDetail::create([
            'request_id' => $req->id,
            'name' => 'Telur Ayam Negeri',
            'qty' => 10,
            'unit' => 'butir',
            'price' => 2500,
            'needed_qty' => 10,
            'stock_in_lab' => 0,
        ]);

        RequestDetail::create([
            'request_id' => $req->id,
            'name' => 'Daging Sapi Gandik',
            'qty' => 5,
            'unit' => 'kg',
            'price' => 95000,
            'needed_qty' => 5,
            'stock_in_lab' => 0,
        ]);

        return $req;
    }

    public function test_keputusan_keuangan_f_1_alur_a_mencairkan_dana(): void
    {
        $req = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 1.0,
                'catatan_keuangan' => 'Disetujui penuh 100% sesuai standar kurikulum.',
                'nominal_transfer' => 500000,
                'bukti_transfer_path' => 'transfer/2026/10/test.pdf',
            ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => StatusPengajuan::DANA_DICAIRKAN->value,
            'faktor_f' => 1.0,
            'nominal_transfer' => 500000,
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Telur Ayam Negeri',
            'qty_final' => 10.0,
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Daging Sapi Gandik',
            'qty_final' => 5.0,
        ]);
    }

    public function test_keputusan_keuangan_f_setengah_dengan_pembulatan(): void
    {
        $req = $this->createAlurARequest();

        // 10 butir x 0.5 = 5.0 butir; 5 kg x 0.5 = 2.5 kg
        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 0.5,
                'catatan_keuangan' => 'Disetujui 50% karena penggabungan sesi kelas.',
                'nominal_transfer' => 250000,
                'bukti_transfer_path' => 'transfer/2026/10/test.pdf',
            ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => StatusPengajuan::DANA_DICAIRKAN->value,
            'faktor_f' => 0.5,
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Telur Ayam Negeri',
            'qty_final' => 5.0,
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Daging Sapi Gandik',
            'qty_final' => 2.5,
        ]);
    }

    public function test_keputusan_keuangan_f_seperempat(): void
    {
        $req = $this->createAlurARequest();

        // 10 butir x 0.25 = 2.5 -> ceil = 3.0 butir; 5 kg x 0.25 = 1.25 kg
        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 0.25,
                'catatan_keuangan' => 'Disetujui 25% uji coba porsi.',
                'nominal_transfer' => 150000,
                'bukti_transfer_path' => 'transfer/2026/10/test.pdf',
            ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => StatusPengajuan::DANA_DICAIRKAN->value,
            'faktor_f' => 0.25,
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Telur Ayam Negeri',
            'qty_final' => 3.0, // ceil(2.5) = 3
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Daging Sapi Gandik',
            'qty_final' => 1.25,
        ]);
    }

    public function test_keputusan_keuangan_f_nol_menolak_pengajuan(): void
    {
        $req = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 0,
                'catatan_keuangan' => 'Ditolak: Kegiatan dialihkan ke metode demonstrasi daring.',
            ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $req->id,
            'status' => StatusPengajuan::DITOLAK_KEUANGAN->value,
            'faktor_f' => 0.0,
            'rejection_reason' => 'Ditolak: Kegiatan dialihkan ke metode demonstrasi daring.',
        ]);

        $this->assertDatabaseHas('request_details', [
            'request_id' => $req->id,
            'name' => 'Telur Ayam Negeri',
            'qty_final' => 0.0,
        ]);
    }

    public function test_nilai_faktor_f_tidak_sah_ditolak_422(): void
    {
        $req = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 0.7, // Tidak sah
                'catatan_keuangan' => 'Mencoba nilai acak',
                'nominal_transfer' => 300000,
            ]);

        $res->assertStatus(422);
    }

    public function test_catatan_keuangan_kosong_ditolak_422(): void
    {
        $req = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 1.0,
                'catatan_keuangan' => '', // Kosong
                'nominal_transfer' => 500000,
            ]);

        $res->assertStatus(422);
    }

    public function test_nominal_transfer_wajib_untuk_f_positif(): void
    {
        $req = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$req->id}/keputusan-keuangan", [
                'faktor_f' => 1.0,
                'catatan_keuangan' => 'Setuju tapi lupa isi nominal',
                // nominal_transfer tidak dikirim
            ]);

        $res->assertStatus(422);
    }

    public function test_akumulasi_carry_over_otomatis_saat_dana_dicairkan(): void
    {
        $asdos = 'Aura Maharani';

        // Buat pengajuan lama yang memiliki carry-over tombok
        $reqLama = ProcurementRequest::create([
            'id' => 'PR-2026-OLD',
            'alur' => 'A',
            'item' => 'Praktikum Lama',
            'applicant' => $asdos,
            'department' => 'Kitchen',
            'date' => '2026-10-10',
            'price' => 300000,
            'status' => StatusPengajuan::SELESAI->value,
            'dana_diterima' => 300000,
            'actual_spent' => 375000,
        ]);

        KasbonPenyelesaian::create([
            'pengajuan_id' => $reqLama->id,
            'jenis' => 'carry_over',
            'nominal' => 75000,
            'kasbon_tujuan_id' => null, // Pending
            'dicatat_oleh' => 'Siti Aminah, S.E.',
            'tanggal' => '2026-10-10',
        ]);

        // Pengajuan baru
        $reqBaru = $this->createAlurARequest();

        $res = $this->postJson("/api/requests/{$reqBaru->id}/keputusan-keuangan", [
                'faktor_f' => 1.0,
                'catatan_keuangan' => 'Dicairkan',
                'nominal_transfer' => 500000,
                'bukti_transfer_path' => 'transfer/2026/10/test.pdf',
            ]);

        $res->assertStatus(200);

        // Dana diterima harus otomatis 500.000 + 75.000 = 575.000
        $this->assertDatabaseHas('requests', [
            'id' => $reqBaru->id,
            'status' => StatusPengajuan::DANA_DICAIRKAN->value,
            'dana_diterima' => 575000,
        ]);

        // Carry-over terikat ke $reqBaru->id
        $this->assertDatabaseHas('kasbon_penyelesaian', [
            'pengajuan_id' => $reqLama->id,
            'kasbon_tujuan_id' => $reqBaru->id,
        ]);
    }

    public function test_keputusan_keuangan_alur_b(): void
    {
        $reqB = ProcurementRequest::create([
            'id' => 'PO-2026-B99',
            'alur' => 'B',
            'item' => 'Kebutuhan ATK BAAK',
            'category' => 'Logistik & ATK Unit',
            'unit_kerja' => 'Biro Administrasi Akademik (BAAK)',
            'applicant' => 'Dewi Sartika',
            'department' => 'Biro Administrasi Akademik (BAAK)',
            'price' => 800000,
            'qty' => 10,
            'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'date' => '2026-10-14',
            'need_by' => '2026-10-20',
        ]);

        RequestDetail::create([
            'request_id' => $reqB->id,
            'name' => 'Kertas HVS A4 80gr PaperOne',
            'qty' => 10,
            'unit' => 'Rim',
            'price' => 55000,
            'needed_qty' => 10,
            'stock_in_lab' => 0,
        ]);

        // f = 1 -> Alur B transisi ke SEDANG_DIBELANJAKAN
        Sanctum::actingAs($this->keuanganUmum);
        $res = $this->postJson("/api/requests/{$reqB->id}/keputusan-keuangan", [
            'faktor_f' => 1.0,
            'catatan_keuangan' => 'ACC pembelian logistik ATK',
            'nominal_transfer' => 550000,
            'bukti_transfer_path' => 'transfer/2026/10/test.pdf',
        ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('requests', [
            'id' => $reqB->id,
            'status' => StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            'faktor_f' => 1.0,
        ]);
    }
}
