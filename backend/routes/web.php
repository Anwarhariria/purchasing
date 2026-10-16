<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'SPAKE API - Sistem Pengadaan Kampus ASAINDO',
        'version' => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});
