<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\User;
use App\Repositories\MilestoneRepository;
use Illuminate\Validation\ValidationException;

final class CreateMilestone
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Milestone
    {
        if (Project::find((string) $data['project_id']) === null) {
            throw ValidationException::withMessages(['project_id' => ['The selected project is invalid.']]);
        }

        return $this->milestones->create([
            'project_id'  => $data['project_id'],
            'name'        => $data['name'],
            'target_date' => $data['target_date'],
        ]);
    }
}
