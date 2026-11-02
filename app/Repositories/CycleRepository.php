<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Cycle;
use App\Models\Team;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class CycleRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Cycle
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $cycle = Cycle::create($attributes);
        $cycle->refresh();

        return $cycle;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Cycle $cycle, array $attributes): Cycle
    {
        $cycle->update($attributes);

        return $cycle;
    }

    /**
     * Cycle has no workspace_id — return it only if its team is in the current
     * workspace (Team is TenantAware, so Team::find is workspace-scoped).
     */
    public function findViaWorkspace(string $id): ?Cycle
    {
        $cycle = Cycle::find($id);
        if ($cycle === null || Team::find($cycle->team_id) === null) {
            return null;
        }

        return $cycle;
    }

    public function paginateForTeam(string $teamId, int $limit): CursorPaginator
    {
        return Cycle::where('team_id', $teamId)->orderBy('starts_at')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function delete(Cycle $cycle): void
    {
        $cycle->delete();
    }
}
