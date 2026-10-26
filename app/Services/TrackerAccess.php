<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Workspace;

/**
 * Reads the workspace-level issue-tracker switch.
 *
 * Unlike the support module, the tracker is not closed use case by use case:
 * its policies hand an owner everything (Gate::before), so the switch sits in
 * front of them instead, as EnsureTrackerEnabled on every tracker route. This
 * is the question that middleware asks, and what the support side asks before
 * showing anything of the bridge (a ticket's linked issues, the "escalated to
 * engineering" line customers see).
 */
final class TrackerAccess
{
    /**
     * Is the tracker on for this workspace?
     *
     * Prefers the already-resolved tenant, so a request does not pay a query
     * for it, and falls back to the table whenever that instance is absent, is
     * a different workspace, or does not carry the column — a tenant made
     * current from a model built in memory holds only what that model was given.
     */
    public static function enabledFor(string $workspaceId): bool
    {
        $current = Workspace::current();

        if ($current !== null
            && (string) $current->getKey() === $workspaceId
            && $current->getAttribute('tracker_enabled') !== null) {
            return (bool) $current->getAttribute('tracker_enabled');
        }

        return (bool) Workspace::query()->whereKey($workspaceId)->value('tracker_enabled');
    }
}
