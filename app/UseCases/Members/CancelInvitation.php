<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Invitation;
use App\Models\User;

final class CancelInvitation
{
    /**
     * Cancel a pending invitation by ID.
     *
     * The workspace-scoped findOrFail yields a 404 for any cross-workspace
     * or missing invitation ID, so no explicit workspace check is needed.
     */
    public function handle(User $actor, string $invitationId): void
    {
        Invitation::where('workspace_id', $actor->workspace_id)
            ->findOrFail($invitationId)
            ->delete();
    }
}
