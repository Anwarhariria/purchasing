<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel model_peramalan
        Schema::create('model_peramalan', function (Blueprint $table) {
            $table->id();
            $table->string('versi')->unique();
            $table->string('varian')->default('residual'); // 'direct' atau 'residual'
            $table->json('parameter')->nullable();
            $table->float('mae_rf', 10, 4)->nullable();
            $table->float('mape_rf', 8, 4)->nullable();
            $table->float('mape_ma3', 8, 4)->nullable();
            $table->float('mape_snaive', 8, 4)->nullable();
            $table->json('rolling_origin_results')->nullable();
            $table->integer('jumlah_data')->nullable();
            $table->string('sumber_data')->nullable();
            $table->boolean('is_simulated')->default(false);
            $table->boolean('aktif')->default(false);
            $table->timestamp('trained_at')->nullable();
            $table->string('artifact_path')->nullable();
            $table->timestamps();
        });

        // 2. Tabel ramalan
        Schema::create('ramalan', function (Blueprint $table) {
            $table->id();
            $table->string('unit_id', 50);
            $table->string('katalog_barang_id', 50);
            $table->string('periode', 7); // 'YYYY-MM'
            $table->float('qty_prediksi', 10, 2);
            $table->float('qty_ma3', 10, 2)->nullable();
            $table->float('qty_snaive', 10, 2)->nullable();
            $table->foreignId('model_id')->nullable()->constrained('model_peramalan')->nullOnDelete();
            $table->boolean('tanpa_model')->default(false);
            $table->timestamps();

            $table->foreign('unit_id')->references('id')->on('units')->cascadeOnDelete();
            $table->foreign('katalog_barang_id')->references('id')->on('katalog_barang')->cascadeOnDelete();
            $table->unique(['unit_id', 'katalog_barang_id', 'periode'], 'uniq_ramalan_unit_item_periode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ramalan');
        Schema::dropIfExists('model_peramalan');
    }
};
