<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\SlaCalculator;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

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
        $csatCur = $this->csatRate($workspaceId, $curStart, $now);
        $csatPrev = $this->csatRate($workspaceId, $prevStart, $curStart);

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
                'csat' => ['value' => $csatCur, 'delta_pct' => $this->delta($csatCur, $csatPrev)],
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

    /** @return array<string, mixed> */
    public function agents(string $workspaceId, string $range): array
    {
        $days = self::RANGE_DAYS[$range] ?? 7;
        $now = now();
        $curStart = $now->copy()->subDays($days);
        $bucketDays = $range === '90d' ? 7 : 1;
        $numBuckets = (int) ceil($days / $bucketDays);

        $assigned = $this->countByAgent($workspaceId, 'created_at', $curStart, $now);
        $solved = $this->countByAgent($workspaceId, 'resolved_at', $curStart, $now);
        $frtByAgent = $this->durationsByAgent($workspaceId, 'first_replied_at', $curStart, $now);
        $resByAgent = $this->durationsByAgent($workspaceId, 'resolved_at', $curStart, $now);

        $csatRows = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('assignee_id')->whereNotNull('csat_responded_at')
            ->where('csat_responded_at', '>=', $curStart)->where('csat_responded_at', '<', $now)
            ->get(['assignee_id', 'csat_rating']);
        $csatByAgent = []; // id => ['total' => int, 'positive' => int]
        foreach ($csatRows as $row) {
            $csatByAgent[$row->assignee_id]['total'] = ($csatByAgent[$row->assignee_id]['total'] ?? 0) + 1;
            $csatByAgent[$row->assignee_id]['positive'] = ($csatByAgent[$row->assignee_id]['positive'] ?? 0) + ($row->csat_rating === 'thumbs_up' ? 1 : 0);
        }

        $activeIds = array_values(array_unique([
            ...array_keys($assigned), ...array_keys($solved),
            ...array_keys($frtByAgent), ...array_keys($resByAgent), ...array_keys($csatByAgent),
        ]));
        $identities = User::query()->where('workspace_id', $workspaceId)->where('is_agent', true)
            ->whereIn('id', $activeIds)->get(['id', 'name', 'email', 'avatar_url']);

        $agents = $identities->map(function (User $u) use ($assigned, $solved, $frtByAgent, $resByAgent, $csatByAgent) {
            $csat = $csatByAgent[$u->id] ?? null;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatar_url,
                'assigned' => $assigned[$u->id] ?? 0,
                'solved' => $solved[$u->id] ?? 0,
                'median_first_reply_minutes' => $this->median($frtByAgent[$u->id] ?? []),
                'median_resolution_minutes' => $this->median($resByAgent[$u->id] ?? []),
                'csat_pct' => $csat !== null ? (int) round($csat['positive'] / $csat['total'] * 100) : null,
                'csat_responses' => $csat['total'] ?? 0,
            ];
        })->sort(fn ($a, $b) => ($b['solved'] <=> $a['solved']) ?: ($b['assigned'] <=> $a['assigned']))
            ->values()->all();

        return [
            'range' => $range,
            'agents' => $agents,
            'replies_per_day' => $this->repliesPerDay($workspaceId, $now, $bucketDays, $numBuckets),
            'csat' => $this->csatBreakdown($workspaceId, $curStart, $now),
        ];
    }

    /** @return array<string, mixed> */
    public function sla(string $workspaceId, string $range): array
    {
        $days = self::RANGE_DAYS[$range] ?? 7;
        $now = now();
        $curStart = $now->copy()->subDays($days);

        // In-window policied tickets → per-ticket first-reply + resolution state via the SLA engine.
        $windowed = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('sla_policy_id')
            ->where('created_at', '>=', $curStart)->where('created_at', '<', $now)
            ->with(['slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'latestPublicMessage'])
            ->get();

        $frMet = 0;
        $frBreached = 0;
        $resMet = 0;
        $resBreached = 0;
        $planAgg = []; // policy_id => ['name'=>?string,'target'=>?int,'met'=>int,'breached'=>int] (first-reply)
        foreach ($windowed as $t) {
            foreach (SlaCalculator::metrics($t) as $m) {
                if (! in_array($m['state'], ['met', 'breached'], true)) {
                    continue; // decided outcomes only
                }
                if ($m['metric'] === 'first_reply') {
                    if ($m['state'] === 'met') {
                        $frMet++;
                    } else {
                        $frBreached++;
                    }
                    $pid = $t->sla_policy_id;
                    $planAgg[$pid] ??= ['name' => $m['policy_name'], 'target' => $m['target_minutes'], 'met' => 0, 'breached' => 0];
                    if ($m['state'] === 'met') {
                        $planAgg[$pid]['met']++;
                    } else {
                        $planAgg[$pid]['breached']++;
                    }
                } elseif ($m['metric'] === 'resolution') {
                    if ($m['state'] === 'met') {
                        $resMet++;
                    } else {
                        $resBreached++;
                    }
                }
            }
        }
        $decided = $frMet + $frBreached;
        $resDecided = $resMet + $resBreached;

        $byPlan = collect($planAgg)->map(function (array $p, string $pid): array {
            $d = $p['met'] + $p['breached'];

            return [
                'policy_id' => $pid,
                'name' => $p['name'],
                'target_minutes' => $p['target'],
                'attainment_pct' => $d > 0 ? (int) round($p['met'] / $d * 100) : null,
                'count' => $d,
            ];
        })->sortBy('target_minutes')->values()->all();

        $chanRaw = Ticket::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $curStart)->where('created_at', '<', $now)
            ->selectRaw('channel, count(*) as c')->groupBy('channel')->pluck('c', 'channel');
        $byChannel = collect(['email', 'chat', 'portal', 'api'])
            ->map(fn (string $ch) => ['channel' => $ch, 'count' => (int) ($chanRaw[$ch] ?? 0)])->all();

        return [
            'range' => $range,
            'attainment_pct' => $decided > 0 ? (int) round($frMet / $decided * 100) : null,
            'resolution_attainment_pct' => $resDecided > 0 ? (int) round($resMet / $resDecided * 100) : null,
            'by_plan' => $byPlan,
            'by_channel' => $byChannel,
            'breach_risk' => $this->breachRisk($workspaceId),
            'tags' => $this->tagCounts($workspaceId, $curStart, $now),
        ];
    }

    /** @return list<array{ticket_id:string,subject:string,requester_name:?string,target_minutes:?int,remaining_minutes:int,pct:int}> */
    private function breachRisk(string $workspaceId): array
    {
        $now = now();
        $open = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNull('resolved_at')->whereNull('first_replied_at')->whereNotNull('sla_policy_id')
            ->with(['slaPolicy.schedule.businessHourIntervals', 'slaBreaches', 'requester'])
            ->get();

        return $open->map(fn (Ticket $t) => ['t' => $t, 'status' => SlaCalculator::firstReplyStatus($t)])
            ->filter(fn (array $r) => $r['status']['state'] === 'due')
            ->sortBy(fn (array $r) => $r['status']['due_at']->getTimestamp())
            ->take(5)
            ->map(function (array $r) use ($now): array {
                $t = $r['t'];
                $target = $r['status']['target_minutes'];
                $remaining = max(0, (int) round($now->diffInMinutes($r['status']['due_at'], false)));
                $pct = ($target !== null && $target > 0) ? min(100, max(0, (int) round($remaining / $target * 100))) : 0;

                return [
                    'ticket_id' => $t->id,
                    'subject' => $t->subject,
                    'requester_name' => $t->requester?->name,
                    'target_minutes' => $target,
                    'remaining_minutes' => $remaining,
                    'pct' => $pct,
                ];
            })->values()->all();
    }

    /** @return list<array{name:string,count:int}> */
    private function tagCounts(string $workspaceId, CarbonInterface $from, CarbonInterface $to): array
    {
        $ticketIds = Ticket::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $from)->where('created_at', '<', $to)->select('id');

        return DB::table('ticket_tags')
            ->join('tags', 'tags.id', '=', 'ticket_tags.tag_id')
            ->where('tags.workspace_id', $workspaceId)
            ->whereIn('ticket_tags.ticket_id', $ticketIds)
            ->groupBy('tags.name')
            ->selectRaw('tags.name as name, count(*) as c')
            ->orderByDesc('c')->orderBy('tags.name')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->c])
            ->all();
    }

    /** @return array<string, int> assignee_id => count */
    private function countByAgent(string $workspaceId, string $column, CarbonInterface $from, CarbonInterface $to): array
    {
        return Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('assignee_id')
            ->where($column, '>=', $from)->where($column, '<', $to)
            ->selectRaw('assignee_id, count(*) as c')->groupBy('assignee_id')
            ->pluck('c', 'assignee_id')->map(fn ($c) => (int) $c)->all();
    }

    /** @return array<string, list<int>> assignee_id => minutes */
    private function durationsByAgent(string $workspaceId, string $endColumn, CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('assignee_id')->whereNotNull($endColumn)
            ->where($endColumn, '>=', $from)->where($endColumn, '<', $to)
            ->get(['assignee_id', 'created_at', $endColumn]);
        $out = [];
        foreach ($rows as $t) {
            $out[$t->assignee_id][] = (int) round($t->created_at->diffInMinutes($t->{$endColumn}));
        }

        return $out;
    }

    /** @return list<array{label:string,count:int}> */
    private function repliesPerDay(string $workspaceId, CarbonInterface $now, int $bucketDays, int $numBuckets): array
    {
        ['end' => $end, 'anchor' => $anchor, 'labels' => $labels, 'bucketOf' => $bucketOf] = $this->bucketScaffold($now, $bucketDays, $numBuckets);
        $createdAts = TicketMessage::query()
            ->where('sender_type', 'user')
            ->whereIn('ticket_id', Ticket::query()->where('workspace_id', $workspaceId)->select('id'))
            ->where('created_at', '>=', $anchor)->where('created_at', '<', $end)
            ->pluck('created_at');

        $counts = array_fill(0, $numBuckets, 0);
        foreach ($createdAts as $ts) {
            $i = $bucketOf($ts);
            if ($i >= 0 && $i < $numBuckets) {
                $counts[$i]++;
            }
        }

        $out = [];
        for ($i = 0; $i < $numBuckets; $i++) {
            $out[] = ['label' => $labels[$i], 'count' => $counts[$i]];
        }

        return $out;
    }

    /** @return array{responses:int,positive_pct:int|null,breakdown:list<array{key:string,label:string,count:int,pct:int}>} */
    private function csatBreakdown(string $workspaceId, CarbonInterface $from, CarbonInterface $to): array
    {
        $ratings = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('csat_responded_at')
            ->where('csat_responded_at', '>=', $from)->where('csat_responded_at', '<', $to)
            ->pluck('csat_rating');
        $responses = $ratings->count();
        $positive = $ratings->filter(fn ($r) => $r === 'thumbs_up')->count();
        $negative = $responses - $positive;
        $pct = fn (int $n): int => $responses > 0 ? (int) round($n / $responses * 100) : 0;

        return [
            'responses' => $responses,
            'positive_pct' => $responses > 0 ? (int) round($positive / $responses * 100) : null,
            'breakdown' => [
                ['key' => 'positive', 'label' => '👍 Positive', 'count' => $positive, 'pct' => $pct($positive)],
                ['key' => 'negative', 'label' => '👎 Negative', 'count' => $negative, 'pct' => $pct($negative)],
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

    /** @param  list<int>  $values */
    private function median(array $values): ?int
    {
        if ($values === []) {
            return null;
        }
        sort($values);
        $n = count($values);
        $mid = intdiv($n, 2);

        return (int) round($n % 2 === 1 ? $values[$mid] : ($values[$mid - 1] + $values[$mid]) / 2);
    }

    private function medianFrtMinutes(string $workspaceId, CarbonInterface $from, CarbonInterface $to): ?int
    {
        $rows = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('first_replied_at')
            ->where('first_replied_at', '>=', $from)->where('first_replied_at', '<', $to)
            ->get(['created_at', 'first_replied_at']);

        return $this->median($rows->map(fn (Ticket $t) => (int) round($t->created_at->diffInMinutes($t->first_replied_at)))->all());
    }

    private function csatRate(string $workspaceId, CarbonInterface $from, CarbonInterface $to): ?int
    {
        $ratings = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('csat_responded_at')
            ->where('csat_responded_at', '>=', $from)->where('csat_responded_at', '<', $to)
            ->pluck('csat_rating');
        if ($ratings->isEmpty()) {
            return null;
        }
        $positive = $ratings->filter(fn ($r) => $r === 'thumbs_up')->count();

        return (int) round($positive / $ratings->count() * 100);
    }

    /**
     * Calendar-aligned bucket window: daily buckets start at 00:00, weekly at Monday
     * (matching Postgres date_trunc('week')). Shared by volume + replies-per-day.
     *
     * @return array{anchor: CarbonInterface, end: CarbonInterface, labels: list<string>, bucketOf: callable(CarbonInterface):int}
     */
    private function bucketScaffold(CarbonInterface $now, int $bucketDays, int $numBuckets): array
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

    /** @return list<array{label:string,created:int,solved:int}> */
    private function volumeBuckets(string $workspaceId, CarbonInterface $now, int $bucketDays, int $numBuckets): array
    {
        ['anchor' => $anchor, 'end' => $end, 'labels' => $labels, 'bucketOf' => $bucketOf] = $this->bucketScaffold($now, $bucketDays, $numBuckets);
        $createdAts = Ticket::query()->where('workspace_id', $workspaceId)
            ->where('created_at', '>=', $anchor)->where('created_at', '<', $end)->pluck('created_at');
        $resolvedAts = Ticket::query()->where('workspace_id', $workspaceId)
            ->whereNotNull('resolved_at')->where('resolved_at', '>=', $anchor)->where('resolved_at', '<', $end)->pluck('resolved_at');

        $created = array_fill(0, $numBuckets, 0);
        $solved = array_fill(0, $numBuckets, 0);
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
            $out[] = ['label' => $labels[$i], 'created' => $created[$i], 'solved' => $solved[$i]];
        }

        return $out;
    }
}
