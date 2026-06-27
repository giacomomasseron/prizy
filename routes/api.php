<?php

declare(strict_types=1);

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\TokenController;
use Illuminate\Support\Facades\Route;

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
    // A logged-in web user creates or revokes their own API tokens.
    // The session guard works via actingAs() in tests; in production the
    // browser session authenticates the user.
    // -----------------------------------------------------------------------
    Route::middleware(['auth:web'])->group(function (): void {
        Route::post('/auth/tokens', [TokenController::class, 'store'])
            ->middleware('throttle:6,1');
        Route::get('/auth/tokens', [TokenController::class, 'index']);
        Route::delete('/auth/tokens/{id}', [TokenController::class, 'destroy']);
    });

    // -----------------------------------------------------------------------
    // Me — BEARER-TOKEN authenticated (custom token guard).
    //
    // Resolves the user from the Authorization: Bearer <token> header.
    // The TokenGuard hashes the token, looks up the row, checks expiry,
    // and loads the owner via the workspace-scoped User query.
    // -----------------------------------------------------------------------
    Route::middleware(['auth:token'])->group(function (): void {
        Route::get('/me', MeController::class);
    });
});
