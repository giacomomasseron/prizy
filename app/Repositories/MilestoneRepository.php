<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class MilestoneRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Milestone
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $milestone = Milestone::create($attributes);
        $milestone->refresh();

        return $milestone;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Milestone $milestone, array $attributes): Milestone
    {
        $milestone->update($attributes);

        return $milestone;
    }

    /**
     * Milestone has no workspace_id — return it only if its project is in the current
     * workspace (Project is TenantAware, so Project::find is workspace-scoped).
     */
    public function findViaWorkspace(string $id): ?Milestone
    {
        $milestone = Milestone::find($id);
        if ($milestone === null || Project::find($milestone->project_id) === null) {
            return null;
        }

        return $milestone;
    }

    public function paginateForProject(string $projectId, int $limit): CursorPaginator
    {
        return Milestone::where('project_id', $projectId)->orderBy('target_date')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function delete(Milestone $milestone): void
    {
        $milestone->delete();
    }
}
