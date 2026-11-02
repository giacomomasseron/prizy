<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Team;
use Illuminate\Database\Eloquent\Collection;
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
     * Batch lookup for resource enrichment (e.g. notification subjects) — ONE query, no N+1.
     *
     * @param  list<string>  $ids
     * @return Collection<string, Issue> keyed by id
     */
    public function findManyByIds(array $ids): Collection
    {
        if ($ids === []) {
            return new Collection;
        }

        return Issue::whereIn('id', $ids)->get(['id', 'title'])->keyBy('id');
    }

    /**
     * The issue picker's lookup (PRD §3.2.1): issues whose id starts with a reference's characters (`PRZ-3f9a`,
     * `3F9A1C`, any case), then issues whose title contains the query (case-insensitive, `%`/`_`/`\` literal).
     * Not archived; the current workspace (WorkspaceScope + RLS). Reference matches first, each group newest-updated
     * first, at most $limit and no duplicates.
     *
     * @return Collection<int, Issue>
     */
    public function lookup(string $q, int $limit): Collection
    {
        $columns = ['id', 'title', 'status', 'updated_at'];

        $byReference = new Collection;
        if (preg_match('/^(?:prz-)?([0-9a-f]{1,6})$/i', $q, $m) === 1) {
            $byReference = Issue::query()
                ->whereNull('archived_at')
                ->whereRaw('id::text LIKE ?', [strtolower($m[1]).'%'])
                ->orderByDesc('updated_at')
                ->orderBy('id')
                ->limit($limit)
                ->get($columns);
        }

        $byTitle = Issue::query()
            ->whereNull('archived_at')
            ->where('title', 'ilike', '%'.addcslashes($q, '\\%_').'%')
            ->whereNotIn('id', $byReference->pluck('id')->all())
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->limit($limit)
            ->get($columns);

        return $byReference->concat($byTitle)->take($limit)->values();
    }

    /**
     * @param  array<string, string>  $filters  field => CSV value (special keys: archived = true|all, starred = true)
     * @param  list<array{column:string,dir:string}>  $sorts
     * @param  string|null  $starredBy  whose stars `starred=true` keeps (the caller)
     */
    public function paginate(array $filters, array $sorts, int $limit, ?string $starredBy = null): CursorPaginator
    {
        $query = Issue::query();

        $archived = $filters['archived'] ?? null;
        unset($filters['archived']);

        if ($archived === 'true') {
            $query->whereNotNull('archived_at');
        } elseif ($archived !== 'all') {
            $query->whereNull('archived_at');
        }

        // starred=true: only the caller's starred issues (PRD §3.2.9). Without a caller, nothing.
        if (isset($filters['starred'])) {
            unset($filters['starred']);
            if ($starredBy === null) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('id', function ($sub) use ($starredBy): void {
                    $sub->select('issue_id')->from('issue_stars')->where('user_id', $starredBy);
                });
            }
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

        $query->with('labels', 'assignee');

        return $query->cursorPaginate(perPage: $limit, cursorName: 'after');
    }
}
