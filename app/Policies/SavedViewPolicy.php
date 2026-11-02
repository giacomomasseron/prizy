<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SavedView;
use App\Models\User;

final class SavedViewPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_developer;
    }

    public function view(User $user, SavedView $view): bool
    {
        return $user->workspace_id === $view->workspace_id;
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, SavedView $view): bool
    {
        if ($user->workspace_id !== $view->workspace_id) {
            return false;
        }

        return $user->id === $view->created_by || in_array($user->admin_level, ['owner', 'admin'], true);
    }

    public function delete(User $user, SavedView $view): bool
    {
        return $this->update($user, $view);
    }
}
