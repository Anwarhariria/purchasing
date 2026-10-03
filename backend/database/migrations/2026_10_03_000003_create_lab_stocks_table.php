<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_stocks', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. STK-001
            $table->string('name')->unique();
            $table->string('category')->default('Bahan Dapur Lab');
            $table->decimal('current_stock', 10, 2)->default(0);
            $table->string('unit')->default('kg');
            $table->decimal('min_stock', 10, 2)->default(1);
            $table->decimal('cost_per_unit', 15, 2)->default(0);
            $table->date('last_restocked')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('location')->nullable()->default('Gudang Bahan Kering & Cold Storage');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_stocks');
    }
};
