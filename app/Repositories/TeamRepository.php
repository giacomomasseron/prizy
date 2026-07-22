<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use App\Models\Team;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Facades\DB;
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

    public function paginate(int $limit, ?string $memberUserId = null): CursorPaginator
    {
        return Team::query()
            ->when($memberUserId !== null, fn ($q) => $q->whereHas('teamMembers', fn ($m) => $m->where('user_id', $memberUserId)))
            ->withCount('teamMembers as member_count')
            ->with('leadMembership.user')
            ->orderBy('name')
            ->orderBy('id')
            ->cursorPaginate(perPage: $limit, cursorName: 'after');
    }

    public function hasIssues(string $teamId): bool
    {
        return Issue::where('team_id', $teamId)->exists();
    }

    /** @return Collection<int, Team> */
    public function searchByName(string $q, int $limit): Collection
    {
        return Team::query()
            ->where(function ($query) use ($q): void {
                $query->where('name', 'ilike', '%' . $q . '%')
                    ->orWhere('identifier', 'ilike', '%' . $q . '%');
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    public function delete(Team $team): void
    {
        $team->delete();
    }

    public function addMember(string $teamId, string $userId, string $role): void
    {
        DB::table('team_members')->insert(['team_id' => $teamId, 'user_id' => $userId, 'role' => $role]);
    }
}
