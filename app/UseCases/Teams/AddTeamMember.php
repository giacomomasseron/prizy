<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AddTeamMember
{
    /**
     * @param array{user_id:string,role?:string} $data
     * @return array{id:string,name:string,email:string,role:string}
     */
    public function handle(User $actor, Team $team, array $data): array
    {
        $userId = (string) $data['user_id'];
        $role = ($data['role'] ?? 'member') === 'lead' ? 'lead' : 'member';

        // Tenancy: the user must be a member of the actor's workspace.
        $user = User::where('workspace_id', $actor->workspace_id)->find($userId);
        if ($user === null) {
            throw ValidationException::withMessages(['user_id' => ['The selected user is invalid.']]);
        }

        // No duplicates.
        $already = DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', $userId)->exists();
        if ($already) {
            throw ValidationException::withMessages(['user_id' => ['Already a member of this team.']]);
        }

        DB::transaction(function () use ($team, $userId, $role): void {
            if ($role === 'lead') {
                DB::table('team_members')
                    ->where('team_id', $team->id)->where('role', 'lead')
                    ->update(['role' => 'member']);
            }
            DB::table('team_members')->insert([
                'team_id' => $team->id, 'user_id' => $userId, 'role' => $role, 'created_at' => now(),
            ]);
        });

        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $role];
    }
}
