<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class SearchRepository
{
    /**
     * Workspace-scoped issue search, page-based (Scout has no cursor pagination).
     *
     * @param  array{status?: string, team_id?: string}  $filters
     */
    public function searchIssues(string $workspaceId, string $q, array $filters, int $page, int $perPage): LengthAwarePaginator
    {
        return $this->baseQuery($workspaceId, $q, $filters)->paginate($perPage, 'page', $page);
    }

    /** Top-N issue matches for the ⌘K palette. */
    public function searchIssuesCapped(string $workspaceId, string $q, int $limit): Collection
    {
        return $this->baseQuery($workspaceId, $q, [])->take($limit)->get();
    }

    /** @param array{status?: string, team_id?: string} $filters */
    private function baseQuery(string $workspaceId, string $q, array $filters): \Laravel\Scout\Builder
    {
        $builder = Issue::search($q)
            ->where('workspace_id', $workspaceId)
            ->query(fn (Builder $b) => $b->whereNull('archived_at'));

        if (isset($filters['status'])) {
            $builder->where('status', $filters['status']);
        }
        if (isset($filters['team_id'])) {
            $builder->where('team_id', $filters['team_id']);
        }

        return $builder;
    }
}
