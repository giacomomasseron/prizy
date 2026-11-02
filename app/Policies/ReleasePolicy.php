<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Release;
use App\Models\User;

final class ReleasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_developer;
    }

    public function view(User $user, Release $release): bool
    {
        return $user->is_developer && $user->workspace_id === $release->workspace_id;
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, Release $release): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $release->workspace_id;
    }

    public function delete(User $user, Release $release): bool
    {
        return $this->update($user, $release);
    }
}
