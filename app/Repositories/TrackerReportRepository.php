<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Cycle;
use App\Models\Issue;
use App\Services\ReportBuckets;
use Carbon\CarbonInterface;

final class TrackerReportRepository
{
    private const RANGE_DAYS = ['7d' => 7, '30d' => 30, '90d' => 90];

    private const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

    private const PRIORITIES = ['no_priority', 'urgent', 'high', 'medium', 'low'];

    public function __construct(private readonly ReportBuckets $buckets) {}

    /** @return array<string, mixed> */
    public function overview(string $workspaceId, string $range): array
    {
        $days = self::RANGE_DAYS[$range] ?? 7;
        $now = now();
        $curStart = $now->copy()->subDays($days);
        $prevStart = $now->copy()->subDays($days * 2);

        $createdCur = $this->countBetween($workspaceId, 'created_at', $curStart, $now);
        $createdPrev = $this->countBetween($workspaceId, 'created_at', $prevStart, $curStart);
        $completedCur = $this->countBetween($workspaceId, 'completed_at', $curStart, $now);
        $completedPrev = $this->countBetween($workspaceId, 'completed_at', $prevStart, $curStart);
        $active = Issue::query()->where('workspace_id', $workspaceId)
            ->whereIn('status', ['in_progress', 'in_review'])->count();
        $cycleCur = $this->medianCycleMinutes($workspaceId, $curStart, $now);
        $cyclePrev = $this->medianCycleMinutes($workspaceId, $prevStart, $curStart);

        $bucketDays = $range === '90d' ? 7 : 1;
        $numBuckets = (int) ceil($days / $bucketDays);
        $flow = $this->flowBuckets($workspaceId, $now, $bucketDays, $numBuckets);

        return [
            'kpis' => [
                'created' => ['value' => $createdCur, 'delta_pct' => $this->delta($createdCur, $createdPrev)],
                'completed' => ['value' => $completedCur, 'delta_pct' => $this->delta($completedCur, $completedPrev)],
                'active' => ['value' => $active, 'delta_pct' => null],
                'median_cycle_time_minutes' => ['value' => $cycleCur, 'delta_pct' => $this->delta($cycleCur, $cyclePrev)],
            ],
            'sparklines' => ['created' => $flow['created'], 'completed' => $flow['completed']],
            'flow' => $flow,
            'by_status' => $this->groupCounts($workspaceId, 'status', self::STATUSES),
            'by_priority' => $this->groupCounts($workspaceId, 'priority', self::PRIORITIES),
        ];
    }

    private function countBetween(string $workspaceId, string $column, CarbonInterface $from, CarbonInterface $to): int
    {
        return Issue::query()->where('workspace_id', $workspaceId)
            ->whereNotNull($column)
            ->where($column, '>=', $from)->where($column, '<', $to)->count();
    }

    private function medianCycleMinutes(string $workspaceId, CarbonInterface $from, CarbonInterface $to): ?int
    {
        $rows = Issue::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', $from)->where('completed_at', '<', $to)
            ->get(['created_at', 'completed_at']);

        return $this->buckets->median($rows->map(fn (Issue $i) => (int) round($i->created_at->diffInMinutes($i->completed_at)))->all());
    }

    /** @return array{labels: list<string>, created: list<int>, completed: list<int>} */
    private function flowBuckets(string $workspaceId, CarbonInterface $now, int $bucketDays, int $numBuckets): array
    {
        ['anchor' => $anchor, 'end' => $end, 'labels' => $labels, 'bucketOf' => $bucketOf] = $this->buckets->bucketScaffold($now, $bucketDays, $numBuckets);
        $created = array_fill(0, $numBuckets, 0);
        $completed = array_fill(0, $numBuckets, 0);

        Issue::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $anchor)->where('created_at', '<', $end)
            ->get(['created_at'])
            ->each(function (Issue $i) use (&$created, $bucketOf, $numBuckets): void {
                $b = $bucketOf($i->created_at);
                if ($b >= 0 && $b < $numBuckets) {
                    $created[$b]++;
                }
            });
        Issue::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', $anchor)->where('completed_at', '<', $end)
            ->get(['completed_at'])
            ->each(function (Issue $i) use (&$completed, $bucketOf, $numBuckets): void {
                $b = $bucketOf($i->completed_at);
                if ($b >= 0 && $b < $numBuckets) {
                    $completed[$b]++;
                }
            });

        return ['labels' => $labels, 'created' => $created, 'completed' => $completed];
    }

    /**
     * @param  list<string>  $order
     * @return list<array{key: string, count: int}>
     */
    private function groupCounts(string $workspaceId, string $column, array $order): array
    {
        $counts = Issue::query()->where('workspace_id', $workspaceId)
            ->selectRaw("{$column}, count(*) as c")->groupBy($column)->pluck('c', $column);

        return array_map(fn (string $key): array => ['key' => $key, 'count' => (int) ($counts[$key] ?? 0)], $order);
    }

    private function delta(?int $cur, ?int $prev): ?int
    {
        if ($cur === null || $prev === null || $prev === 0) {
            return null;
        }

        return (int) round(($cur - $prev) / $prev * 100);
    }

    /** @return array<string, mixed> */
    public function cycles(string $workspaceId, string $teamId, ?string $cycleId): array
    {
        $cycles = Cycle::query()->where('team_id', $teamId)
            ->orderByDesc('starts_at')->orderByDesc('id')->limit(6)->get();

        if ($cycles->isEmpty()) {
            return ['cycles' => [], 'burndown' => null];
        }

        // One pass over the issues of all listed cycles.
        $issues = Issue::query()->where('workspace_id', $workspaceId)
            ->whereIn('cycle_id', $cycles->pluck('id'))
            ->where('status', '!=', 'cancelled')
            ->get(['cycle_id', 'status', 'completed_at']);
        $byCycle = $issues->groupBy('cycle_id');

        $rows = $cycles->map(fn (Cycle $c): array => [
            'id' => $c->id,
            'name' => $c->name,
            'starts_at' => $c->starts_at->toDateString(),
            'ends_at' => $c->ends_at->toDateString(),
            'completed_count' => ($byCycle[$c->id] ?? collect())->where('status', 'done')->count(),
            'total_count' => ($byCycle[$c->id] ?? collect())->count(),
        ])->values()->all();

        $selected = $cycleId !== null
            ? $cycles->firstWhere('id', $cycleId)
            : ($cycles->first(fn (Cycle $c): bool => $c->starts_at->lte(today()) && $c->ends_at->gte(today()))
                ?? $cycles->first(fn (Cycle $c): bool => $c->ends_at->lt(today()))
                ?? $cycles->first());

        return ['cycles' => $rows, 'burndown' => $selected === null ? null : $this->burndown($workspaceId, $selected)];
    }

    /** @return array<string, mixed> */
    private function burndown(string $workspaceId, Cycle $cycle): array
    {
        $completions = Issue::query()->where('workspace_id', $workspaceId)
            ->where('cycle_id', $cycle->id)
            ->where('status', '!=', 'cancelled')
            ->get(['completed_at']);
        $total = $completions->count();

        $days = [];
        $today = today();
        for ($d = $cycle->starts_at->copy(); $d->lte($cycle->ends_at); $d = $d->copy()->addDay()) {
            $endOfDay = $d->copy()->endOfDay();
            $days[] = [
                'date' => $d->toDateString(),
                'remaining' => $d->gt($today)
                    ? null
                    : $completions->filter(fn (Issue $i): bool => $i->completed_at === null || $i->completed_at->gt($endOfDay))->count(),
            ];
        }

        return [
            'cycle_id' => $cycle->id,
            'name' => $cycle->name,
            'starts_at' => $cycle->starts_at->toDateString(),
            'ends_at' => $cycle->ends_at->toDateString(),
            'total_scope' => $total,
            'days' => $days,
        ];
    }
}
