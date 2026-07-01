<?php

declare(strict_types=1);

namespace App\UseCases\Cycles;

use App\Repositories\CycleRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListCycles
{
    public function __construct(private readonly CycleRepository $cycles) {}

    public function handle(string $teamId, int $limit): CursorPaginator
    {
        return $this->cycles->paginateForTeam($teamId, $limit);
    }
}
