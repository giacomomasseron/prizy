<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use App\Repositories\TeamRepository;
use Illuminate\Validation\ValidationException;

final class UpdateTeam
{
    public function __construct(private readonly TeamRepository $teams) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Team
    {
        $team = $this->teams->findInWorkspace((string) $data['team_id']);
        if ($team === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        return $this->teams->update($team, array_intersect_key($data, array_flip(['name', 'identifier', 'color'])));
    }
}
