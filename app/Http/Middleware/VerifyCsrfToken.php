<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSRF protection for the first-party session-cookie SPA, exempting stateless
 * Bearer-token API requests. A request carrying `Authorization: Bearer <token>`
 * is authenticated by the custom token guard and needs no CSRF token; a
 * cookie/session request (the SPA) is validated normally and receives the
 * refreshed XSRF-TOKEN cookie.
 *
 * CORS INVARIANT — this Bearer exemption is safe ONLY because `/v1/*` has no
 * permissive CORS: a browser cannot set the `Authorization` header cross-site.
 * If a future `config/cors.php` ever covers `v1/*` with `supports_credentials`,
 * a reflected/wildcard origin, AND `Authorization` in `allowed_headers`, this
 * exemption becomes a CSRF bypass and must be revisited.
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
