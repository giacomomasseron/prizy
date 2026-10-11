<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Repositories\ProjectMessageRepository;
use Illuminate\Pagination\CursorPaginator;

/** A page of a project's chat (PRD §3.2.11): the newest messages first; `after` pages back in time. */
final class ListProjectMessages
{
    public function __construct(private readonly ProjectMessageRepository $messages) {}

    public function handle(string $projectId, int $limit): CursorPaginator
    {
        return $this->messages->paginateForProject($projectId, $limit);
    }
}
