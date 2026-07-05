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

    /**
     * Updating a member's admin_level or capability flags requires owner or admin level,
     * and both the actor and target must be in the same workspace.
     * Business-logic guards (e.g. admin cannot touch an owner) are enforced in UpdateMember.
     */
    public function update(User $actor, User $target): bool
    {
        return $actor->workspace_id === $target->workspace_id
            && in_array($actor->admin_level, ['owner', 'admin'], true);
    }

    /**
     * Removing a member requires owner or admin level, and both must be in the same workspace.
     * Business-logic guards (cannot remove self, admin cannot remove owner, last-owner) are
     * enforced in RemoveMember after Gate::authorize runs.
     */
    public function delete(User $actor, User $target): bool
    {
        return $actor->workspace_id === $target->workspace_id
            && in_array($actor->admin_level, ['owner', 'admin'], true);
    }
}
