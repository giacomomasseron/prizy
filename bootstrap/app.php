<?php

use App\Support\Http\ProblemDetails;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Multitenancy\Http\Middleware\EnsureValidTenantSession;
use Spatie\Multitenancy\Http\Middleware\NeedsTenant;

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
            'tenant' => NeedsTenant::class,
            'tenant.session' => EnsureValidTenantSession::class,
        ]);

        $middleware->appendToGroup('api', NeedsTenant::class);
        $middleware->appendToGroup('web', NeedsTenant::class);
        $middleware->appendToGroup('web', EnsureValidTenantSession::class);

        // Guest redirects: the contact portal sends guests to its own sign-in
        // page; everything else keeps the SPA login path.
        $middleware->redirectGuestsTo(fn (Request $request): string => $request->is('help', 'help/*')
            ? route('help.login')
            : '/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render exceptions as JSON for API routes or any request that sends Accept: application/json.
        // This ensures landlord JSON endpoints (e.g. POST /workspaces) return 422 JSON on validation
        // failure rather than redirecting back (which would only make sense for HTML forms).
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // RFC 7807 Problem Details for the v1 API surface.
        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            if ($request->is('v1/*')) {
                return ProblemDetails::render($e, $request);
            }

            return null;
        });
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('notifications:send-digests --frequency=daily')->dailyAt('08:00');
        $schedule->command('notifications:send-digests --frequency=weekly')->weeklyOn(1, '08:00');
        $schedule->command('sla:record-breaches')->everyFiveMinutes();
    })
    ->create();
