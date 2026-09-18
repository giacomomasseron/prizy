<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Services\HelpdeskAccess;

/**
 * The workspace-level module switches, for the actor's own workspace.
 *
 * Rides along on /v1/me because the SPA needs them at the same moment it needs
 * the capability flags: both decide what the navigation offers.
 */
final class ShowWorkspaceModules
{
    /** @return array{helpdesk_enabled: bool} */
    public function handle(User $actor): array
    {
        return ['helpdesk_enabled' => HelpdeskAccess::enabledFor($actor->workspace_id)];
    }
}
