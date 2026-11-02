<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Repositories\SavedViewRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method CursorPaginator run(int $limit)
 */
final class ListSavedViews extends BaseUseCase implements UseCaseInterface
{
    public function __construct(private readonly SavedViewRepository $views) {}

    public function handle(mixed ...$arguments): mixed
    {
        return $this->execute(...$arguments);
    }

    private function execute(int $limit): CursorPaginator
    {
        return $this->views->paginate($limit);
    }
}
