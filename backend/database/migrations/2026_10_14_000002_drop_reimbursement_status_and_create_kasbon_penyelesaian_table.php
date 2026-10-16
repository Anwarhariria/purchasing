<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Modifikasi tabel requests: drop reimbursement_status dan tambah dana_diterima
        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'reimbursement_status')) {
                $table->dropColumn('reimbursement_status');
            }
            if (!Schema::hasColumn('requests', 'dana_diterima')) {
                $table->decimal('dana_diterima', 15, 2)->nullable()->default(0)->after('disbursed_amount');
            }
        });

        // 2. Buat tabel kasbon_penyelesaian
        Schema::create('kasbon_penyelesaian', function (Blueprint $table) {
            $table->id();
            $table->string('pengajuan_id');
            $table->foreign('pengajuan_id')->references('id')->on('requests')->onDelete('cascade');
            $table->enum('jenis', ['setor', 'carry_over']);
            $table->decimal('nominal', 15, 2);
            $table->string('bukti_path')->nullable();
            $table->string('kasbon_tujuan_id')->nullable();
            $table->string('dicatat_oleh');
            $table->date('tanggal');
            $table->timestamps();

            $table->index('pengajuan_id');
            $table->index('kasbon_tujuan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kasbon_penyelesaian');

        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'dana_diterima')) {
                $table->dropColumn('dana_diterima');
            }
            if (!Schema::hasColumn('requests', 'reimbursement_status')) {
                $table->string('reimbursement_status')->nullable()->default('Belum Diajukan');
            }
        });
    }
};
