<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

final class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_developer;
    }

    public function view(User $user, Project $project): bool
    {
        return $user->workspace_id === $project->workspace_id;
    }

    public function create(User $user): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer';
    }

    public function update(User $user, Project $project): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $project->workspace_id;
    }

    /**
     * Post in the project chat (PRD §3.2.11): tracker users who can see the project, except viewers (read-only).
     * Owners pass through Gate::before. Editing or deleting a message is the author's alone (the use cases).
     */
    public function chat(User $user, Project $project): bool
    {
        return $user->is_developer && $user->admin_level !== 'viewer' && $user->workspace_id === $project->workspace_id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }
}
