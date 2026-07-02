<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Team;
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

        // label_id: issues having ANY of the given labels (junction subquery).
        if (isset($filters['label_id'])) {
            $labelIds = array_filter(array_map('trim', explode(',', $filters['label_id'])));
            unset($filters['label_id']);
            if ($labelIds !== []) {
                $query->whereIn('id', function ($sub) use ($labelIds): void {
                    $sub->select('issue_id')->from('issue_labels')->whereIn('label_id', $labelIds);
                });
            }
        }

        // cycle_id=active: resolve currently-active cycles for this workspace's teams.
        if (($filters['cycle_id'] ?? null) === 'active') {
            unset($filters['cycle_id']);
            $teamIds = Team::query()->pluck('id'); // WorkspaceScope-bound
            $activeCycleIds = Cycle::query()
                ->whereIn('team_id', $teamIds)
                ->whereDate('starts_at', '<=', now())
                ->whereDate('ends_at', '>=', now())
                ->pluck('id')
                ->all();
            $query->whereIn('cycle_id', $activeCycleIds); // empty array → no rows (Laravel emits 0=1)
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
