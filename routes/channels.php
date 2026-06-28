<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Workspace-wide channel: live board/issue activity for all members of a workspace.
Broadcast::channel('workspace.{workspaceId}', function (User $user, string $workspaceId): bool {
    return $user->workspace_id === $workspaceId;
});

// Per-user channel: personal notifications (assigned, unblocked).
Broadcast::channel('users.{userId}', function (User $user, string $userId): bool {
    return $user->id === $userId;
});
