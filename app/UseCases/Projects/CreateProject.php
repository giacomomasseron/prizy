<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Validation\ValidationException;

final class CreateProject
{
    public function __construct(private readonly ProjectRepository $projects) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Project
    {
        $teamId = $data['team_id'] ?? null;
        if ($teamId !== null && Team::find($teamId) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        return $this->projects->create([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'icon'        => $data['icon'] ?? null,
            'color'       => $data['color'] ?? '#6366f1',
            'status'      => $data['status'] ?? 'planning',
            'team_id'     => $teamId,
            'start_date'  => $data['start_date'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'created_by'  => $actor->id,
        ]);
    }
}
