<?php

declare(strict_types=1);

namespace App\UseCases\Milestones;

use App\Repositories\MilestoneRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method static CursorPaginator run(string $projectId, int $limit)
 */
final class ListMilestones extends BaseUseCase implements UseCaseInterface
{
    private readonly MilestoneRepository $milestones;

    public function handle(mixed ...$arguments): mixed
    {
        $this->milestones = app(MilestoneRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(string $projectId, int $limit): CursorPaginator
    {
        return $this->milestones->paginateForProject($projectId, $limit);
    }
}
