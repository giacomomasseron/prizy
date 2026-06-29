<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListIssues
{
    public function __construct(
        private readonly IssueRepository $issues,
    ) {}

    /**
     * @param  array<string, string>  $filters
     * @param  list<array{column:string,dir:string}>  $sorts
     */
    public function handle(array $filters, array $sorts, int $limit): CursorPaginator
    {
        return $this->issues->paginate($filters, $sorts, $limit);
    }
}
