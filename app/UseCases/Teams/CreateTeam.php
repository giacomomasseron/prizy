<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Models\Team;
use App\Models\User;
use App\Repositories\TeamRepository;

final class CreateTeam
{
    public function __construct(private readonly TeamRepository $teams) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Team
    {
        return $this->teams->create([
            'name'       => $data['name'],
            'identifier' => $data['identifier'],
            'color'      => $data['color'] ?? '#6366f1',
        ]);
    }
}
