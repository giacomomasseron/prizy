<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(array $filters, array $sorts, int $limit, ?string $starredBy = null)
 */
final class ListIssues extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly IssueRepository $issues) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @param  array<string, string>  $filters
     * @param  list<array{column:string,dir:string}>  $sorts
     * @param  string|null  $starredBy  the caller: `filter[starred]=true` keeps only this user's starred issues
     */
    private function execute(array $filters, array $sorts, int $limit, ?string $starredBy = null): CursorPaginator
    {
        return $this->issues->paginate($filters, $sorts, $limit, $starredBy);
    }
}
