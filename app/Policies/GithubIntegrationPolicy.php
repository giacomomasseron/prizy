<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

final class GithubIntegrationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->admin_level === 'admin'; // owner handled by Gate::before
    }

    public function update(User $user): bool
    {
        return $user->admin_level === 'admin'; // owner handled by Gate::before
    }
}
