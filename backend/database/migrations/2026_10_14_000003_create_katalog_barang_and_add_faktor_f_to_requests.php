<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat tabel katalog_barang untuk Alur B (UC-24)
        if (!Schema::hasTable('katalog_barang')) {
            Schema::create('katalog_barang', function (Blueprint $table) {
                $table->string('id')->primary(); // e.g. KAT-001
                $table->string('kode')->nullable();
                $table->string('nama')->index();
                $table->string('kategori')->nullable();
                $table->string('satuan');
                $table->decimal('harga_acuan', 15, 2)->default(0);
                $table->decimal('stok_tersedia', 10, 2)->default(0);
                $table->string('target_unit')->nullable();
                $table->boolean('aktif')->default(true)->index();
                $table->timestamps();
            });
        }

        // 2. Tambah kolom faktor_f, catatan_keuangan, nominal_transfer di tabel requests
        Schema::table('requests', function (Blueprint $table) {
            if (!Schema::hasColumn('requests', 'faktor_f')) {
                $table->decimal('faktor_f', 4, 2)->nullable()->after('status');
            }
            if (!Schema::hasColumn('requests', 'catatan_keuangan')) {
                $table->text('catatan_keuangan')->nullable()->after('faktor_f');
            }
            if (!Schema::hasColumn('requests', 'nominal_transfer')) {
                $table->decimal('nominal_transfer', 15, 2)->nullable()->after('catatan_keuangan');
            }
        });

        // 3. Tambah kolom qty_final di tabel request_details
        Schema::table('request_details', function (Blueprint $table) {
            if (!Schema::hasColumn('request_details', 'qty_final')) {
                $table->decimal('qty_final', 10, 2)->nullable()->after('qty');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('katalog_barang')) {
            Schema::dropIfExists('katalog_barang');
        }

        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'faktor_f')) {
                $table->dropColumn('faktor_f');
            }
            if (Schema::hasColumn('requests', 'catatan_keuangan')) {
                $table->dropColumn('catatan_keuangan');
            }
            if (Schema::hasColumn('requests', 'nominal_transfer')) {
                $table->dropColumn('nominal_transfer');
            }
        });

        Schema::table('request_details', function (Blueprint $table) {
            if (Schema::hasColumn('request_details', 'qty_final')) {
                $table->dropColumn('qty_final');
            }
        });
    }
};
