<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(string $projectId, int $limit)
 */
final class ListMilestones extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly MilestoneRepository $milestones) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $projectId, int $limit): CursorPaginator
    {
        return $this->milestones->paginateForProject($projectId, $limit);
    }
}
