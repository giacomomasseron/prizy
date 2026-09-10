<?php

use App\Http\Controllers\Auth\AcceptInviteController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MagicLinkController;
use App\Http\Controllers\Auth\SignUpController;
use App\Http\Controllers\CsatController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HelpCenterController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\PortalAuthController;
use App\Http\Controllers\PortalController;
use Illuminate\Support\Facades\Route;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

Route::view('/', 'app');
// Login must stay reachable even with a stale/mismatched session (that's exactly
// when you need it) — exempt it from EnsureValidTenantSession (keep NeedsTenant so
// the workspace still resolves; the login handler regenerates the session anyway).
Route::view('/login', 'app')->withoutMiddleware([EnsureValidTenantSession::class]);
Route::view('/signup', 'app')->withoutMiddleware([NeedsTenant::class, EnsureValidTenantSession::class]);
Route::view('/board', 'app');
Route::view('/issues/{issue}', 'app');
Route::view('/teams', 'app');
Route::view('/teams/{team}', 'app');
Route::view('/teams/{team}/cycles', 'app');
Route::view('/projects', 'app');
Route::view('/projects/{project}', 'app');
Route::view('/projects/{project}/{view}', 'app');
Route::view('/labels', 'app');
Route::view('/roadmap', 'app');
Route::view('/analytics', 'app');
Route::view('/releases', 'app');
Route::view('/releases/{release}', 'app');
Route::view('/notifications', 'app');
Route::view('/settings', 'app');
Route::view('/settings/members', 'app');
Route::view('/settings/teams', 'app');
Route::view('/settings/general', 'app');
Route::view('/settings/labels', 'app');
Route::view('/settings/business-hours', 'app');
Route::view('/settings/sla-policies', 'app');
Route::view('/settings/billing', 'app');
Route::view('/settings/audit', 'app');
Route::view('/settings/integrations', 'app');
Route::view('/search', 'app');
Route::view('/integrations', 'app');
Route::view('/create', 'app');
Route::view('/support', 'app');
Route::view('/support/tickets/{ticket}', 'app');
Route::view('/support/reporting', 'app');

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

// CSAT rating capture — public (the customer has no login); the temporary
// signed URL is the entire authorization. NeedsTenant stays so the workspace
// resolves from the subdomain (WorkspaceScope + RLS); the session middleware
// is exempted exactly like /login.
Route::get('/csat/{ticket}/{rating}', [CsatController::class, 'respond'])
    ->whereIn('rating', ['up', 'down'])
    ->middleware(['throttle:30,1'])
    ->withoutMiddleware([EnsureValidTenantSession::class])
    ->name('csat.respond');

// Help center (HC-1) — public knowledge base on the tenant host.
// Same session exemption as /login and /csat; NeedsTenant stays (RLS GUC).
// ORDER MATTERS: fixed segments before the {category} catch-all — 'search',
// 'articles' and HelpCenterController::RESERVED_HELP_SLUGS' other entries
// ('requests', 'new', 'login' — reserved for HC-2/3) are reserved category
// slugs; the negative-lookahead {category} constraint below is belt-and-braces
// on top of that ordering.
$reservedHelpSlugs = implode('|', HelpCenterController::RESERVED_HELP_SLUGS);
$helpCategoryPattern = '^(?!(?:'.$reservedHelpSlugs.')$)[a-z0-9-]+$';

Route::withoutMiddleware([EnsureValidTenantSession::class])->group(function () use ($helpCategoryPattern): void {
    // Contact portal auth (HC-2) — magic-link only.
    Route::get('/help/login', [PortalAuthController::class, 'showLogin'])->name('help.login');
    Route::post('/help/login', [PortalAuthController::class, 'sendLink'])->middleware('throttle:6,1');
    Route::get('/help/login/consume/{nonce}/{contact}', [PortalAuthController::class, 'consume'])->name('help.login.consume');
    Route::post('/help/logout', [PortalAuthController::class, 'logout'])->name('help.logout');

    Route::middleware('auth:contact')->group(function (): void {
        Route::get('/help/requests', [PortalController::class, 'requests'])->name('help.requests');
    });

    // Reads write a view-counter row (article) or recompute nothing but still
    // hit the DB per request, and search runs ts_headline over full article
    // bodies — all unauthenticated, so throttle the GETs same as any other
    // public surface. The feedback POST keeps its own tighter throttle below.
    Route::middleware('throttle:60,1')->group(function () use ($helpCategoryPattern): void {
        Route::get('/help', [HelpCenterController::class, 'home'])->name('help.home');
        Route::get('/help/search', [HelpCenterController::class, 'search'])->name('help.search');
        Route::get('/help/{category}', [HelpCenterController::class, 'topic'])
            ->where('category', $helpCategoryPattern)
            ->name('help.topic');
        Route::get('/help/{category}/{section}/{article}', [HelpCenterController::class, 'article'])
            ->where('category', $helpCategoryPattern)
            ->name('help.article');
    });

    Route::post('/help/articles/{article}/feedback', [HelpCenterController::class, 'feedback'])
        ->middleware('throttle:10,1')->name('help.feedback');
});

Route::post('/login', [LoginController::class, 'store'])
    ->middleware(['throttle:10,1'])
    ->withoutMiddleware([EnsureValidTenantSession::class]);
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
