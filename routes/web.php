<?php

use App\Http\Controllers\Auth\AcceptInviteController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MagicLinkController;
use App\Http\Controllers\Auth\SignUpController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MemberController;
use Illuminate\Support\Facades\Route;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

Route::view('/', 'app');
Route::view('/login', 'app');
Route::view('/signup', 'app')->withoutMiddleware([NeedsTenant::class, EnsureValidTenantSession::class]);
Route::view('/board', 'app');
Route::view('/issues/{issue}', 'app');
Route::view('/teams', 'app');
Route::view('/teams/{team}', 'app');
Route::view('/projects', 'app');
Route::view('/projects/{project}', 'app');
Route::view('/labels', 'app');
Route::view('/roadmap', 'app');
Route::view('/notifications', 'app');
Route::view('/settings', 'app');
Route::view('/settings/members', 'app');
Route::view('/settings/teams', 'app');
Route::view('/settings/general', 'app');
Route::view('/settings/billing', 'app');
Route::view('/settings/audit', 'app');
Route::view('/search', 'app');
Route::view('/integrations', 'app');
Route::view('/create', 'app');

// Landlord routes — exempt from both tenant middlewares (no workspace is resolved yet).
Route::withoutMiddleware([NeedsTenant::class, EnsureValidTenantSession::class])->group(function (): void {
    Route::get('/health', HealthController::class);
    Route::post('/workspaces', SignUpController::class)->middleware(['throttle:10,1']);

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

    // Accept invite — landlord route because the invitee has no tenant session
    // yet. The raw token is looked up by sha256 hash (RLS permissive when GUC
    // is unset), so the row is reachable from any workspace context.
    Route::post('/invitations/{token}/accept', [AcceptInviteController::class, 'store'])
        ->middleware(['throttle:10,1'])
        ->name('invitations.accept');
});

// Tenant web routes — resolved under a workspace host (NeedsTenant + tenant.session from web group).
// Login must NOT be gated by 'verified'; any member may log in regardless of email verification.

// Magic-link request — tenant route so the user lookup is workspace-scoped.
// "Forgot password" reuses this same endpoint (no separate flow needed).
Route::post('/magic-link', [MagicLinkController::class, 'request'])->middleware(['throttle:6,1']);

Route::post('/login', [LoginController::class, 'store'])->middleware(['throttle:10,1']);
Route::post('/logout', [LoginController::class, 'destroy']);

// Resend verification email (tenant, authenticated, throttled).
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth', 'throttle:6,1'])
    ->name('verification.send');

// Member invite — tenant web route; only verified owners/admins may invite.
// 'verified' enforces email verification (carries-forward from Task 7);
// 'can:invite,App\Models\User' enforces MemberPolicy@invite (admin_level check).
Route::post('/invitations', [MemberController::class, 'store'])
    ->middleware(['auth', 'verified', 'can:invite,App\\Models\\User'])
    ->name('invitations.store');
