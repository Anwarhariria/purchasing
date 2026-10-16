<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProcurementRequestController;
use App\Http\Controllers\Api\LabStockController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ForecastingController;
use App\Http\Controllers\Api\KatalogBarangController;

// Public Authentication Endpoints (Rate limited per email+IP: 5 attempts per minute)
Route::get('/login', fn() => response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401))->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
});

// ALL PROTECTED ROUTES: Strictly guarded by Sanctum authentication
Route::middleware('auth:sanctum')->group(function () {
    // Auth Session
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Units (7 unit kerja kampus SRS)
    Route::get('/units', fn() => response()->json([
        'status' => 'success',
        'data' => \App\Models\Unit::orderBy('id')->get(['id', 'nama', 'kode']),
    ]));

    // Users Management (Only Super Admin can create/list/update)
    Route::get('/users', [AuthController::class, 'users']);
    Route::post('/users', [AuthController::class, 'storeUser']);
    Route::match(['put', 'patch'], '/users/{id}', [AuthController::class, 'updateUser']);

    // Procurement Requests
    Route::prefix('requests')->group(function () {
        Route::get('/kpis', [ProcurementRequestController::class, 'kpis']);
        Route::get('/', [ProcurementRequestController::class, 'index']);
        Route::post('/', [ProcurementRequestController::class, 'store']);
        Route::get('/{id}', [ProcurementRequestController::class, 'show']);
        Route::get('/{id}/activities', [ProcurementRequestController::class, 'activities']);
        Route::put('/{id}', [ProcurementRequestController::class, 'update']);
        Route::match(['put', 'patch'], '/{id}/status', [ProcurementRequestController::class, 'updateStatus']);
        Route::post('/{id}/keputusan-keuangan', [ProcurementRequestController::class, 'keputusanKeuangan']);
        Route::post('/{id}/spj', [ProcurementRequestController::class, 'submitExpenseReport']);
        Route::get('/{id}/berkas/{berkasId}', [ProcurementRequestController::class, 'downloadBerkas']);
    });

    // Penyelesaian Kasbon (Khusus Keuangan Kitchen - Alur A)
    Route::post('/kasbon/{id}/penyelesaian', [ProcurementRequestController::class, 'catatPenyelesaian']);

    // Katalog Barang (Alur B / UC-24)
    Route::prefix('katalog-barang')->group(function () {
        Route::get('/', [KatalogBarangController::class, 'index']);
        Route::post('/', [KatalogBarangController::class, 'store']);
        Route::get('/{id}', [KatalogBarangController::class, 'show']);
        Route::match(['put', 'patch'], '/{id}', [KatalogBarangController::class, 'update']);
        Route::delete('/{id}', [KatalogBarangController::class, 'destroy']);
    });

    // Lab Stocks Inventory (Kitchen)
    Route::prefix('stocks')->group(function () {
        Route::get('/', [LabStockController::class, 'index']);
        Route::get('/map', [LabStockController::class, 'inventoryMap']);
        Route::post('/', [LabStockController::class, 'store']);
        Route::put('/{id}', [LabStockController::class, 'update']);
        Route::delete('/{id}', [LabStockController::class, 'destroy']);
    });

    // Curriculums & Recipes (Kaprodi)
    Route::prefix('curriculums')->group(function () {
        Route::get('/', [CurriculumController::class, 'index']);
        Route::post('/', [CurriculumController::class, 'store']);
    });

    // Notifications (Personalized)
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // AI Forecasting (Alur B)
    Route::prefix('forecasting')->group(function () {
        Route::get('/model-info', [ForecastingController::class, 'modelInfo']);
        Route::get('/models', [ForecastingController::class, 'listModels']);
        Route::post('/activate-model/{id}', [ForecastingController::class, 'activateModel']);
        Route::post('/predict-alur-b', [ForecastingController::class, 'predictAlurB']);
        Route::post('/train-alur-b', [ForecastingController::class, 'trainAlurB']);
    });
});
