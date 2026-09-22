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
