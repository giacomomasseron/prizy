<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Models\User;
use App\Repositories\MilestoneRepository;
use Illuminate\Validation\ValidationException;

final class UpdateMilestone
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    /** @param array<string, mixed> $data */
    public function handle(User $actor, array $data): Milestone
    {
        $milestone = $this->milestones->findViaWorkspace((string) $data['milestone_id']);
        if ($milestone === null) {
            throw ValidationException::withMessages(['milestone_id' => ['The selected milestone is invalid.']]);
        }

        return $this->milestones->update($milestone, array_intersect_key($data, array_flip(['name', 'target_date'])));
    }
}
