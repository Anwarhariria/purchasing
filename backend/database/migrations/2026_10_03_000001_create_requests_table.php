<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. PR-2026-001
            $table->string('item'); // Judul Pengajuan (Menu Praktik / Barang)
            $table->string('category')->default('Bahan Praktik Masak');
            $table->string('prodi')->nullable();
            $table->integer('semester')->nullable();
            $table->string('course')->nullable();
            $table->string('menu')->nullable();
            $table->integer('qty')->default(1);
            $table->string('unit')->default('items');
            $table->decimal('price', 15, 2)->default(0);
            $table->string('urgency')->default('Normal'); // Normal | Mendesak
            $table->string('academic_importance')->default('Standar'); // Tinggi | Sedang | Standar
            $table->string('applicant');
            $table->string('department');
            $table->string('date');
            $table->string('need_by')->nullable();
            $table->string('deadline')->nullable();
            $table->text('purpose')->nullable();
            $table->string('status')->default('Diajukan');
            $table->text('note')->nullable();

            // Keuangan & SPJ
            $table->decimal('disbursed_amount', 15, 2)->nullable()->default(0);
            $table->decimal('actual_spent', 15, 2)->nullable()->default(0);
            $table->decimal('refund_amount', 15, 2)->nullable()->default(0);
            $table->decimal('deficit_amount', 15, 2)->nullable()->default(0);
            $table->string('reimbursement_status')->nullable()->default('Belum Diajukan');
            $table->json('receipt_images')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
