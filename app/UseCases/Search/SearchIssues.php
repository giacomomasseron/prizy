<?php

declare(strict_types=1);

namespace App\UseCases\Search;

use App\Models\User;
use App\Repositories\SearchRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\LengthAwarePaginator as ConcretePaginator;

final class SearchIssues
{
    private const PER_PAGE = 20;

    public function __construct(private readonly SearchRepository $search) {}

    /** @param array{status?: string, team_id?: string} $filters */
    public function handle(User $actor, string $q, array $filters, int $page): LengthAwarePaginator
    {
        $q = trim($q);
        if ($q === '') {
            return new ConcretePaginator([], 0, self::PER_PAGE, $page);
        }

        return $this->search->searchIssues($actor->workspace_id, $q, $filters, $page, self::PER_PAGE);
    }
}
