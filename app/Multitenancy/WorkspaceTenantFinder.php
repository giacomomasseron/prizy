<?php

declare(strict_types=1);

namespace App\Multitenancy;

use Illuminate\Http\Request;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\TenantFinder\TenantFinder;
use App\Models\Workspace;

final class WorkspaceTenantFinder extends TenantFinder
{
    public function findForRequest(Request $request): ?IsTenant
    {
        $host = $request->getHost(); // e.g. "acme.app.com" or "support.acme.com"

        // 1. Try custom domain first (exact match).
        $workspace = Workspace::query()
            ->where('custom_domain', $host)
            ->first();

        if ($workspace) {
            return $workspace;
        }

        // 2. Fall back to subdomain slug (strip the base domain).
        // Base domain is derived from APP_BASE_DOMAIN, e.g. "app.com".
        $baseDomain = config('app.base_domain'); // e.g. "app.com"
        $subdomain  = str_before($host, '.' . $baseDomain);

        if ($subdomain === $host) {
            // No subdomain detected — host IS the base domain (landing page, API, etc.)
            return null;
        }

        return Workspace::query()
            ->where('slug', $subdomain)
            ->first();
    }
}
