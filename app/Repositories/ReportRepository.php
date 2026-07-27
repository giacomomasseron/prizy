<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Ticket;
use Carbon\CarbonInterface;

final class ReportRepository
{
    private const RANGE_DAYS = ['7d' => 7, '30d' => 30, '90d' => 90];

    /** @return array<string, mixed> */
    public function overview(string $workspaceId, string $range): array
    {
        $days = self::RANGE_DAYS[$range] ?? 7;
        $now = now();
        $curStart = $now->copy()->subDays($days);
        $prevStart = $now->copy()->subDays($days * 2);

        $createdCur = $this->countBetween($workspaceId, 'created_at', $curStart, $now);
        $createdPrev = $this->countBetween($workspaceId, 'created_at', $prevStart, $curStart);
        $solvedCur = $this->countBetween($workspaceId, 'resolved_at', $curStart, $now);
        $solvedPrev = $this->countBetween($workspaceId, 'resolved_at', $prevStart, $curStart);
        $frtCur = $this->medianFrtMinutes($workspaceId, $curStart, $now);
        $frtPrev = $this->medianFrtMinutes($workspaceId, $prevStart, $curStart);

        $bucketDays = $range === '90d' ? 7 : 1;
        $numBuckets = (int) ceil($days / $bucketDays);

        $byStatusRaw = Ticket::query()->where('workspace_id', $workspaceId)
            ->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');

        $escBase = fn () => Ticket::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $curStart)->where('created_at', '<', $now)
            ->whereHas('issueTicketLinks');
        $escCount = $escBase()->count();
        $recent = $escBase()->with(['linkedIssues' => fn ($q) => $q->orderBy('issue_ticket_links.created_at')])
            ->orderByDesc('created_at')->limit(5)->get()
            ->map(fn (Ticket $t) => [
                'ticket_id' => $t->id,
                'subject' => $t->subject,
                'issue_id' => $t->linkedIssues->first()?->id,
            ])->values()->all();

        return [
            'range' => $range,
            'kpis' => [
                'tickets_created' => ['value' => $createdCur, 'delta_pct' => $this->delta($createdCur, $createdPrev)],
                'solved' => ['value' => $solvedCur, 'delta_pct' => $this->delta($solvedCur, $solvedPrev)],
                'median_first_reply_minutes' => ['value' => $frtCur, 'delta_pct' => $this->delta($frtCur, $frtPrev)],
                'csat' => ['value' => null, 'delta_pct' => null],
            ],
            'volume' => $this->volumeBuckets($workspaceId, $now, $bucketDays, $numBuckets),
            'by_status' => collect(['new', 'open', 'pending', 'on_hold', 'solved', 'closed'])
                ->mapWithKeys(fn ($s) => [$s => (int) ($byStatusRaw[$s] ?? 0)])->all(),
            'escalations' => [
                'count' => $escCount,
                'created_total' => $createdCur,
                'rate_pct' => $createdCur > 0 ? (int) round($escCount / $createdCur * 100) : 0,
                'recent' => $recent,
            ],
        ];
    }

    private function countBetween(string $workspaceId, string $column, CarbonInterface $from, CarbonInterface $to): int
    {
        return Ticket::query()->where('workspace_id', $workspaceId)
            ->where($column, '>=', $from)->where($column, '<', $to)->count();
    }

    private function delta(?int $cur, ?int $prev): ?int
    {
        if ($cur === null || $prev === null || $prev === 0) {
            return null;
        }

        return (int) round(($cur - $prev) / $prev * 100);
    }

    private function medianFrtMinutes(string $workspaceId, CarbonInterface $from, CarbonInterface $to): ?int
    {
        $rows = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('first_replied_at')
            ->where('first_replied_at', '>=', $from)->where('first_replied_at', '<', $to)
            ->get(['created_at', 'first_replied_at']);
        if ($rows->isEmpty()) {
            return null;
        }
        $mins = $rows->map(fn (Ticket $t) => (int) round($t->created_at->diffInMinutes($t->first_replied_at)))->sort()->values();
        $n = $mins->count();
        $mid = intdiv($n, 2);

        return (int) round($n % 2 === 1 ? $mins[$mid] : ($mins[$mid - 1] + $mins[$mid]) / 2);
    }

    /** @return list<array{label:string,created:int,solved:int}> */
    private function volumeBuckets(string $workspaceId, CarbonInterface $now, int $bucketDays, int $numBuckets): array
    {
        $anchor = $bucketDays === 7
            ? $now->copy()->startOfWeek(CarbonInterface::MONDAY)->subWeeks($numBuckets - 1)
            : $now->copy()->startOfDay()->subDays($numBuckets - 1);
        $end = $anchor->copy()->addDays($bucketDays * $numBuckets);
        $createdAts = Ticket::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $anchor)->where('created_at', '<', $end)->pluck('created_at');
        $resolvedAts = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('resolved_at')->where('resolved_at', '>=', $anchor)->where('resolved_at', '<', $end)->pluck('resolved_at');

        $created = array_fill(0, $numBuckets, 0);
        $solved = array_fill(0, $numBuckets, 0);
        $bucketOf = fn (CarbonInterface $ts): int => (int) floor($anchor->diffInDays($ts) / $bucketDays);
        foreach ($createdAts as $ts) {
            $i = $bucketOf($ts);
            if ($i >= 0 && $i < $numBuckets) {
                $created[$i]++;
            }
        }
        foreach ($resolvedAts as $ts) {
            $i = $bucketOf($ts);
            if ($i >= 0 && $i < $numBuckets) {
                $solved[$i]++;
            }
        }

        $out = [];
        for ($i = 0; $i < $numBuckets; $i++) {
            $out[] = [
                'label' => $anchor->copy()->addDays($i * $bucketDays)->format('M j'),
                'created' => $created[$i],
                'solved' => $solved[$i],
            ];
        }

        return $out;
    }
}
