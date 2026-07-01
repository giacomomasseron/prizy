<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Models\Cycle;
use App\Models\Team;
use App\Models\User;
use App\Repositories\CycleRepository;
use Illuminate\Validation\ValidationException;

final class CreateCycle
{
    public function __construct(private readonly CycleRepository $cycles) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Cycle
    {
        if (Team::find((string) $data['team_id']) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        return $this->cycles->create([
            'team_id'   => $data['team_id'],
            'name'      => $data['name'],
            'starts_at' => $data['starts_at'],
            'ends_at'   => $data['ends_at'],
        ]);
    }
}
