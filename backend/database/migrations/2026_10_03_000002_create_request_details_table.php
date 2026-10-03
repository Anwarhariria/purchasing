<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_details', function (Blueprint $table) {
            $table->id();
            $table->string('code_id')->nullable(); // e.g. D-01
            $table->string('request_id');
            $table->foreign('request_id')->references('id')->on('requests')->onDelete('cascade');
            $table->string('name');
            $table->decimal('qty', 10, 2);
            $table->decimal('needed_qty', 10, 2)->nullable();
            $table->decimal('stock_in_lab', 10, 2)->default(0);
            $table->string('unit');
            $table->decimal('price', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_details');
    }
};
