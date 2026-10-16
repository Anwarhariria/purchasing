<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat tabel units (7 unit kerja kampus SRS)
        if (!Schema::hasTable('units')) {
            Schema::create('units', function (Blueprint $table) {
                $table->string('id', 50)->primary(); // e.g. PMB, PERPUS, SEKR-S1, SEKR-S2, SEKR-D3, LSP
                $table->string('nama');
                $table->string('kode', 20)->nullable();
                $table->timestamps();
            });

            // Seed 6 Unit Kerja Kampus SRS
            $units = [
                ['id' => 'PMB', 'nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB'],
                ['id' => 'PERPUS', 'nama' => 'Perpustakaan', 'kode' => 'PERPUS'],
                ['id' => 'SEKR-S1', 'nama' => 'Sekretariat S1 Terapan Perhotelan', 'kode' => 'SEKR-S1'],
                ['id' => 'SEKR-S2', 'nama' => 'Sekretariat S2 Terapan Pariwisata', 'kode' => 'SEKR-S2'],
                ['id' => 'SEKR-D3', 'nama' => 'Sekretariat D3 Perhotelan', 'kode' => 'SEKR-D3'],
                ['id' => 'LSP', 'nama' => 'Lembaga Sertifikasi Profesi', 'kode' => 'LSP'],
            ];

            foreach ($units as $u) {
                DB::table('units')->insert(array_merge($u, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        // 2. Tambah kolom unit_id di tabel users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'unit_id')) {
                $table->string('unit_id', 50)->nullable()->after('role');
                $table->foreign('unit_id')->references('id')->on('units')->nullOnDelete();
            }
        });

        // 3. Tambah kolom unit_id di tabel requests
        Schema::table('requests', function (Blueprint $table) {
            if (!Schema::hasColumn('requests', 'unit_id')) {
                $table->string('unit_id', 50)->nullable()->after('unit_kerja');
                $table->foreign('unit_id')->references('id')->on('units')->nullOnDelete();
            }
        });

        // 4. Tambah softDeletes dan alasan_hapus di request_details
        Schema::table('request_details', function (Blueprint $table) {
            if (!Schema::hasColumn('request_details', 'deleted_at')) {
                $table->softDeletes()->after('price');
            }
            if (!Schema::hasColumn('request_details', 'alasan_hapus')) {
                $table->text('alasan_hapus')->nullable()->after('deleted_at');
            }
        });

        // 5. Migrasikan data role lama ke role eksplisit SRS
        $users = DB::table('users')->get();
        foreach ($users as $u) {
            $oldRole = $u->role;
            $dept = strtoupper($u->department ?? '');
            $email = strtolower($u->email ?? '');
            $newRole = $oldRole;
            $unitId = null;

            // Tentukan Unit ID jika Alur B
            if (str_contains($dept, 'PMB') || str_contains($dept, 'PENERIMAAN') || str_contains($email, 'pmb')) {
                $unitId = 'PMB';
            } elseif (str_contains($dept, 'PERPUS') || str_contains($email, 'perpus')) {
                $unitId = 'PERPUS';
            } elseif (str_contains($dept, 'SEKRETARIAT S1') || str_contains($dept, 'SEKR-S1') || str_contains($email, 'sekre.s1')) {
                $unitId = 'SEKR-S1';
            } elseif (str_contains($dept, 'SEKRETARIAT S2') || str_contains($dept, 'SEKR-S2') || str_contains($email, 'sekre.s2')) {
                $unitId = 'SEKR-S2';
            } elseif (str_contains($dept, 'SEKRETARIAT D3') || str_contains($dept, 'SEKR-D3') || str_contains($email, 'sekre.d3') || str_contains($email, 'sekre@')) {
                $unitId = 'SEKR-D3';
            } elseif (str_contains($dept, 'LSP') || str_contains($dept, 'SERTIFIKASI') || str_contains($email, 'lsp')) {
                $unitId = 'LSP';
            }

            // Tentukan Role Baru
            if ($oldRole === 'Bagian Keuangan') {
                if (str_contains($dept, 'KITCHEN') || str_contains($dept, 'PRAKTIKUM') || str_contains($dept, 'KASBON') || str_contains($email, 'kitchen')) {
                    $newRole = 'Keuangan Kitchen';
                } else {
                    $newRole = 'Keuangan Umum';
                }
            } elseif ($oldRole === 'Koordinator') {
                if (str_contains($dept, 'KITCHEN') || str_contains($dept, 'LAB') || str_contains($dept, 'DAPUR') || str_contains($email, 'koordinator@gmail.com')) {
                    $newRole = 'Koordinator Lab';
                } else {
                    $newRole = 'Koordinator Unit';
                }
            } elseif (in_array($oldRole, ['Staf / Asdos', 'Staf', 'Asdos'])) {
                if (str_contains($dept, 'KITCHEN') || str_contains($dept, 'DAPUR') || str_contains($dept, 'PERHOTELAN') || str_contains($email, 'asdos')) {
                    $newRole = 'Asdos Kitchen';
                } else {
                    $newRole = 'Staf Unit';
                }
            } elseif ($oldRole === 'Super Admin' || $oldRole === 'Kaprodi') {
                $newRole = $oldRole;
            }

            DB::table('users')->where('id', $u->id)->update([
                'role' => $newRole,
                'unit_id' => $unitId,
            ]);
        }

        // 6. Migrasikan unit_id pada tabel requests yang ada
        $requests = DB::table('requests')->get();
        foreach ($requests as $r) {
            $unitStr = strtoupper(($r->unit_kerja ?? '') . ' ' . ($r->department ?? ''));
            $reqUnitId = null;
            if (str_contains($unitStr, 'PMB') || str_contains($unitStr, 'PENERIMAAN')) {
                $reqUnitId = 'PMB';
            } elseif (str_contains($unitStr, 'PERPUS')) {
                $reqUnitId = 'PERPUS';
            } elseif (str_contains($unitStr, 'SEKRETARIAT S1') || str_contains($unitStr, 'SEKR-S1')) {
                $reqUnitId = 'SEKR-S1';
            } elseif (str_contains($unitStr, 'SEKRETARIAT S2') || str_contains($unitStr, 'SEKR-S2')) {
                $reqUnitId = 'SEKR-S2';
            } elseif (str_contains($unitStr, 'SEKRETARIAT D3') || str_contains($unitStr, 'SEKR-D3')) {
                $reqUnitId = 'SEKR-D3';
            } elseif (str_contains($unitStr, 'LSP') || str_contains($unitStr, 'SERTIFIKASI')) {
                $reqUnitId = 'LSP';
            }

            if ($reqUnitId) {
                DB::table('requests')->where('id', $r->id)->update([
                    'unit_id' => $reqUnitId,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('request_details', function (Blueprint $table) {
            if (Schema::hasColumn('request_details', 'alasan_hapus')) {
                $table->dropColumn('alasan_hapus');
            }
            if (Schema::hasColumn('request_details', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'unit_id')) {
                $table->dropForeign(['unit_id']);
                $table->dropColumn('unit_id');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'unit_id')) {
                $table->dropForeign(['unit_id']);
                $table->dropColumn('unit_id');
            }
        });

        Schema::dropIfExists('units');
    }
};
