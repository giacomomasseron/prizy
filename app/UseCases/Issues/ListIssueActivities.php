<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueActivityRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method static CursorPaginator run(string $issueId, int $limit)
 */
final class ListIssueActivities extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueActivityRepository $activities;

    public function handle(mixed ...$arguments): mixed
    {
        $this->activities = app(IssueActivityRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $issueId, int $limit): CursorPaginator
    {
        return $this->activities->paginateForIssue($issueId, $limit);
    }
}
