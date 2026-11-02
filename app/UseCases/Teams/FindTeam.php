<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * @method static Team run(string $id)
 */
final class FindTeam extends BaseUseCase implements UseCaseInterface
{
    private readonly TeamRepository $teams;

    public function handle(mixed ...$arguments): mixed
    {
        $this->teams = app(TeamRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $id): Team
    {
        $team = $this->teams->findInWorkspace($id);
        if ($team === null) {
            throw (new ModelNotFoundException())->setModel(Team::class, [$id]);
        }

        return $team;
    }
}
