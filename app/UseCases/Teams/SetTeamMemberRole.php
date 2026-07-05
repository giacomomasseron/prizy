<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class SetTeamMemberRole
{
    /** @return array{id:string,name:string,email:string,role:string} */
    public function handle(User $actor, Team $team, string $userId, string $role): array
    {
        $role = $role === 'lead' ? 'lead' : 'member';
        $exists = DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', $userId)->exists();
        abort_unless($exists, 404);

        DB::transaction(function () use ($team, $userId, $role): void {
            if ($role === 'lead') {
                DB::table('team_members')
                    ->where('team_id', $team->id)->where('role', 'lead')
                    ->update(['role' => 'member']);
            }
            DB::table('team_members')
                ->where('team_id', $team->id)->where('user_id', $userId)
                ->update(['role' => $role]);
        });

        $user = User::where('workspace_id', $actor->workspace_id)->findOrFail($userId);
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $role];
    }
}
