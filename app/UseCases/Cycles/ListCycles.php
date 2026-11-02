<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Repositories\CycleRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(string $teamId, int $limit)
 */
final class ListCycles extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly CycleRepository $cycles) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(string $teamId, int $limit): CursorPaginator
    {
        return $this->cycles->paginateForTeam($teamId, $limit);
    }
}
