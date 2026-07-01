<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Repositories\ProjectRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListProjects
{
    public function __construct(private readonly ProjectRepository $projects) {}

    /** @param array<string, string> $filters */
    public function handle(array $filters, int $limit): CursorPaginator
    {
        return $this->projects->paginate($filters, $limit);
    }
}
