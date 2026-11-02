<?php

declare(strict_types=1);

namespace App\UseCases\Teams;

use App\Repositories\TeamRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(int $limit, ?string $memberUserId = null)
 */
final class ListTeams extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly TeamRepository $teams) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(int $limit, ?string $memberUserId = null): CursorPaginator
    {
        return $this->teams->paginate($limit, $memberUserId);
    }
}
