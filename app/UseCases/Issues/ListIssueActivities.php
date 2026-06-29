<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueActivityRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListIssueActivities
{
    public function __construct(
        private readonly IssueActivityRepository $activities,
    ) {}

    public function handle(string $issueId, int $limit): CursorPaginator
    {
        return $this->activities->paginateForIssue($issueId, $limit);
    }
}
