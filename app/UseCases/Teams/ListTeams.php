<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Repositories\TeamRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListTeams
{
    public function __construct(private readonly TeamRepository $teams) {}

    public function handle(int $limit, ?string $memberUserId = null): CursorPaginator
    {
        return $this->teams->paginate($limit, $memberUserId);
    }
}
