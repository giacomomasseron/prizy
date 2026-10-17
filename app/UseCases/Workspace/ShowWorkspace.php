<?php

declare(strict_types=1);

namespace App\UseCases\Workspace;

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;

/**
 * The actor's own workspace: its name, address and mark colour, and how many
 * members and teams it holds, which the delete confirmation spells out before
 * anything is lost. Nothing here is hidden from any member, so any member may
 * read it.
 */
final class ShowWorkspace
{
    /**
     * @return array{id: string, name: string, slug: string, color: string|null, helpdesk_enabled: bool, member_count: int, team_count: int}
     */
    public function handle(User $actor): array
    {
        /** @var Workspace $workspace */
        $workspace = Workspace::query()->findOrFail($actor->workspace_id);

        return [
            'id'               => $workspace->id,
            'name'             => $workspace->name,
            'slug'             => $workspace->slug,
            'color'            => $workspace->color,
            'helpdesk_enabled' => $workspace->helpdesk_enabled,
            'member_count'     => User::query()->where('workspace_id', $workspace->id)->count(),
            'team_count'       => Team::query()->where('workspace_id', $workspace->id)->count(),
        ];
    }
}
