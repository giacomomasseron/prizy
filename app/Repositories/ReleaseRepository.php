<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Issue;
use App\Models\Release;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

final class ReleaseRepository
{
    private const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): Release
    {
        if (! isset($attributes['id'])) {
            $attributes['id'] = (string) Str::uuid();
        }
        $release = Release::create($attributes);
        $release->refresh();

        return $release;
    }

    /** @param array<string, mixed> $attributes */
    public function update(Release $release, array $attributes): Release
    {
        $release->update($attributes);

        return $release;
    }

    public function find(string $id): ?Release
    {
        return Release::find($id);
    }

    public function delete(Release $release): void
    {
        $release->delete();
    }

    /**
     * Upcoming first (unshipped by nearest target_date, nulls last), then
     * shipped (newest-shipped first). Each release gets a transient `rollup`
     * attribute.
     *
     * @return Collection<int, Release>
     */
    public function forWorkspace(string $workspaceId): Collection
    {
        $releases = Release::query()->where('workspace_id', $workspaceId)
            ->orderByRaw('(shipped_at IS NOT NULL)')
            ->orderByRaw('shipped_at DESC NULLS FIRST')
            ->orderByRaw('target_date ASC NULLS LAST')
            ->orderByDesc('created_at')
            ->get();

        $rollups = $this->rollups($workspaceId, $releases->pluck('id')->all());
        $releases->each(function (Release $r) use ($rollups): void {
            $rollup = $rollups[$r->id] ?? self::emptyRollup();
            unset($rollup['by_status']);
            $r->setAttribute('rollup', $rollup);
        });

        return $releases;
    }

    /**
     * One grouped query for the whole id set.
     *
     * @param  list<string>  $releaseIds
     * @return array<string, array{total: int, done: int, cancelled: int, pct: int|null, by_status: list<array{key: string, count: int}>}>
     */
    public function rollups(string $workspaceId, array $releaseIds): array
    {
        if ($releaseIds === []) {
            return [];
        }

        $rows = Issue::query()->where('workspace_id', $workspaceId)
            ->whereIn('release_id', $releaseIds)
            ->selectRaw('release_id, status, count(*) as c')
            ->groupBy('release_id', 'status')
            ->get();

        $out = [];
        foreach ($rows->groupBy('release_id') as $releaseId => $group) {
            $byStatus = [];
            foreach (self::STATUSES as $key) {
                $byStatus[] = ['key' => $key, 'count' => (int) ($group->firstWhere('status', $key)->c ?? 0)];
            }
            $total = (int) $group->sum('c');
            $done = (int) ($group->firstWhere('status', 'done')->c ?? 0);
            $cancelled = (int) ($group->firstWhere('status', 'cancelled')->c ?? 0);
            $denominator = $total - $cancelled;
            $out[$releaseId] = [
                'total' => $total,
                'done' => $done,
                'cancelled' => $cancelled,
                'pct' => $denominator > 0 ? (int) round($done / $denominator * 100) : null,
                'by_status' => $byStatus,
            ];
        }

        return $out;
    }

    /** @return array{total: int, done: int, cancelled: int, pct: null, by_status: list<array{key: string, count: int}>} */
    public static function emptyRollup(): array
    {
        return [
            'total' => 0, 'done' => 0, 'cancelled' => 0, 'pct' => null,
            'by_status' => array_map(fn (string $key): array => ['key' => $key, 'count' => 0], self::STATUSES),
        ];
    }
}
