<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class IssueRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Issue
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        $issue = Issue::create($attributes);
        $issue->refresh();

        return $issue;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Issue $issue, array $attributes): Issue
    {
        $issue->update($attributes);

        return $issue;
    }

    /** Scoped to the current workspace by WorkspaceScope + RLS. */
    public function findInWorkspace(string $id): ?Issue
    {
        return Issue::find($id);
    }

    /**
     * @param  array<string, string>  $filters  field => CSV value (special key: archived = true|all)
     * @param  list<array{column:string,dir:string}>  $sorts
     */
    public function paginate(array $filters, array $sorts, int $limit): CursorPaginator
    {
        $query = Issue::query();

        $archived = $filters['archived'] ?? null;
        unset($filters['archived']);

        if ($archived === 'true') {
            $query->whereNotNull('archived_at');
        } elseif ($archived !== 'all') {
            $query->whereNull('archived_at');
        }

        foreach ($filters as $field => $value) {
            $query->whereIn($field, array_filter(array_map('trim', explode(',', $value))));
        }

        foreach ($sorts as $sort) {
            $query->orderBy($sort['column'], $sort['dir']);
        }

        // Stable cursor tiebreaker.
        $query->orderBy('id');

        return $query->cursorPaginate(perPage: $limit, cursorName: 'after');
    }
}
