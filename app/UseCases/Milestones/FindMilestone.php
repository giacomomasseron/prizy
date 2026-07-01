<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Models\Milestone;
use App\Repositories\MilestoneRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindMilestone
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    public function handle(string $id): Milestone
    {
        $milestone = $this->milestones->findViaWorkspace($id);
        if ($milestone === null) {
            throw (new ModelNotFoundException())->setModel(Milestone::class, [$id]);
        }

        return $milestone;
    }
}
