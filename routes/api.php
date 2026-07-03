<?php

declare(strict_types=1);

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\TokenController;
use App\Http\Controllers\Api\V1\CycleController;
use App\Http\Controllers\Api\V1\MilestoneController;
use App\Http\Controllers\Api\V1\IssueActivityController;
use App\Http\Controllers\Api\V1\IssueBlockerController;
use App\Http\Controllers\Api\V1\IssueCommentController;
use App\Http\Controllers\Api\V1\IssueController;
use App\Http\Controllers\Api\V1\IssueLabelController;
use App\Http\Controllers\Api\V1\IssueTicketLinkController;
use App\Http\Controllers\Api\V1\LabelController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\RoadmapController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SavedViewController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
|
| The 'api' middleware group (with NeedsTenant appended in bootstrap/app.php)
| is applied automatically by ->withRouting(api: ...) in bootstrap/app.php.
| apiPrefix is set to '' so these routes live at /v1/*, not /api/v1/*.
|
| Middleware order:
|   1. NeedsTenant — resolves the workspace from the request host.
|   2. auth:web OR auth:token — authenticates within the resolved workspace.
|
*/

Route::prefix('v1')->group(function (): void {

    // -----------------------------------------------------------------------
    // Token management — SESSION-authenticated (web guard).
    //
    // The api middleware group has no StartSession, so we inject the full
    // cookie + session stack here so that a real browser session cookie is
    // decrypted and hydrated before auth:web runs (production path).
    // Without EncryptCookies + StartSession the guard sees no session and
    // returns 401 even when the user holds a valid session cookie.
    // -----------------------------------------------------------------------
    Route::middleware([EncryptCookies::class, AddQueuedCookiesToResponse::class, StartSession::class, EnsureValidTenantSession::class, 'auth:web'])
        ->group(function (): void {
            Route::post('/auth/tokens', [TokenController::class, 'store'])->middleware('throttle:6,1');
            Route::get('/auth/tokens', [TokenController::class, 'index'])->middleware('throttle:30,1');
            Route::delete('/auth/tokens/{id}', [TokenController::class, 'destroy'])->middleware('throttle:30,1');
        });

    // -----------------------------------------------------------------------
    // Me + Issues API — DUAL auth: Bearer token OR workspace session.
    //
    // The session stack (cookies + StartSession) lets the `web` guard read a
    // first-party SPA session; VerifyCsrfToken protects session writes while
    // exempting stateless Bearer requests. `auth:token,web` accepts either.
    // -----------------------------------------------------------------------
    Route::middleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        EnsureValidTenantSession::class,
        VerifyCsrfToken::class,
        'auth:token,web',
        'throttle:v1',
    ])->group(function (): void {
        Route::get('/me', MeController::class);

        Route::get('/issues', [IssueController::class, 'index'])
            ->middleware('can:viewAny,App\\Models\\Issue');
        Route::get('/issues/{issue}', [IssueController::class, 'show']);
        Route::post('/issues', [IssueController::class, 'store'])
            ->middleware(['verified', 'can:create,App\\Models\\Issue']);
        Route::patch('/issues/{issue}', [IssueController::class, 'update'])->middleware('verified');
        Route::put('/issues/{issue}/status', [IssueController::class, 'status'])->middleware('verified');
        Route::put('/issues/{issue}/assignee', [IssueController::class, 'assignee'])->middleware('verified');
        Route::post('/issues/{issue}/archive', [IssueController::class, 'archive'])->middleware('verified');
        Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store'])->middleware('verified');
        Route::get('/issues/{issue}/comments', [IssueCommentController::class, 'index']);
        Route::get('/issues/{issue}/activities', [IssueActivityController::class, 'index']);
        Route::post('/issues/{issue}/blockers', [IssueBlockerController::class, 'store'])->middleware('verified');
        Route::delete('/issues/{issue}/blockers/{blockingIssue}', [IssueBlockerController::class, 'destroy'])->middleware('verified');
        Route::post('/issues/{issue}/ticket-links', [IssueTicketLinkController::class, 'store'])->middleware('verified');
        Route::get('/issues/{issue}/labels', [IssueLabelController::class, 'index']);
        Route::put('/issues/{issue}/labels', [IssueLabelController::class, 'update'])->middleware('verified');

        Route::get('/labels', [LabelController::class, 'index'])->middleware('can:viewAny,App\\Models\\Label');
        Route::get('/labels/{label}', [LabelController::class, 'show']);
        Route::post('/labels', [LabelController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\Label']);
        Route::patch('/labels/{label}', [LabelController::class, 'update'])->middleware('verified');
        Route::delete('/labels/{label}', [LabelController::class, 'destroy'])->middleware('verified');

        Route::get('/teams', [TeamController::class, 'index'])->middleware('can:viewAny,App\\Models\\Team');
        Route::get('/teams/{team}', [TeamController::class, 'show']);
        Route::post('/teams', [TeamController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\Team']);
        Route::patch('/teams/{team}', [TeamController::class, 'update'])->middleware('verified');
        Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->middleware('verified');

        Route::get('/projects', [ProjectController::class, 'index'])->middleware('can:viewAny,App\\Models\\Project');
        Route::get('/projects/{project}', [ProjectController::class, 'show']);
        Route::post('/projects', [ProjectController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\Project']);
        Route::patch('/projects/{project}', [ProjectController::class, 'update'])->middleware('verified');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->middleware('verified');

        Route::get('/teams/{team}/cycles', [CycleController::class, 'index']);
        Route::post('/teams/{team}/cycles', [CycleController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\Cycle']);
        Route::patch('/cycles/{cycle}', [CycleController::class, 'update'])->middleware('verified');
        Route::delete('/cycles/{cycle}', [CycleController::class, 'destroy'])->middleware('verified');

        Route::get('/projects/{project}/milestones', [MilestoneController::class, 'index']);
        Route::post('/projects/{project}/milestones', [MilestoneController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\Milestone']);
        Route::patch('/milestones/{milestone}', [MilestoneController::class, 'update'])->middleware('verified');
        Route::delete('/milestones/{milestone}', [MilestoneController::class, 'destroy'])->middleware('verified');

        Route::get('/roadmap', [RoadmapController::class, 'index'])->middleware('can:viewAny,App\\Models\\Project');

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
        Route::patch('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'read']);

        Route::get('/saved-views', [SavedViewController::class, 'index'])->middleware('can:viewAny,App\\Models\\SavedView');
        Route::get('/saved-views/{savedView}', [SavedViewController::class, 'show']);
        Route::post('/saved-views', [SavedViewController::class, 'store'])->middleware(['verified', 'can:create,App\\Models\\SavedView']);
        Route::patch('/saved-views/{savedView}', [SavedViewController::class, 'update'])->middleware('verified');
        Route::delete('/saved-views/{savedView}', [SavedViewController::class, 'destroy'])->middleware('verified');

        Route::get('/search', [SearchController::class, 'index']);
    });
});
