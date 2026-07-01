<?php

declare(strict_types=1);

namespace App\UseCases\Labels;

use App\Repositories\LabelRepository;
use Illuminate\Pagination\CursorPaginator;

final class ListLabels
{
    public function __construct(private readonly LabelRepository $labels) {}

    public function handle(int $limit): CursorPaginator
    {
        return $this->labels->paginate($limit);
    }
}
