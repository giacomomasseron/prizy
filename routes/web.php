<?php

use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

Route::get('/', function () {
    return view('welcome');
});

Route::withoutMiddleware(NeedsTenant::class)->group(function (): void {
    Route::get('/health', HealthController::class);
});
