<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

// Workspace-wide channel: live board/issue activity for all members of a workspace.
Broadcast::channel('workspace.{workspaceId}', function (User $user, string $workspaceId): bool {
    return $user->workspace_id === $workspaceId;
});

// Per-user channel: personal notifications (assigned, unblocked).
Broadcast::channel('users.{userId}', function (User $user, string $userId): bool {
    return $user->id === $userId;
});

// Project channel: a project's chat (PRD §3.2.11), live (private-project.{id}) and who is in it (presence-project.{id}),
// for the workspace's tracker users. The answer is also the presence member info.
Broadcast::channel('project.{projectId}', function (User $user, string $projectId): array|false {
    if (! Str::isUuid($projectId) || Gate::forUser($user)->denies('viewAny', Project::class)) {
        return false;
    }
    $project = Project::query()->find($projectId);

    return $project !== null && Gate::forUser($user)->allows('view', $project)
        ? ['id' => $user->id, 'name' => $user->name]
        : false;
});
