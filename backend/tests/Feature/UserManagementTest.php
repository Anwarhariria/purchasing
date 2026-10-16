<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Unit;
use Laravel\Sanctum\Sanctum;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Pastikan unit tersedia di DB test
        Unit::firstOrCreate(['id' => 'PERPUS'], ['nama' => 'Perpustakaan', 'kode' => 'PERPUS']);
        Unit::firstOrCreate(['id' => 'PMB'], ['nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB']);

        $this->superAdmin = User::firstOrCreate(
            ['email' => 'admin.test@spake.ac.id'],
            [
                'code_id' => 'USR-ADM-01',
                'name' => 'Super Admin Test',
                'password' => bcrypt('password123'),
                'role' => 'Super Admin',
                'department' => 'Pusat Kendali Sistem',
                'status' => 'Aktif',
            ]
        );

        $this->regularUser = User::firstOrCreate(
            ['email' => 'asdos.test@spake.ac.id'],
            [
                'code_id' => 'USR-ASD-01',
                'name' => 'Asdos Kitchen Test',
                'password' => bcrypt('password123'),
                'role' => 'Asdos Kitchen',
                'department' => 'Laboratorium Dapur & Restoran Perhotelan',
                'status' => 'Aktif',
            ]
        );
    }

    public function test_non_super_admin_cannot_store_or_update_user(): void
    {
        Sanctum::actingAs($this->regularUser);

        $respCreate = $this->postJson('/api/users', [
            'name' => 'Hacker Staf',
            'email' => 'hacker@spake.ac.id',
            'password' => 'secret123',
            'role' => 'Staf Unit',
            'unit_id' => 'PMB',
        ]);
        $respCreate->assertStatus(403);

        $respUpdate = $this->putJson('/api/users/' . $this->regularUser->id, [
            'name' => 'Attempted Change',
        ]);
        $respUpdate->assertStatus(403);
    }

    public function test_store_user_validates_eight_srs_roles(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Role tidak valid (misal peran legacy 'Staf / Asdos' atau 'Koordinator')
        $respInvalid = $this->postJson('/api/users', [
            'name' => 'Invalid Role User',
            'email' => 'invalid.role@spake.ac.id',
            'password' => 'password123',
            'role' => 'Staf / Asdos',
            'unit_id' => 'PMB',
        ]);
        $respInvalid->assertStatus(422);
        $respInvalid->assertJsonValidationErrors(['role']);

        // Role valid dari 8 peran SRS
        $respValid = $this->postJson('/api/users', [
            'name' => 'Kaprodi Baru',
            'email' => 'kaprodi.baru@spake.ac.id',
            'password' => 'password123',
            'role' => 'Kaprodi',
            'department' => 'Program Studi D3 Perhotelan',
        ]);
        $respValid->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'kaprodi.baru@spake.ac.id', 'role' => 'Kaprodi']);
    }

    public function test_staf_unit_and_koordinator_unit_require_unit_id(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Staf Unit tanpa unit_id
        $respStaf = $this->postJson('/api/users', [
            'name' => 'Staf Tanpa Unit',
            'email' => 'staf.nounit@spake.ac.id',
            'password' => 'password123',
            'role' => 'Staf Unit',
        ]);
        $respStaf->assertStatus(422);
        $respStaf->assertJsonValidationErrors(['unit_id']);

        // Koordinator Unit tanpa unit_id
        $respKoord = $this->postJson('/api/users', [
            'name' => 'Koordinator Tanpa Unit',
            'email' => 'koord.nounit@spake.ac.id',
            'password' => 'password123',
            'role' => 'Koordinator Unit',
        ]);
        $respKoord->assertStatus(422);
        $respKoord->assertJsonValidationErrors(['unit_id']);
    }

    public function test_reject_second_koordinator_unit_in_same_unit(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Buat Koordinator Unit pertama di PERPUS
        $first = $this->postJson('/api/users', [
            'name' => 'Koordinator PERPUS 1',
            'email' => 'koord1.perpus@spake.ac.id',
            'password' => 'password123',
            'role' => 'Koordinator Unit',
            'unit_id' => 'PERPUS',
        ]);
        $first->assertStatus(201);

        // Coba buat Koordinator Unit kedua di unit PERPUS yang sama -> Wajib ditolak 422
        $second = $this->postJson('/api/users', [
            'name' => 'Koordinator PERPUS 2',
            'email' => 'koord2.perpus@spake.ac.id',
            'password' => 'password123',
            'role' => 'Koordinator Unit',
            'unit_id' => 'PERPUS',
        ]);
        $second->assertStatus(422);
        $second->assertJsonFragment([
            'status' => 'error',
            'message' => 'Unit ini sudah memiliki Koordinator Unit aktif. Hanya diperbolehkan satu Koordinator per unit kerja.',
        ]);

        // Namun Koordinator Unit untuk unit PMB (unit berbeda) diperbolehkan
        $pmbKoord = $this->postJson('/api/users', [
            'name' => 'Koordinator PMB',
            'email' => 'koord.pmb@spake.ac.id',
            'password' => 'password123',
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
        ]);
        $pmbKoord->assertStatus(201);
    }

    public function test_update_user_validations_and_koordinator_unit_uniqueness(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Buat satu Koordinator PERPUS
        $existingKoord = User::create([
            'code_id' => 'USR-PERPUS-01',
            'name' => 'Koord PERPUS Eksis',
            'email' => 'koord.eksis@spake.ac.id',
            'password' => bcrypt('password123'),
            'role' => 'Koordinator Unit',
            'unit_id' => 'PERPUS',
            'department' => 'Perpustakaan',
            'status' => 'Aktif',
        ]);

        // Buat Staf di PERPUS
        $staf = User::create([
            'code_id' => 'USR-STAF-01',
            'name' => 'Staf PERPUS',
            'email' => 'staf.perpus@spake.ac.id',
            'password' => bcrypt('password123'),
            'role' => 'Staf Unit',
            'unit_id' => 'PERPUS',
            'department' => 'Perpustakaan',
            'status' => 'Aktif',
        ]);

        // Coba perbarui Staf menjadi Koordinator Unit di PERPUS -> Konflik dengan existing Koordinator PERPUS (422)
        $respConflict = $this->putJson('/api/users/' . $staf->code_id, [
            'role' => 'Koordinator Unit',
            'unit_id' => 'PERPUS',
        ]);
        $respConflict->assertStatus(422);

        // Koordinator PERPUS sendiri memperbarui nama/password tanpa error konflik
        $respSelfUpdate = $this->putJson('/api/users/' . $existingKoord->code_id, [
            'name' => 'Koord PERPUS Berganti Nama',
        ]);
        $respSelfUpdate->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $existingKoord->id, 'name' => 'Koord PERPUS Berganti Nama']);

        // Staf PERPUS dipromosikan jadi Koordinator di PMB (belum ada koordinator) -> Berhasil
        $respSuccessPromote = $this->putJson('/api/users/' . $staf->code_id, [
            'role' => 'Koordinator Unit',
            'unit_id' => 'PMB',
        ]);
        $respSuccessPromote->assertStatus(200);
        $this->assertDatabaseHas('users', ['id' => $staf->id, 'role' => 'Koordinator Unit', 'unit_id' => 'PMB']);
    }
}
