<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method static CursorPaginator run(int $limit, ?string $memberUserId = null)
 */
final class ListTeams extends BaseUseCase implements UseCaseInterface
{
    private readonly TeamRepository $teams;

    public function handle(mixed ...$arguments): mixed
    {
        $this->teams = app(TeamRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(int $limit, ?string $memberUserId = null): CursorPaginator
    {
        return $this->teams->paginate($limit, $memberUserId);
    }
}
