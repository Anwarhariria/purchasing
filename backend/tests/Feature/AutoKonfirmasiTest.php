<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\StatusLog;
use App\Models\Notification;
use App\Enums\StatusPengajuan;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AutoKonfirmasiTest extends TestCase
{
    use RefreshDatabase;

    protected User $asdosAura;
    protected User $asdosSiti;
    protected User $stafBaak;
    protected User $keuanganKitchen;
    protected User $keuanganUmum;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asdosAura = User::create([
            'name' => 'Aura Maharani',
            'email' => 'aura@asaindo.ac.id',
            'password' => bcrypt('password'),
            'role' => 'Asdos Kitchen',
            'department' => 'Lab Kitchen & Bar',
        ]);

        $this->asdosSiti = User::create([
            'name' => 'Siti Asdos',
            'email' => 'siti@asaindo.ac.id',
            'password' => bcrypt('password'),
            'role' => 'Asdos Kitchen',
            'department' => 'Lab Kitchen & Bar',
        ]);

        $this->stafBaak = User::create([
            'name' => 'Staf BAAK',
            'email' => 'staf.baak@asaindo.ac.id',
            'password' => bcrypt('password'),
            'role' => 'Staf Unit',
            'unit_id' => 'PMB',
            'department' => 'Penerimaan Mahasiswa Baru',
        ]);

        $this->keuanganKitchen = User::create([
            'name' => 'Bu Siti Keuangan',
            'email' => 'keuangan.kitchen@asaindo.ac.id',
            'password' => bcrypt('password'),
            'role' => 'Keuangan Kitchen',
            'department' => 'Keuangan Kitchen (Praktikum & Kasbon)',
        ]);

        $this->keuanganUmum = User::create([
            'name' => 'Pak Eko Keuangan',
            'email' => 'keuangan.umum@asaindo.ac.id',
            'password' => bcrypt('password'),
            'role' => 'Keuangan Umum',
            'department' => 'Keuangan Umum (ATK & Logistik)',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(); // Reset Carbon mock
        parent::tearDown();
    }

    private function createAlurARequest(string $id = 'PR-AUTO-A01', string $status = 'DANA_DICAIRKAN'): ProcurementRequest
    {
        return ProcurementRequest::create([
            'id' => $id,
            'alur' => 'A',
            'item' => 'Praktikum Nasi Goreng',
            'applicant' => 'Aura Maharani',
            'department' => 'Kitchen',
            'date' => '2026-10-10',
            'price' => 200000,
            'status' => $status,
            'disbursed_amount' => 200000,
            'dana_diterima' => 200000,
        ]);
    }

    private function createAlurBRequest(string $id = 'PR-AUTO-B01', string $status = 'SEDANG_DIBELANJAKAN'): ProcurementRequest
    {
        return ProcurementRequest::create([
            'id' => $id,
            'alur' => 'B',
            'item' => 'Kertas HVS BAAK',
            'applicant' => 'Staf BAAK',
            'department' => 'BAAK',
            'unit_kerja' => 'Biro Administrasi Akademik & Kemahasiswaan (BAAK)',
            'date' => '2026-10-10',
            'price' => 150000,
            'status' => $status,
            'disbursed_amount' => 150000,
            'dana_diterima' => 150000,
        ]);
    }

    public function test_alur_a_kurang_dari_72_jam_tidak_berubah(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurARequest();

        // Log masuk status 71 jam yang lalu
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Dana dicairkan Keuangan.',
            'created_at' => $now->copy()->subHours(71),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::DANA_DICAIRKAN->value, $req->fresh()->status);
        $this->assertEquals(1, StatusLog::where('pengajuan_id', $req->id)->count());
        $this->assertEquals(0, Notification::where('request_id', $req->id)->count());
    }

    public function test_alur_a_tepat_72_jam_atau_lebih_otomatis_ke_barang_diterima(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurARequest();

        // Log masuk status tepat 72 jam yang lalu
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Dana dicairkan Keuangan.',
            'created_at' => $now->copy()->subHours(72),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 1 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $reqFresh = $req->fresh();
        $this->assertEquals(StatusPengajuan::BARANG_DITERIMA->value, $reqFresh->status);

        // Periksa status_log: user_id null dan catatan resmi
        $this->assertDatabaseHas('status_log', [
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DANA_DICAIRKAN->value,
            'ke' => StatusPengajuan::BARANG_DITERIMA->value,
            'user_id' => null,
            'catatan' => 'Konfirmasi otomatis oleh sistem setelah 72 jam (3x24 jam).',
        ]);

        // Periksa notifikasi in-app ke pemohon (Staf / Asdos) dan Keuangan terkait
        $expectedMsg = "Pengajuan {$req->id} dikonfirmasi otomatis sebagai diterima setelah 3×24 jam.";

        $this->assertDatabaseHas('notifications', [
            'request_id' => $req->id,
            'user_id' => $this->asdosAura->id,
            'desc' => $expectedMsg,
        ]);

        $this->assertDatabaseHas('notifications', [
            'request_id' => $req->id,
            'user_id' => $this->keuanganKitchen->id,
            'desc' => $expectedMsg,
        ]);
    }

    public function test_alur_b_kurang_dari_72_jam_tidak_berubah(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurBRequest();

        // 71.5 jam yang lalu
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'ke' => StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            'user_id' => null,
            'catatan' => 'Alokasi belanja disetujui.',
            'created_at' => $now->copy()->subMinutes(71 * 60 + 30),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::SEDANG_DIBELANJAKAN->value, $req->fresh()->status);
    }

    public function test_alur_b_tepat_72_jam_atau_lebih_otomatis_ke_barang_diterima(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurBRequest();

        // 75 jam yang lalu
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
            'ke' => StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            'user_id' => null,
            'catatan' => 'Alokasi belanja disetujui.',
            'created_at' => $now->copy()->subHours(75),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 1 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::BARANG_DITERIMA->value, $req->fresh()->status);

        $expectedMsg = "Pengajuan {$req->id} dikonfirmasi otomatis sebagai diterima setelah 3×24 jam.";
        $this->assertDatabaseHas('notifications', [
            'request_id' => $req->id,
            'user_id' => $this->stafBaak->id,
            'desc' => $expectedMsg,
        ]);
        $this->assertDatabaseHas('notifications', [
            'request_id' => $req->id,
            'user_id' => $this->keuanganUmum->id,
            'desc' => $expectedMsg,
        ]);
    }

    public function test_hitung_dari_entri_terakhir_bukan_pertama_bila_status_berulang(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurARequest();

        // Entri 1 (lama): 100 jam lalu
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Pencairan awal',
            'created_at' => $now->copy()->subHours(100),
        ]);

        // Entri 2 (terakhir): 40 jam lalu (misal revisi / pencairan ulang)
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Pencairan revisi kedua',
            'created_at' => $now->copy()->subHours(40),
        ]);

        // Command dijalankan: harus mengacu ke 40 jam lalu, jadi BELUM boleh auto konfirmasi!
        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::DANA_DICAIRKAN->value, $req->fresh()->status);
    }

    public function test_command_dijalankan_dua_kali_tidak_memproses_ulang(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurARequest();

        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Dana dicairkan.',
            'created_at' => $now->copy()->subHours(75),
        ]);

        // Eksekusi pertama: berhasil diproses
        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 1 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::BARANG_DITERIMA->value, $req->fresh()->status);
        $totalLogsFirstRun = StatusLog::where('pengajuan_id', $req->id)->count();
        $totalNotifsFirstRun = Notification::where('request_id', $req->id)->count();

        // Eksekusi kedua: pengajuan sudah BARANG_DITERIMA, tidak boleh diproses lagi
        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals($totalLogsFirstRun, StatusLog::where('pengajuan_id', $req->id)->count());
        $this->assertEquals($totalNotifsFirstRun, Notification::where('request_id', $req->id)->count());
    }

    public function test_peran_sistem_ditolak_untuk_transisi_selain_auto_konfirmasi(): void
    {
        $req = $this->createAlurARequest('PR-SYS-ERR', StatusPengajuan::DIAJUKAN->value);

        // Sistem mencoba transisi DIAJUKAN -> DIVERIFIKASI_KOORD (Hanya Koordinator Lab yang berhak)
        $this->expectException(ValidationException::class);

        WorkflowService::transition(
            req: $req,
            toStatus: StatusPengajuan::DIVERIFIKASI_KOORD->value,
            user: null,
            catatan: 'Sistem mencoba verifikasi',
            actingRole: 'Sistem'
        );
    }

    public function test_status_lain_tidak_disentuh_scheduler(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        // Pengajuan berstatus DIAJUKAN yang sudah 100 jam tidak boleh disentuh
        $req = $this->createAlurARequest('PR-OLD-DIAJUKAN', StatusPengajuan::DIAJUKAN->value);
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => null,
            'ke' => StatusPengajuan::DIAJUKAN->value,
            'user_id' => null,
            'catatan' => 'Diajukan',
            'created_at' => $now->copy()->subHours(100),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        $this->assertEquals(StatusPengajuan::DIAJUKAN->value, $req->fresh()->status);
    }

    public function test_notifikasi_auto_konfirmasi_hanya_diterima_pemohon_asdos_lain_tidak(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        $req = $this->createAlurARequest('PR-AUTO-USER-01');

        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => StatusPengajuan::DISETUJUI_KAPRODI->value,
            'ke' => StatusPengajuan::DANA_DICAIRKAN->value,
            'user_id' => null,
            'catatan' => 'Dana dicairkan Keuangan.',
            'created_at' => $now->copy()->subHours(75),
        ]);

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 1 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        // 1. Pemohon (Aura) mengakses /api/notifications -> melihat notifikasi ini
        $resAura = $this->actingAs($this->asdosAura)->getJson('/api/notifications');
        $resAura->assertStatus(200);
        $auraNotifs = collect($resAura->json('data'));
        $this->assertTrue(
            $auraNotifs->contains(fn($n) => ($n['requestId'] ?? $n['request_id'] ?? null) === $req->id),
            'Pemohon harus menerima notifikasi auto-konfirmasi pengajuannya.'
        );

        // 2. Asdos lain (Siti) mengakses /api/notifications -> TIDAK melihat notifikasi pengajuan Aura
        $resSiti = $this->actingAs($this->asdosSiti)->getJson('/api/notifications');
        $resSiti->assertStatus(200);
        $sitiNotifs = collect($resSiti->json('data'));
        $this->assertFalse(
            $sitiNotifs->contains(fn($n) => ($n['requestId'] ?? $n['request_id'] ?? null) === $req->id),
            'Asdos lain tidak boleh melihat notifikasi milik pemohon lain.'
        );
    }

    public function test_pengajuan_tanpa_status_log_tidak_diproses(): void
    {
        $now = Carbon::parse('2026-10-14 12:00:00');
        Carbon::setTestNow($now);

        // Buat pengajuan Alur A & B berstatus DANA_DICAIRKAN / SEDANG_DIBELANJAKAN tanpa entri status_log
        $reqA = $this->createAlurARequest('PR-NO-LOG-A01', StatusPengajuan::DANA_DICAIRKAN->value);
        $reqB = $this->createAlurBRequest('PR-NO-LOG-B01', StatusPengajuan::SEDANG_DIBELANJAKAN->value);

        // Pastikan tidak ada status_log untuk kedua pengajuan ini
        $this->assertEquals(0, StatusLog::whereIn('pengajuan_id', [$reqA->id, $reqB->id])->count());

        $this->artisan('pengajuan:auto-konfirmasi')
            ->expectsOutputToContain('Berhasil memproses 0 pengajuan auto-konfirmasi.')
            ->assertSuccessful();

        // Status tidak boleh berubah
        $this->assertEquals(StatusPengajuan::DANA_DICAIRKAN->value, $reqA->fresh()->status);
        $this->assertEquals(StatusPengajuan::SEDANG_DIBELANJAKAN->value, $reqB->fresh()->status);

        // Tetap tidak ada status_log dan notifikasi
        $this->assertEquals(0, StatusLog::whereIn('pengajuan_id', [$reqA->id, $reqB->id])->count());
        $this->assertEquals(0, Notification::whereIn('request_id', [$reqA->id, $reqB->id])->count());
    }
}
