<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Repositories\SavedViewRepository;
use GiacomoMasseroni\PHPCleanArchitecture\BaseUseCase;
use GiacomoMasseroni\PHPCleanArchitecture\Contracts\UseCaseInterface;
use Illuminate\Pagination\CursorPaginator;

/**
 * @method static CursorPaginator run(int $limit)
 */
final class ListSavedViews extends BaseUseCase implements UseCaseInterface
{
    private readonly SavedViewRepository $views;

    public function handle(mixed ...$arguments): mixed
    {
        $this->views = app(SavedViewRepository::class);

        return $this->execute(...$arguments);
    }

    private function execute(int $limit): CursorPaginator
    {
        return $this->views->paginate($limit);
    }
}
