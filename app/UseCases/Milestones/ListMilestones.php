<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Repositories\MilestoneRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListMilestones
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    public function handle(string $projectId, int $limit): CursorPaginator
    {
        return $this->milestones->paginateForProject($projectId, $limit);
    }
}
