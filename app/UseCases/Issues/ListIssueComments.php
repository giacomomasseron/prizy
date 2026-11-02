<?php

declare(strict_types=1);

namespace App\UseCases\Issues;

use App\Repositories\IssueCommentRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method static CursorPaginator run(string $issueId, int $limit)
 */
final class ListIssueComments extends BaseUseCase implements UseCaseInterface
{
    private readonly IssueCommentRepository $comments;

    public function handle(mixed ...$arguments): mixed
    {
        $this->comments = app(IssueCommentRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $issueId, int $limit): CursorPaginator
    {
        return $this->comments->paginateForIssue($issueId, $limit);
    }
}
