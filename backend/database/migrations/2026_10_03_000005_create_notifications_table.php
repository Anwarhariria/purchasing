<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id')->primary(); // e.g. NOTIF-001
            $table->string('title');
            $table->text('desc');
            $table->string('time')->nullable()->default('Baru saja');
            $table->string('target_role')->default('Semua');
            $table->string('request_id')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
