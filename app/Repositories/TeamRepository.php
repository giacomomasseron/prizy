<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use App\Models\Team;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Str;

final class TeamRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Team
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $team = Team::create($attributes);
        $team->refresh();

        return $team;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Team $team, array $attributes): Team
    {
        $team->update($attributes);

        return $team;
    }

    public function findInWorkspace(string $id): ?Team
    {
        return Team::find($id);
    }

    public function paginate(int $limit): CursorPaginator
    {
        return Team::query()->orderBy('name')->orderBy('id')->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function hasIssues(string $teamId): bool
    {
        return Issue::where('team_id', $teamId)->exists();
    }

    public function delete(Team $team): void
    {
        $team->delete();
    }
}
