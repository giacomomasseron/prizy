<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Workspace;

/**
 * The address a workspace answers on: {slug}.APP_BASE_DOMAIN, with APP_URL's
 * scheme and port (the dev server runs on :8001).
 */
final class WorkspaceUrl
{
    public static function for(Workspace $workspace): string
    {
        return self::origin("{$workspace->slug}.".config('app.base_domain'));
    }

    /** "{scheme}://{$host}{:port}", the scheme and port taken from APP_URL. */
    public static function origin(string $host): string
    {
        $app = parse_url((string) config('app.url'));
        $scheme = ($app['scheme'] ?? 'http') === 'https' ? 'https' : 'http';
        $port = isset($app['port']) ? ':'.$app['port'] : '';

        return "{$scheme}://{$host}{$port}";
    }

    /**
     * The slug a host names, the reverse of for(): only "{slug}.APP_BASE_DOMAIN"
     * with exactly one label in front (a fully qualified trailing dot aside).
     * The base domain must END the host, so "acme.prizy.dev.evil.test" names
     * nothing, nor does "x.acme.prizy.dev". WorkspaceTenantFinder and
     * AuthorizeTlsHost both use this, so the host a workspace is served on and
     * the host it gets a certificate for agree.
     */
    public static function slugFromHost(string $host): ?string
    {
        $base = strtolower((string) config('app.base_domain'));
        $host = rtrim(strtolower($host), '.');

        if ($base === '' || ! str_ends_with($host, '.'.$base)) {
            return null;
        }

        $slug = substr($host, 0, -strlen('.'.$base));

        return $slug === '' || str_contains($slug, '.') ? null : $slug;
    }
}
