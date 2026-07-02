<?php

declare(strict_types=1);

namespace App\UseCases\Roadmap;

use App\Repositories\ProjectRepository;
use Illuminate\Database\Eloquent\Collection;

final class ListRoadmap
{
    public function __construct(private readonly ProjectRepository $projects) {}

    /** @return Collection<int, \App\Models\Project> */
    public function handle(): Collection
    {
        return $this->projects->allWithMilestones();
    }
}
