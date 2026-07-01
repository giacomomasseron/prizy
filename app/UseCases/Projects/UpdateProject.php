<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Models\Project;
use App\Models\Team;
use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

final class UpdateProject
{
    public function __construct(private readonly ProjectRepository $projects) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Project
    {
        $project = $this->projects->findInWorkspace((string) $data['project_id']);
        if ($project === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }
        if (array_key_exists('team_id', $data) && $data['team_id'] !== null && Team::find($data['team_id']) === null) {
            throw ValidationException::withMessages(['team_id' => ['The selected team is invalid.']]);
        }

        $startDate  = $data['start_date']  ?? $project->start_date;
        $targetDate = $data['target_date'] ?? $project->target_date;
        if ($startDate !== null && $targetDate !== null) {
            if (Carbon::parse($targetDate)->lessThan(Carbon::parse($startDate))) {
                throw ValidationException::withMessages(['target_date' => ['The target date must be a date after or equal to start date.']]);
            }
        }

        return $this->projects->update($project, array_intersect_key(
            $data,
            array_flip(['name', 'description', 'icon', 'color', 'status', 'team_id', 'start_date', 'target_date']),
        ));
    }
}
