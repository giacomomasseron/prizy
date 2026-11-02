<?php
declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\DB;

/**
 * @method static void run(User $actor, Team $team, string $userId)
 */
final class RemoveTeamMember extends BaseUseCase implements UseCaseInterface
{
    public function handle(mixed ...$arguments): mixed
    {
        $this->execute(...$arguments);

        return null;
    }

    private function execute(User $actor, Team $team, string $userId): void
    {
        // Idempotent hard delete (team_members has no soft-delete; a team may be left empty).
        DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', $userId)->delete();
    }
}
