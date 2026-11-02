<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Support\Facades\DB;

/**
 * @method static Team run(User $actor, array $data)
 */
final class CreateTeam extends BaseUseCase implements UseCaseInterface
{
    private readonly TeamRepository $teams;

    public function handle(mixed ...$arguments): mixed
    {
        $this->teams = app(TeamRepository::class);

        return $this->execute(...$arguments);
    }

    /** @param array<string, mixed> $data */
    private function execute(User $actor, array $data): Team
    {
        return DB::transaction(function () use ($actor, $data) {
            $team = $this->teams->create([
                'name'       => $data['name'],
                'identifier' => $data['identifier'],
                'color'      => $data['color'] ?? '#6366f1',
            ]);
            $this->teams->addMember($team->id, $actor->id, 'lead');

            return $team;
        });
    }
}
