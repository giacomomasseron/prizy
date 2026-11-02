<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonInterface;

/**
 * Shared time-bucket scaffolding + median for report repositories.
 * Buckets anchor to CALENDAR boundaries (startOfWeek for 7-day buckets,
 * startOfDay otherwise) — never to now()'s time of day.
 */
final class ReportBuckets
{
    /** @return array{anchor: CarbonInterface, end: CarbonInterface, labels: list<string>, bucketOf: callable(CarbonInterface): int} */
    public function bucketScaffold(CarbonInterface $now, int $bucketDays, int $numBuckets): array
    {
        $anchor = $bucketDays === 7
            ? $now->copy()->startOfWeek(CarbonInterface::MONDAY)->subWeeks($numBuckets - 1)
            : $now->copy()->startOfDay()->subDays($numBuckets - 1);
        $end = $anchor->copy()->addDays($bucketDays * $numBuckets);
        $labels = [];
        for ($i = 0; $i < $numBuckets; $i++) {
            $labels[] = $anchor->copy()->addDays($i * $bucketDays)->format('M j');
        }
        $bucketOf = fn (CarbonInterface $ts): int => (int) floor($anchor->diffInDays($ts) / $bucketDays);

        return ['anchor' => $anchor, 'end' => $end, 'labels' => $labels, 'bucketOf' => $bucketOf];
    }

    /** @param list<int> $values */
    public function median(array $values): ?int
    {
        if ($values === []) {
            return null;
        }
        sort($values);
        $n = count($values);
        $mid = intdiv($n, 2);

        return (int) round($n % 2 === 1 ? $values[$mid] : ($values[$mid - 1] + $values[$mid]) / 2);
    }
}
