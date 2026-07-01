<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Label;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class LabelRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Label
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $label = Label::create($attributes);
        $label->refresh();

        return $label;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Label $label, array $attributes): Label
    {
        $label->update($attributes);

        return $label;
    }

    public function findInWorkspace(string $id): ?Label
    {
        return Label::find($id);
    }

    public function paginate(int $limit): CursorPaginator
    {
        return Label::query()->orderBy('name')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function delete(Label $label): void
    {
        $label->delete();
    }
}
