<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;

/**
 * Reads the workspace-level support-module switch.
 *
 * The actor-facing predicate is User::canWorkHelpdesk() (is_agent AND this
 * switch) — it lives on the entity so the policy layer can ask it too. This
 * service is the abort-403 choke point use cases call, plus the workspace-only
 * question for callers that have no actor: middleware, background jobs and
 * serialization. SlaBreachRepository filters in SQL instead, which no PHP
 * predicate can do for it.
 */
final class HelpdeskAccess
{
    public static function gate(User $actor): void
    {
        abort_unless($actor->canWorkHelpdesk(), 403);
    }

    /**
     * Is the support module on for this workspace?
     *
     * Prefers the already-resolved tenant: this runs ahead of the throttle on
     * the public help centre, so an unauthenticated request must not cost a
     * query. It falls back to the table whenever that instance is absent, is a
     * different workspace, or does not carry the column — a tenant made current
     * from a model built in memory holds only what that model was given.
     */
    public static function enabledFor(string $workspaceId): bool
    {
        $current = Workspace::current();

        if ($current !== null
            && (string) $current->getKey() === $workspaceId
            && $current->getAttribute('helpdesk_enabled') !== null) {
            return (bool) $current->getAttribute('helpdesk_enabled');
        }

        return (bool) Workspace::query()->whereKey($workspaceId)->value('helpdesk_enabled');
    }
}
