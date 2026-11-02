<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Repositories\ProjectMessageRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * A page of a project's chat (PRD §3.2.11): the newest messages first; `after` pages back in time.
 *
 * @method CursorPaginator run(string $projectId, int $limit)
 */
final class ListProjectMessages extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ProjectMessageRepository $messages) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $projectId, int $limit): CursorPaginator
    {
        return $this->messages->paginateForProject($projectId, $limit);
    }
}
