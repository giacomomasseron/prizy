<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Repositories\TeamRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindTeam
{
    public function __construct(private readonly TeamRepository $teams) {}

    public function handle(string $id): Team
    {
        $team = $this->teams->findInWorkspace($id);
        if ($team === null) {
            throw (new ModelNotFoundException())->setModel(Team::class, [$id]);
        }

        return $team;
    }
}
