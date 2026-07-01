<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Label;
use App\Models\User;

final class LabelPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Label $label): bool
    {
        return $user->workspace_id === $label->workspace_id;
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, Label $label): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $label->workspace_id;
    }

    public function delete(User $user, Label $label): bool
    {
        return $this->update($user, $label);
    }
}
