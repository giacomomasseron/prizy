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

        // Caddy terminates TLS in front of this app (P-3). Measured reality,
        // not the original assumption:
        //   - fpm receives the CLIENT's own address as REMOTE_ADDR, not
        //     Caddy's, and Caddy sets HTTPS=on directly — so this middleware
        //     is not actually load-bearing for scheme in production. It IS
        //     load-bearing in the Pest suite (tests/Feature/Tls/TrustedProxyTest.php),
        //     which simulates the edge over HTTP with X-Forwarded-Proto and
        //     has no real fpm environment to set HTTPS=on.
        //   - Caddy overwrites X-Forwarded-For/-Host/-Proto with its own view
        //     before they reach fpm, but sets neither X-Forwarded-Prefix nor
        //     X-Forwarded-Port — so trusting Laravel's default header set
        //     (which includes Prefix) lets a client-supplied X-Forwarded-Prefix
        //     through untouched from any trusted address.
        //   - Scoped to loopback and the RFC1918 ranges the compose network
        //     uses, never '*' — but on a LAN install every client IS RFC1918,
        //     so every LAN user is a trusted address for this middleware's
        //     purposes. Trusting Prefix there lets any of them poison the
        //     path of every generated and signed URL in a request they send —
        //     including a magic-link or CSAT email addressed to someone else —
        //     with a forged X-Forwarded-Prefix. Narrowed to only the three
        //     headers Caddy actually sets and actually needs to be believed.
        //
        // The Host header still cannot select a tenant regardless of trust:
        // Spatie resolves the tenant from the raw Host before this middleware
        // ever runs (see the pinning test in TrustedProxyTest.php).
        $middleware->trustProxies(
            at: [
                '127.0.0.1',
                '10.0.0.0/8',
                '172.16.0.0/12',
                '192.168.0.0/16',
            ],
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PROTO,
        );

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
