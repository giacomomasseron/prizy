<?php

use App\Http\Middleware\EnsureHelpdeskEnabled;
use App\Support\Http\ProblemDetails;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
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

        // Caddy terminates TLS in front of this app (P-3), so the forwarded
        // headers must be believed — otherwise every generated URL, signed URL
        // and redirect comes out as http:// behind https, breaking magic-link
        // sign-in and the signed CSAT links.
        //
        // Scoped to loopback and the RFC1918 ranges the compose network uses,
        // never '*': the Host header selects the TENANT in this application, so
        // anything that can present X-Forwarded-Host can select a workspace.
        $middleware->trustProxies(at: [
            '127.0.0.1',
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
        ]);

        // A workspace with the support module switched off answers 404 on the
        // help centre and the portal — including the routes behind the contact
        // guard, which would otherwise redirect a guest to a sign-in page that
        // is itself gone. So the switch is decided before authentication.
        $middleware->prependToPriorityList(AuthenticatesRequests::class, EnsureHelpdeskEnabled::class);

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
