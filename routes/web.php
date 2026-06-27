<?php

use App\Http\Controllers\Auth\SignUpController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

Route::get('/', function () {
    return view('welcome');
});

// Landlord routes — exempt from both tenant middlewares (no workspace is resolved yet).
Route::withoutMiddleware([NeedsTenant::class, EnsureValidTenantSession::class])->group(function (): void {
    Route::get('/health', HealthController::class);
    Route::post('/workspaces', SignUpController::class);
});
