<?php

declare(strict_types=1);

namespace App\UseCases\Tls;

use App\Models\Workspace;
use App\Services\SignupHost;
use App\Services\WorkspaceUrl;
use Illuminate\Support\Str;

/**
 * Answers "may this hostname get a TLS certificate?" for Caddy's on-demand TLS.
 *
 * This MUST agree with App\Multitenancy\WorkspaceTenantFinder: custom domain
 * first, then the slug WorkspaceUrl::slugFromHost() reads off the host (both
 * call it). If the two disagree, Caddy issues certificates for hosts the
 * application refuses to serve, or refuses hosts it would have served —
 * taking a workspace offline.
 */
final class AuthorizeTlsHost
{
    public function handle(string $host): bool
    {
        $host = strtolower(trim($host));

        // Neither reaches this endpoint through real Caddy traffic — SNI
        // carries no port, and RFC 6066 excludes a trailing dot — but
        // WorkspaceTenantFinder sees a host already normalised by Symfony's
        // Request::getHost(), while this one arrives raw from a query
        // string. Strip both here too, to stay in agreement.
        $host = rtrim($host, '.');
        $host = Str::before($host, ':');

        if ($host === '') {
            return false;
        }

        $base = strtolower((string) config('app.base_domain'));

        if ($base !== '' && $host === $base) {
            return true;
        }

        if ($host === SignupHost::host()) {
            return true;
        }

        // activated(): WorkspaceTenantFinder serves no pending workspace, so
        // no certificate for one either — junk sign-ups never reach the CA.
        if (Workspace::query()->activated()->where('custom_domain', $host)->exists()) {
            return true;
        }

        // The same rule the finder uses: "{slug}.$base" exactly, so a foreign
        // host that merely contains the base domain, or a nested subdomain,
        // gets no certificate.
        $slug = WorkspaceUrl::slugFromHost($host);

        return $slug !== null && Workspace::query()->activated()->where('slug', $slug)->exists();
    }
}
