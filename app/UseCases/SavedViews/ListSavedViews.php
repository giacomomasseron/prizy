<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Repositories\SavedViewRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListSavedViews
{
    public function __construct(private readonly SavedViewRepository $views) {}

    public function handle(int $limit): CursorPaginator
    {
        return $this->views->paginate($limit);
    }
}
