<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

/**
 * Axis-1 (admin_level) guard for Workspace-level operations.
 * Gate::before() handles the owner short-circuit (billing/delete never reach here for owners).
 *
 * The workspace_id check (`$user->workspace_id === $workspace->id`) confirms the acting
 * user belongs to the workspace being operated on — a defence-in-depth safeguard on top
 * of the host-based tenant resolution done by NeedsTenant middleware.
 */
final class WorkspacePolicy
{
    /** Changing workspace settings requires admin or owner level. */
    public function updateSettings(User $user, Workspace $workspace): bool
    {
        return $user->workspace_id === $workspace->id
            && in_array($user->admin_level, ['admin', 'owner'], true);
    }

    /** Billing operations are owner-only; Gate::before short-circuits for owners. */
    public function manageBilling(User $user, Workspace $workspace): bool
    {
        return $user->workspace_id === $workspace->id && $user->admin_level === 'owner';
    }

    /** Deleting a workspace is owner-only; Gate::before short-circuits for owners. */
    public function delete(User $user, Workspace $workspace): bool
    {
        return $user->workspace_id === $workspace->id && $user->admin_level === 'owner';
    }
}
