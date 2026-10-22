<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kasbon_penyelesaian', function (Blueprint $table) {
            $table->timestamp('diganti_langsung_at')->nullable()->after('kasbon_tujuan_id');
            $table->string('bukti_ganti_path')->nullable()->after('diganti_langsung_at');
            $table->unsignedBigInteger('diganti_oleh')->nullable()->after('bukti_ganti_path');

            $table->foreign('diganti_oleh')->references('id')->on('users')->nullOnDelete();
            $table->index('diganti_langsung_at');
        });
    }

    public function down(): void
    {
        Schema::table('kasbon_penyelesaian', function (Blueprint $table) {
            $table->dropForeign(['diganti_oleh']);
            $table->dropIndex(['diganti_langsung_at']);
            $table->dropColumn(['diganti_langsung_at', 'bukti_ganti_path', 'diganti_oleh']);
        });
    }
};
