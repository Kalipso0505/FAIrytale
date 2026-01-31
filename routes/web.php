<?php

use App\Http\Controllers\Api\PromptTemplateController;
use App\Http\Controllers\DebugController;
use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});

// Murder Mystery Game Routes
Route::prefix('game')->name('game.')->group(function () {
    Route::get('/', [GameController::class, 'index'])->name('index');
    Route::post('/generate-and-start', [GameController::class, 'generateAndStart'])->name('generate-and-start');
    Route::post('/quick-start', [GameController::class, 'quickStart'])->name('quick-start');
    Route::post('/start', [GameController::class, 'start'])->name('start');
    Route::post('/chat', [GameController::class, 'chat'])->name('chat');
    Route::get('/{gameId}/history', [GameController::class, 'history'])->name('history');
    Route::post('/accuse', [GameController::class, 'accuse'])->name('accuse');
});

// Debug Dashboard Routes
Route::prefix('debug')->name('debug.')->group(function () {
    Route::get('/', [DebugController::class, 'index'])->name('index');
});

Route::prefix('api/debug')->name('api.debug.')->group(function () {
    Route::get('/personas', [DebugController::class, 'personas'])->name('personas');
});

// Prompt Templates API (für AI-Service und Content-Management)
Route::prefix('api/prompts')->name('api.prompts.')->group(function () {
    Route::get('/', [PromptTemplateController::class, 'index'])->name('index');
    Route::get('/all', [PromptTemplateController::class, 'all'])->name('all');
    Route::get('/{key}', [PromptTemplateController::class, 'show'])->name('show');
});
