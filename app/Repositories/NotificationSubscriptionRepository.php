<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\NotificationSubscription;
use App\Models\TeamMember;

final class NotificationSubscriptionRepository
{
    public const SCOPE_TYPES = ['team', 'project'];

    public const LEVELS = ['all', 'mentions', 'off'];

    /**
     * A project-scoped row overrides a team-scoped row; absent rows default to 'all'.
     */
    public function levelFor(string $userId, string $teamId, ?string $projectId): string
    {
        if ($projectId !== null) {
            $projectRow = NotificationSubscription::query()
                ->where('user_id', $userId)
                ->where('scope_type', 'project')
                ->where('scope_id', $projectId)
                ->first();

            if ($projectRow !== null) {
                return $projectRow->level;
            }
        }

        $teamRow = NotificationSubscription::query()
            ->where('user_id', $userId)
            ->where('scope_type', 'team')
            ->where('scope_id', $teamId)
            ->first();

        if ($teamRow !== null) {
            return $teamRow->level;
        }

        return 'all';
    }

    /** workspace_id is auto-filled from the active tenant by BelongsToWorkspace; id is auto-filled on create by the model. */
    public function setSubscription(string $userId, string $scopeType, string $scopeId, string $level): void
    {
        NotificationSubscription::updateOrCreate(
            ['user_id' => $userId, 'scope_type' => $scopeType, 'scope_id' => $scopeId],
            ['level' => $level],
        );
    }

    /**
     * The user's stored subscription rows, scoped to teams they belong to.
     * SP5 will default un-rowed member-teams to 'all'; this returns only what's stored.
     *
     * @return array<int, array{scope_type: string, scope_id: string, level: string}>
     */
    public function listFor(string $userId): array
    {
        $teamIds = TeamMember::query()
            ->where('user_id', $userId)
            ->pluck('team_id');

        return NotificationSubscription::query()
            ->where('user_id', $userId)
            ->where('scope_type', 'team')
            ->whereIn('scope_id', $teamIds)
            ->get()
            ->map(fn (NotificationSubscription $row): array => [
                'scope_type' => $row->scope_type,
                'scope_id' => $row->scope_id,
                'level' => $row->level,
            ])
            ->all();
    }
}
