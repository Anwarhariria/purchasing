<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProcurementRequestController;
use App\Http\Controllers\Api\LabStockController;
use App\Http\Controllers\Api\CurriculumController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ForecastingController;

// Authentication
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/quick-login', [AuthController::class, 'quickLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Users Management
Route::get('/users', [AuthController::class, 'users']);
Route::post('/users', [AuthController::class, 'storeUser']);

// Procurement Requests
Route::prefix('requests')->group(function () {
    Route::get('/kpis', [ProcurementRequestController::class, 'kpis']);
    Route::get('/saw-ranking', [ProcurementRequestController::class, 'sawRanking']);
    Route::get('/fifo-ranking', [ProcurementRequestController::class, 'fifoRanking']);
    Route::get('/', [ProcurementRequestController::class, 'index']);
    Route::post('/', [ProcurementRequestController::class, 'store']);
    Route::get('/{id}', [ProcurementRequestController::class, 'show']);
    Route::put('/{id}', [ProcurementRequestController::class, 'update']);
    Route::patch('/{id}/status', [ProcurementRequestController::class, 'updateStatus']);
    Route::post('/{id}/disburse', [ProcurementRequestController::class, 'disburseFunds']);
    Route::post('/{id}/spj', [ProcurementRequestController::class, 'submitExpenseReport']);
    Route::post('/{id}/reimburse', [ProcurementRequestController::class, 'reimburseDeficit']);
    Route::delete('/{id}', [ProcurementRequestController::class, 'destroy']);
});

// Lab Stocks Inventory
Route::prefix('stocks')->group(function () {
    Route::get('/', [LabStockController::class, 'index']);
    Route::get('/map', [LabStockController::class, 'inventoryMap']);
    Route::post('/', [LabStockController::class, 'store']);
    Route::put('/{id}', [LabStockController::class, 'update']);
    Route::delete('/{id}', [LabStockController::class, 'destroy']);
});

// Curriculums & Recipes
Route::prefix('curriculums')->group(function () {
    Route::get('/', [CurriculumController::class, 'index']);
    Route::post('/', [CurriculumController::class, 'store']);
});

// Notifications
Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
});

// Forecasting
Route::prefix('forecasting')->group(function () {
    Route::get('/ingredients', [ForecastingController::class, 'ingredients']);
    Route::post('/calculate', [ForecastingController::class, 'calculate']);
});
