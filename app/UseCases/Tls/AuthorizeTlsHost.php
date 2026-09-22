<?php

declare(strict_types=1);

namespace App\UseCases\Tls;

use App\Models\Workspace;
use Illuminate\Support\Str;

/**
 * Answers "may this hostname get a TLS certificate?" for Caddy's on-demand TLS.
 *
 * This MUST agree with App\Multitenancy\WorkspaceTenantFinder: custom domain
 * first, then strip the base domain and match a slug. If the two disagree,
 * Caddy issues certificates for hosts the application refuses to serve, or
 * refuses hosts it would have served — taking a workspace offline.
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

        if (Workspace::query()->where('custom_domain', $host)->exists()) {
            return true;
        }

        if ($base === '' || ! str_ends_with($host, '.'.$base)) {
            // Deliberately stricter than WorkspaceTenantFinder here. The finder
            // derives its slug with Str::before($host, '.'.$base), which is
            // strstr(..., true) — it matches the FIRST occurrence of ".$base"
            // anywhere in the string, not an anchored suffix, so it would
            // resolve an attacker-controlled host like
            // "acme.example.com.evil.test" to the "acme" workspace. This
            // anchored str_ends_with() check refuses that host instead, so no
            // certificate is ever issued for it — the divergence is in the
            // safe direction and is intentional. Do not "fix" this to match
            // the finder; the finder has its own pre-existing bug here, out of
            // scope for this task and needing its own design decision.
            return false;
        }

        $slug = Str::before($host, '.'.$base);

        // A nested subdomain would be looked up as a slug containing a dot and
        // never match, so refuse it here rather than issuing a dead certificate.
        if ($slug === '' || str_contains($slug, '.')) {
            return false;
        }

        return Workspace::query()->where('slug', $slug)->exists();
    }
}
