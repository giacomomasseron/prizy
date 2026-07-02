<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\SavedView;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class SavedViewRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): SavedView
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $view = SavedView::create($attributes);
        $view->refresh();

        return $view;
    }

    /** @param array<string, mixed> $attributes */
    public function update(SavedView $view, array $attributes): SavedView
    {
        $view->update($attributes);

        return $view;
    }

    public function findInWorkspace(string $id): ?SavedView
    {
        return SavedView::find($id);
    }

    public function paginate(int $limit): CursorPaginator
    {
        return SavedView::query()->orderBy('name')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function delete(SavedView $view): void
    {
        $view->delete();
    }
}
