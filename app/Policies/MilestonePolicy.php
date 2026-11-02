<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Milestone;
use App\Models\User;

final class MilestonePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_developer;
    }

    public function view(User $user, Milestone $milestone): bool
    {
        return true; // workspace reachability enforced by FindMilestone (via project)
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, Milestone $milestone): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function delete(User $user, Milestone $milestone): bool
    {
        return $this->update($user, $milestone);
    }
}
