<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\TeamMember;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;

/**
 * @method array run(Team $team)
 */
final class ListTeamMembers extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @return list<array{id:string,name:string,email:string,role:string}> */
    private function execute(Team $team): array
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
