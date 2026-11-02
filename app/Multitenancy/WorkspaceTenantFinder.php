<?php

declare(strict_types=1);

namespace App\Multitenancy;

use Illuminate\Http\Request;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\TenantFinder\TenantFinder;
use App\Models\Workspace;
use App\Services\SignupHost;
use App\Services\WorkspaceUrl;

final class WorkspaceTenantFinder extends TenantFinder
{
    public function findForRequest(Request $request): ?IsTenant
    {
        // e.g. "acme.app.com" or "support.acme.com". getHost() lowercases and
        // drops the port, but keeps a fully qualified trailing dot.
        $host = rtrim($request->getHost(), '.');

        // The sign-up host is never a workspace, whatever slug it looks like
        // (a workspace named "signup" from before the name was reserved).
        if ($host === SignupHost::host()) {
            return null;
        }

        // Only activated workspaces: a pending sign-up stays unreachable until
        // its owner confirms (AuthorizeTlsHost applies the same filter).

        // 1. Try custom domain first (exact match).
        $workspace = Workspace::query()
            ->activated()
            ->where('custom_domain', $host)
            ->first();

        if ($workspace) {
            return $workspace;
        }

        // 2. Fall back to the subdomain slug: "{slug}.APP_BASE_DOMAIN" exactly.
        // The base domain itself, a deeper subdomain, or a foreign host that
        // merely contains the base domain names no workspace.
        $slug = WorkspaceUrl::slugFromHost($host);

        if ($slug === null) {
            return null;
        }

        return Workspace::query()
            ->activated()
            ->where('slug', $slug)
            ->first();
    }
}
