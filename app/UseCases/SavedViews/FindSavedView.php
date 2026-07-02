<?php

declare(strict_types=1);

namespace App\UseCases\SavedViews;

use App\Models\SavedView;
use App\Repositories\SavedViewRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class FindSavedView
{
    public function __construct(private readonly SavedViewRepository $views) {}

    public function handle(string $id): SavedView
    {
        $view = $this->views->findInWorkspace($id);
        if ($view === null) {
            throw (new ModelNotFoundException())->setModel(SavedView::class, [$id]);
        }

        return $view;
    }
}
