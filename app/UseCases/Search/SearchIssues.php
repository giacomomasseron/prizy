<?php

declare(strict_types=1);

namespace App\UseCases\Search;

use App\Models\User;
use App\Repositories\SearchRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * @method LengthAwarePaginator run(User $actor, string $q, array $filters, string $sort, int $page)
 */
final class SearchIssues extends BaseUseCase implements UseCaseInterface
{
    private const PER_PAGE = 20;

    public function __construct(private readonly SearchRepository $search) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /** @param array<string,string> $filters */
    private function execute(User $actor, string $q, array $filters, string $sort, int $page): LengthAwarePaginator
    {
        $q = trim($q);
        if ($q === '') {
            return $this->search->browseIssues($actor->workspace_id, $filters, $sort, $page, self::PER_PAGE);
        }

        return $this->search->searchIssues($actor->workspace_id, $q, $filters, $sort, $page, self::PER_PAGE);
    }
}
