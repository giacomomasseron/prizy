<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class RemoveTeamMember
{
    public function handle(User $actor, Team $team, string $userId): void
    {
        // Idempotent hard delete (team_members has no soft-delete; a team may be left empty).
        DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', $userId)->delete();
    }
}
