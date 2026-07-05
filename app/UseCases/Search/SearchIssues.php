<?php

declare(strict_types=1);

namespace App\UseCases\Search;

use App\Models\User;
use App\Repositories\SearchRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class SearchIssues
{
    private const PER_PAGE = 20;

    public function __construct(private readonly SearchRepository $search) {}

    /** @param array<string,string> $filters */
    public function handle(User $actor, string $q, array $filters, string $sort, int $page): LengthAwarePaginator
    {
        $q = trim($q);
        if ($q === '') {
            return $this->search->browseIssues($actor->workspace_id, $filters, $sort, $page, self::PER_PAGE);
        }

        return $this->search->searchIssues($actor->workspace_id, $q, $filters, $sort, $page, self::PER_PAGE);
    }
}
