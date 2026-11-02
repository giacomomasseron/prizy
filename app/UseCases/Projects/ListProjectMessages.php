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
 * @method static CursorPaginator run(string $projectId, int $limit)
 */
final class ListProjectMessages extends BaseUseCase implements UseCaseInterface
{
    private readonly ProjectMessageRepository $messages;

    public function handle(mixed ...$arguments): mixed
    {
        $this->messages = app(ProjectMessageRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $projectId, int $limit): CursorPaginator
    {
        return $this->messages->paginateForProject($projectId, $limit);
    }
}
