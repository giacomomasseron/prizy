<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\HelpdeskSavedView;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class HelpdeskSavedViewRepository
{
    /** @return Collection<int, HelpdeskSavedView> */
    public function forWorkspace(): Collection
    {
        return HelpdeskSavedView::query()->orderBy('name')->orderBy('id')->get();
    }

    /** @param array<string, mixed> $attrs */
    public function create(array $attrs): HelpdeskSavedView
    {
        $attrs['id'] ??= (string) Str::uuid();
        $view = HelpdeskSavedView::create($attrs);
        $view->refresh();

        return $view;
    }

    public function findInWorkspace(string $id): ?HelpdeskSavedView
    {
        return HelpdeskSavedView::find($id); // WorkspaceScope → cross-workspace id yields null
    }

    public function delete(HelpdeskSavedView $view): void
    {
        $view->delete();
    }
}
