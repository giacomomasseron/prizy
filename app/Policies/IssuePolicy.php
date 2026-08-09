<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Issue;
use App\Models\User;

/**
 * Axis-1 (admin_level) + Axis-2 (is_developer) guard for Issue CRUD.
 * Gate::before() handles the owner short-circuit before any method here runs.
 *
 * Class-level abilities (viewAny, create): receive only User.
 * Model-level abilities (view, update, delete): also verify same-workspace membership.
 */
final class IssuePolicy
{
    /** Listing issues requires developer capability. */
    public function viewAny(User $user): bool
    {
        return $user->is_developer;
    }

    /** Any same-workspace member may read a specific issue. */
    public function view(User $user, Issue $issue): bool
    {
        return $user->workspace_id === $issue->workspace_id;
    }

    /** Creating an issue requires developer capability and a non-viewer level. */
    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    /** Updating an issue requires developer + non-viewer + same workspace. */
    public function update(User $user, Issue $issue): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $issue->workspace_id;
    }

    /** Deleting an issue requires developer + non-viewer + same workspace. */
    public function delete(User $user, Issue $issue): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $issue->workspace_id;
    }
}
