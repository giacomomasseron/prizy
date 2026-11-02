<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class SearchRepository
{
    /** Scout columns filterable via ->where (real indexed columns). */
    private const WHERE_FILTERS = ['status', 'team_id', 'priority', 'assignee_id', 'project_id', 'source'];

    /** @param array<string,string> $filters */
    public function searchIssues(string $workspaceId, string $q, array $filters, string $sort, int $page, int $perPage): LengthAwarePaginator
    {
        return $this->scoutQuery($workspaceId, $q, $filters, $sort)->paginate($perPage, 'page', $page);
    }

    /** Empty-query browse: workspace-scoped Eloquent, filtered + sorted. @param array<string,string> $filters */
    public function browseIssues(string $workspaceId, array $filters, string $sort, int $page, int $perPage): LengthAwarePaginator
    {
        $query = Issue::query()
            ->with(['assignee', 'labels'])   // IssueResource embeds these (R-B) — eager-load to avoid N+1
            ->where('workspace_id', $workspaceId)
            ->whereNull('archived_at');
        $this->applyEloquentFilters($query, $filters);
        $this->applySort($query, $sort);

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function searchIssuesCapped(string $workspaceId, string $q, int $limit): Collection
    {
        return Issue::search($q)
            ->where('workspace_id', $workspaceId)
            ->query(fn (Builder $b) => $b->whereNull('archived_at'))
            ->take($limit)->get();
    }

    /** @param array<string,string> $filters */
    private function scoutQuery(string $workspaceId, string $q, array $filters, string $sort): \Laravel\Scout\Builder
    {
        $builder = Issue::search($q)->where('workspace_id', $workspaceId);
        foreach (self::WHERE_FILTERS as $key) {
            if (isset($filters[$key])) {
                $builder->where($key, $filters[$key]);
            }
        }
        // archived exclusion + label (many-to-many) + sort go through the Eloquent query callback.
        $labelId = $filters['label_id'] ?? null;
        $builder->query(function (Builder $b) use ($labelId, $sort): void {
            $b->with(['assignee', 'labels'])->whereNull('archived_at');
            if ($labelId !== null) {
                $b->whereHas('labels', fn (Builder $q) => $q->where('labels.id', $labelId));
            }
            $this->applySort($b, $sort);
        });

        return $builder;
    }

    /** @param array<string,string> $filters */
    private function applyEloquentFilters(Builder $query, array $filters): void
    {
        foreach (self::WHERE_FILTERS as $key) {
            if (isset($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }
        if (isset($filters['label_id'])) {
            $query->whereHas('labels', fn (Builder $q) => $q->where('labels.id', $filters['label_id']));
        }
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'priority' => $query->orderByRaw("array_position(ARRAY['urgent','high','medium','low','no_priority']::text[], priority)"),
            'status'   => $query->orderByRaw("array_position(ARRAY['in_progress','in_review','todo','backlog','done','cancelled']::text[], status)"),
            default    => $query->orderByDesc('updated_at'),
        };
    }
}
