<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Sirf logged-in users ke liye)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Chat & History Routes
    Route::get('/sessions', [ChatController::class, 'getSessions']);
    Route::get('/sessions/{id}/messages', [ChatController::class, 'getSessionMessages']);
    Route::post('/chat', [ChatController::class, 'sendMessage']);
    Route::put('/sessions/{id}', [ChatController::class, 'renameSession']);
    Route::delete('/sessions/{id}', [ChatController::class, 'deleteSession']);
    Route::get('/limit', [ChatController::class, 'getLimit']);
});