<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

final class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Team $team): bool
    {
        return $user->workspace_id === $team->workspace_id;
    }

    public function create(User $user): bool
    {
        return $user->admin_level === 'admin'; // owner handled by Gate::before
    }

    public function update(User $user, Team $team): bool
    {
        return $user->admin_level === 'admin' && $user->workspace_id === $team->workspace_id;
    }

    public function delete(User $user, Team $team): bool
    {
        return $this->update($user, $team);
    }
}
