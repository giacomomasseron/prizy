<?php

declare(strict_types=1);

namespace App\UseCases\Members;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

final class ListWorkspaceMembers
{
    /**
     * @return array{members: Collection<int, User>, invitations: Collection<int, Invitation>}
     */
    public function handle(User $actor): array
    {
        $members = User::where('workspace_id', $actor->workspace_id)
            ->withoutTrashed()
            ->with(['teamMembers.team'])
            ->orderBy('name')
            ->get();

        $invitations = Invitation::where('workspace_id', $actor->workspace_id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->orderBy('created_at')
            ->get();

        return ['members' => $members, 'invitations' => $invitations];
    }
}
