<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Cycle;
use App\Models\User;

final class CyclePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Cycle $cycle): bool
    {
        return true; // workspace reachability enforced by FindCycle (via team)
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, Cycle $cycle): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function delete(User $user, Cycle $cycle): bool
    {
        return $this->update($user, $cycle);
    }
}
