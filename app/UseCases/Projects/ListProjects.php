<?php

declare(strict_types=1);

namespace App\UseCases\Projects;

use App\Repositories\ProjectRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(array $filters, int $limit, ?string $userId = null)
 */
final class ListProjects extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly ProjectRepository $projects) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    /**
     * @param  array<string, string>  $filters
     * @param  string|null  $userId  the caller, for `mine=true`
     */
    private function execute(array $filters, int $limit, ?string $userId = null): CursorPaginator
    {
        return $this->projects->paginate($filters, $limit, $userId);
    }
}
