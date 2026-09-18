<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\User;
use App\Models\Workspace;

/**
 * Workspace-level configuration, owner or admin only.
 *
 * roles.md puts "workspace configuration (members, roles, integrations,
 * settings)" under the admin level, with the owner above it. Capability-in-
 * use-case for the same reason as ExportWorkspace: the check is on the actor's
 * admin_level, which no policy decides.
 *
 * Always acts on the actor's own workspace — there is no workspace id in the
 * request to get wrong.
 */
final class UpdateWorkspaceSettings
{
    /** @param array<string, mixed> $data Validated subset of: helpdesk_enabled */
    public function handle(User $actor, array $data): Workspace
    {
        abort_unless(in_array($actor->admin_level, ['owner', 'admin'], true), 403);

        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        $allowed = ['helpdesk_enabled'];
        $workspace->fill(array_filter($data, fn (string $k): bool => in_array($k, $allowed, true), ARRAY_FILTER_USE_KEY));
        $workspace->save();

        return $workspace->fresh();
    }
}
