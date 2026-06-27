<?php

use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MagicLinkController;
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

    // Email verification — landlord route because the user may click the link
    // on any device or host with no tenant session. WorkspaceScope is a no-op
    // (no workspace current) and RLS is permissive when the GUC is unset.
    Route::get('/verify-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('signed')
        ->name('verification.verify');

    // Magic-link consume — user may click from any device or host with no tenant
    // session. UUID is globally unique; RLS permissive when GUC is unset.
    Route::get('/magic-link/consume', [MagicLinkController::class, 'consume'])
        ->middleware('signed')
        ->name('magic-link.consume');
});

// Tenant web routes — resolved under a workspace host (NeedsTenant + tenant.session from web group).
// Login must NOT be gated by 'verified'; any member may log in regardless of email verification.

// Magic-link request — tenant route so the user lookup is workspace-scoped.
// "Forgot password" reuses this same endpoint (no separate flow needed).
Route::post('/magic-link', [MagicLinkController::class, 'request']);

Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy']);

// Resend verification email (tenant, authenticated, throttled).
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth', 'throttle:6,1'])
    ->name('verification.send');
