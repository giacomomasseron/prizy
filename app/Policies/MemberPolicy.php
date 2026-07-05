<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * Axis-1 (admin_level) guard for member-management operations.
 * Mapped to User::class (the model being managed, not the actor).
 * Gate::before() handles the owner short-circuit before any method here runs.
 */
final class MemberPolicy
{
    /** Inviting a new member requires admin or owner level. */
    public function invite(User $user): bool
    {
        return in_array($user->admin_level, ['admin', 'owner'], true);
    }

    /**
     * Changing a member's role requires admin or owner level,
     * and both the actor and target must be in the same workspace.
     */
    public function changeRole(User $user, User $member): bool
    {
        return $user->workspace_id === $member->workspace_id
            && in_array($user->admin_level, ['admin', 'owner'], true);
    }

    /** Viewing the rich workspace member list (with invitations) is owner/admin only. */
    public function viewWorkspaceMembers(User $user): bool
    {
        return in_array($user->admin_level, ['owner', 'admin'], true);
    }
}
