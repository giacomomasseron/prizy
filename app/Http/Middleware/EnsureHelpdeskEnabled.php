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
 * Runs after NeedsTenant, so the workspace is resolved. The switch is read from
 * the workspaces table rather than off the resolved tenant instance, which is
 * not guaranteed to carry every column (a tenant made current from a model
 * built in memory carries only what that model was given).
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
