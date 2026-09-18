<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;

/**
 * The single place that answers "may this actor work in the support module?".
 *
 * Two independent conditions, and both must hold: the per-user `is_agent`
 * capability from roles.md, and the workspace-level `helpdesk_enabled` switch.
 * Use cases call gate() rather than testing `is_agent` themselves, so a
 * workspace that has turned the module off cannot be reached through an
 * endpoint somebody forgot to update. HelpdeskAccessTest enforces that.
 */
final class HelpdeskAccess
{
    public static function gate(User $actor): void
    {
        abort_unless(self::allows($actor), 403);
    }

    public static function allows(User $actor): bool
    {
        return $actor->canWorkHelpdesk();
    }

    /**
     * Reads the switch straight from the workspaces table: the module may be
     * checked for a workspace that isn't the resolved tenant (background jobs
     * iterate every workspace).
     */
    public static function enabledFor(string $workspaceId): bool
    {
        return (bool) Workspace::query()->whereKey($workspaceId)->value('helpdesk_enabled');
    }
}
