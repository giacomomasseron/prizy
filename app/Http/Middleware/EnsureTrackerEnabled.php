<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Services\TrackerAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Closes the issue tracker of a workspace that has turned it off.
 *
 * The tracker's pages answer 404, as the support pages do when that module is
 * off; its API answers 403 (`EnsureTrackerEnabled::class.':403'`), since the
 * caller there is signed in and a capability error is the honest answer.
 *
 * This is the whole switch on the request path. The tracker's policies cannot
 * carry it: Gate::before hands an owner every one of them, and the owner is
 * exactly who must be shut out too. So it sits on the routes, in front of the
 * policies, and TrackerRoutesTest checks that no tracker route goes without it.
 *
 * Like EnsureHelpdeskEnabled, it does not assume a resolved tenant: it fails
 * closed without one, and TrackerAccess falls back to the table when the
 * instance is partial.
 */
final class EnsureTrackerEnabled
{
    public function handle(Request $request, Closure $next, string $status = '404'): Response
    {
        $workspace = Workspace::current();

        abort_unless($workspace !== null && TrackerAccess::enabledFor($workspace->id), (int) $status);

        return $next($request);
    }
}
