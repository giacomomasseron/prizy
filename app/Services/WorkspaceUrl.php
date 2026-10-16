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
        $app = parse_url((string) config('app.url'));
        $scheme = ($app['scheme'] ?? 'http') === 'https' ? 'https' : 'http';
        $port = isset($app['port']) ? ':'.$app['port'] : '';

        return "{$scheme}://{$workspace->slug}.".config('app.base_domain').$port;
    }
}
