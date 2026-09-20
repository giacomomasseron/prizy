<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Services\HelpdeskAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Closes the customer-facing and desk surfaces of a workspace that has turned
 * the support module off.
 *
 * 404 rather than 403: these pages are reachable without signing in, and a
 * workspace that doesn't run a help desk shouldn't advertise one it refuses to
 * open. The agent-side API answers 403 instead — the caller is authenticated
 * there, and a capability error is the honest answer.
 *
 * Ordering: the priority-list entry in bootstrap/app.php puts this ahead of the
 * authentication contract (so a guest on a portal route gets the 404 rather
 * than a redirect to a sign-in page that is itself gone), which also hoists it
 * above NeedsTenant. That is safe because spatie/laravel-multitenancy resolves
 * the tenant in its service provider's boot, not in NeedsTenant — but this
 * middleware must not assume a resolved tenant, so it fails closed when there
 * is none and HelpdeskAccess falls back to the table when the instance is
 * partial.
 */
final class EnsureHelpdeskEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $workspace = Workspace::current();

        abort_unless($workspace !== null && HelpdeskAccess::enabledFor($workspace->id), 404);

        return $next($request);
    }
}
