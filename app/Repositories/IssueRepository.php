<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\Team;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class IssueRepository
{
    /** The room left between two neighbours of the manual order (`sort_order`) when it is extended or renumbered. */
    private const SORT_GAP = 1024;

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Issue
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }

        // A new issue goes last in the manual order, so it shows at the bottom of its column.
        if (! isset($attributes['sort_order'])) {
            $attributes['sort_order'] = (float) Issue::query()->max('sort_order') + self::SORT_GAP;
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

    /**
     * Puts $issue right before $before in the manual order of $before's status: the order the list and the board
     * show under the default sort (`sort_order`, then `id`).
     *
     * The new value is the middle of the two neighbours it lands between. When there is no room left there (the
     * neighbours hold the same value, as every issue does until its workspace is first reordered, or values one
     * step apart), the workspace's issues are renumbered first, which changes no order.
     *
     * Every value is computed and compared by the database: a float bound from PHP may lose its last digits on the
     * way in. Nothing here touches `updated_at`: a place in the order is not an edit.
     */
    public function placeBefore(Issue $issue, Issue $before): void
    {
        $previous = Issue::query()
            ->where('status', $before->status)
            ->whereKeyNot($issue->id)
            ->whereRaw('(sort_order, id) < (SELECT b.sort_order, b.id FROM issues b WHERE b.id = ?)', [$before->id])
            ->orderByDesc('sort_order')
            ->orderByDesc('id')
            ->first();

        if ($previous === null) {
            DB::update(
                'UPDATE issues SET sort_order = (SELECT b.sort_order - ? FROM issues b WHERE b.id = ?) WHERE id = ?',
                [self::SORT_GAP, $before->id, $issue->id],
            );

            return;
        }

        if (! $this->placeBetween($issue, $previous, $before)) {
            $this->renumber($issue->workspace_id);
            $this->placeBetween($issue, $previous, $before);
        }
    }

    /** Puts $issue after every other issue of $status in the manual order. */
    public function placeLast(Issue $issue, string $status): void
    {
        DB::update(
            'UPDATE issues SET sort_order = (
                SELECT COALESCE(MAX(o.sort_order), 0) + ? FROM issues o
                WHERE o.workspace_id = ? AND o.status = ? AND o.id <> ?
            ) WHERE id = ?',
            [self::SORT_GAP, $issue->workspace_id, $status, $issue->id, $issue->id],
        );
    }

    /** Gives $issue the middle of its two neighbours' values; false when that is not strictly between them. */
    private function placeBetween(Issue $issue, Issue $previous, Issue $before): bool
    {
        DB::update(
            'UPDATE issues SET sort_order = (
                SELECT p.sort_order + (b.sort_order - p.sort_order) / 2 FROM issues p, issues b WHERE p.id = ? AND b.id = ?
            ) WHERE id = ?',
            [$previous->id, $before->id, $issue->id],
        );

        $row = DB::selectOne(
            'SELECT (p.sort_order < x.sort_order AND x.sort_order < b.sort_order) AS fits
             FROM issues x, issues p, issues b WHERE x.id = ? AND p.id = ? AND b.id = ?',
            [$issue->id, $previous->id, $before->id],
        );

        return $row !== null && (bool) $row->fits;
    }

    /** Spreads a workspace's issues evenly over the manual order, each keeping its place. */
    private function renumber(string $workspaceId): void
    {
        DB::update(
            'UPDATE issues SET sort_order = ranked.position * ?
             FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, id) AS position FROM issues WHERE workspace_id = ?
             ) ranked
             WHERE issues.id = ranked.id',
            [self::SORT_GAP, $workspaceId],
        );
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

        // escalated=true: only the issues linked to a support ticket (the sidebar's Escalations).
        if (isset($filters['escalated'])) {
            unset($filters['escalated']);
            $query->whereIn('id', function ($sub): void {
                $sub->select('issue_id')->from('issue_ticket_links');
            });
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

        // The ticket (with its requester's organisation and plan) is what rows and cards show as "↩ TKT-…".
        $query->with('labels', 'assignee', 'supportTickets.requester.contactMetadata');

        return $query->cursorPaginate(perPage: $limit, cursorName: 'after');
    }
}
