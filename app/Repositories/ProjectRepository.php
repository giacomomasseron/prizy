<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Project;
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

    /** @param array<string, string> $filters */
    public function paginate(array $filters, int $limit): CursorPaginator
    {
        $query = Project::query();
        foreach (['status', 'team_id'] as $field) {
            if (isset($filters[$field])) {
                $query->whereIn($field, array_filter(array_map('trim', explode(',', $filters[$field]))));
            }
        }

        return $query->orderBy('created_at')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    /** @return Collection<int, Project> */
    public function allWithMilestones(): Collection
    {
        return Project::query()->with('milestones')->orderBy('start_date')->orderBy('id')->get();
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
