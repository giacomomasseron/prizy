<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\TeamMember;

final class ListTeamMembers
{
    /** @return list<array{id:string,name:string,email:string,role:string}> */
    public function handle(Team $team): array
    {
        return TeamMember::where('team_id', $team->id)
            ->with('user:id,name,email')
            ->get()
            ->sortBy([['role', 'asc'], ['user.name', 'asc']]) // 'lead' < 'member'
            ->values()
            ->map(fn (TeamMember $tm): array => [
                'id'    => $tm->user->id,
                'name'  => $tm->user->name,
                'email' => $tm->user->email,
                'role'  => $tm->role,
            ])
            ->all();
    }
}
