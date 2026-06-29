<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueCommentRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListIssueComments
{
    public function __construct(
        private readonly IssueCommentRepository $comments,
    ) {}

    public function handle(string $issueId, int $limit): CursorPaginator
    {
        return $this->comments->paginateForIssue($issueId, $limit);
    }
}
