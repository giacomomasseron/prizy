<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant'         => NeedsTenant::class,
            'tenant.session' => EnsureValidTenantSession::class,
        ]);

        $middleware->appendToGroup('api', NeedsTenant::class);
        $middleware->appendToGroup('web', NeedsTenant::class);
        $middleware->appendToGroup('web', EnsureValidTenantSession::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render exceptions as JSON for API routes or any request that sends Accept: application/json.
        // This ensures landlord JSON endpoints (e.g. POST /workspaces) return 422 JSON on validation
        // failure rather than redirecting back (which would only make sense for HTML forms).
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
