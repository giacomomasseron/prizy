<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSRF protection for the first-party session-cookie SPA, exempting stateless
 * Bearer-token API requests. A request carrying `Authorization: Bearer <token>`
 * is authenticated by the custom token guard and needs no CSRF token; a
 * cookie/session request (the SPA) is validated normally and receives the
 * refreshed XSRF-TOKEN cookie.
 */
final class VerifyCsrfToken extends ValidateCsrfToken
{
    public function handle($request, Closure $next): Response
    {
        if ($request->bearerToken() !== null) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }
}
