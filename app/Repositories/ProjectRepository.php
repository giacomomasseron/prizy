<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class ProjectRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Project
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $project = Project::create($attributes);
        $project->refresh();

        return $project;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Project $project, array $attributes): Project
    {
        $project->update($attributes);

        return $project;
    }

    public function findInWorkspace(string $id): ?Project
    {
        return Project::find($id);
    }

    /**
     * @param  array<string, string>  $filters  field => CSV value (special key: mine = true)
     * @param  string|null  $mineFor  whose projects `mine=true` keeps (the caller)
     */
    public function paginate(array $filters, int $limit, ?string $mineFor = null): CursorPaginator
    {
        $query = Project::query();
        foreach (['status', 'team_id'] as $field) {
            if (isset($filters[$field])) {
                $query->whereIn($field, array_filter(array_map('trim', explode(',', $filters[$field]))));
            }
        }

        // mine=true (Today v2's left bar): the projects the caller leads, or that hold an open issue assigned to them
        // or on their day plan. Without a caller, nothing.
        if (filter_var($filters['mine'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            if ($mineFor === null) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where(function (Builder $mine) use ($mineFor): void {
                    $mine->where('projects.lead_id', $mineFor)
                        ->orWhereHas('issues', fn (Builder $issue) => $issue
                            ->whereNotIn('issues.status', ['done', 'cancelled'])
                            ->whereNull('issues.archived_at')
                            ->where(fn (Builder $who) => $who
                                ->where('issues.assignee_id', $mineFor)
                                ->orWhereIn('issues.id', function ($sub) use ($mineFor): void {
                                    $sub->select('issue_id')->from('user_plan_items')->where('user_id', $mineFor);
                                })));
                });
            }
        }

        $query->withCount('issues')
            ->withCount(['issues as done_count' => fn ($q) => $q->where('status', 'done')])
            ->with('lead');

        return $query->orderBy('created_at')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after')->withQueryString();
    }

    /** @return Collection<int, Project> */
    public function allWithMilestones(): Collection
    {
        return Project::query()
            ->with('milestones')
            ->with('lead')
            ->withCount('issues')
            ->withCount(['issues as done_count' => fn ($q) => $q->where('status', 'done')])
            ->orderBy('start_date')->orderBy('id')->get();
    }

    /** @return Collection<int, Project> */
    public function searchByName(string $q, int $limit): Collection
    {
        return Project::query()
            ->where('name', 'ilike', '%' . $q . '%')
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    public function delete(Project $project): void
    {
        $project->delete();
    }
}
