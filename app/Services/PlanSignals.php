<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Issue;
use App\Models\IssueBlocker;
use Carbon\CarbonImmutable;

/**
 * Why an issue belongs on today's plan (the Today v2 design): the signals that rank the suggestions and give a plan
 * item its tag and its reason. It only reads the issue's loaded relations — supportTickets (with slaPolicy.schedule,
 * slaBreaches and latestPublicMessage), cycle, and issueBlockersAsBlockingIssue.blockedIssue — and never queries.
 */
final class PlanSignals
{
    private const CLOSED = ['done', 'cancelled'];

    private const CLOSED_TICKETS = ['solved', 'closed'];

    /**
     * @param  string  $today  the local date (Y-m-d) the plan is for
     * @param  bool  $helpdesk  whether the workspace's support module is on (its tickets' SLA clocks count)
     * @return array{score: int, tag: array{label: string, tone: string}|null, reason: string}
     */
    public function of(Issue $issue, string $today, string $userId, bool $starred, bool $helpdesk): array
    {
        $signals = array_values(array_filter([
            $helpdesk ? $this->sla($issue) : null,
            $this->due($issue, $today),
            $this->blocking($issue),
            $this->status($issue),
            $this->cycle($issue, $today),
            $this->priority($issue),
            $this->effort($issue),
        ]));
        // The heaviest first; equal weights keep the order above (usort is stable).
        usort($signals, static fn (array $a, array $b): int => $b['weight'] <=> $a['weight']);

        if ($signals === []) {
            return [
                'score' => 0,
                'tag' => null,
                'reason' => $starred && $issue->assignee_id !== $userId ? 'You starred it.' : 'Assigned to you.',
            ];
        }

        return [
            'score' => array_sum(array_column($signals, 'weight')),
            'tag' => ['label' => $signals[0]['label'], 'tone' => $signals[0]['tone']],
            'reason' => implode(' ', array_column(array_slice($signals, 0, 2), 'sentence')),
        ];
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function sla(Issue $issue): ?array
    {
        $breached = null;
        $soonest = null; // [remaining minutes, ticket reference]
        foreach ($issue->supportTickets as $ticket) {
            if (in_array($ticket->status, self::CLOSED_TICKETS, true)) {
                continue;
            }
            $ref = 'TKT-'.strtoupper(substr((string) $ticket->id, 0, 6));
            foreach (SlaCalculator::metrics($ticket) as $metric) {
                if ($metric['state'] === 'breached') {
                    $breached ??= $ref;
                } elseif ($metric['state'] === 'due' && ($soonest === null || $metric['remaining_minutes'] < $soonest[0])) {
                    $soonest = [$metric['remaining_minutes'], $ref];
                }
            }
        }

        if ($breached !== null) {
            return ['weight' => 100, 'label' => 'SLA breached', 'tone' => 'red', 'sentence' => "Its linked ticket {$breached} has breached its SLA."];
        }
        if ($soonest !== null) {
            [$minutes, $ref] = $soonest;
            $time = PlanTime::format($minutes);

            return ['weight' => $minutes <= 240 ? 90 : 60, 'label' => "SLA {$time}", 'tone' => 'red', 'sentence' => "Its linked ticket {$ref} breaches SLA in {$time}."];
        }

        return null;
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function due(Issue $issue, string $today): ?array
    {
        if ($issue->due_date === null) {
            return null;
        }
        $days = $this->daysBetween($today, $issue->due_date->format('Y-m-d'));
        if ($days < 0) {
            $late = -$days;

            return ['weight' => 85, 'label' => "Overdue {$late}d", 'tone' => 'red', 'sentence' => 'It was due '.$this->count($late, 'day').' ago.'];
        }

        return match ($days) {
            0 => ['weight' => 80, 'label' => 'Due today', 'tone' => 'amber', 'sentence' => "It's due today."],
            1 => ['weight' => 60, 'label' => 'Due tomorrow', 'tone' => 'amber', 'sentence' => "It's due tomorrow."],
            default => null,
        };
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function blocking(Issue $issue): ?array
    {
        $waiting = $issue->issueBlockersAsBlockingIssue
            ->filter(fn (IssueBlocker $blocker): bool => $blocker->blockedIssue !== null && ! in_array($blocker->blockedIssue->status, self::CLOSED, true))
            ->count();
        if ($waiting === 0) {
            return null;
        }

        return [
            'weight' => min(70, 50 + 5 * $waiting),
            'label' => "Blocks {$waiting}",
            'tone' => 'amber',
            'sentence' => $waiting === 1 ? '1 issue waits on it.' : "{$waiting} issues wait on it.",
        ];
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function status(Issue $issue): ?array
    {
        return match ($issue->status) {
            'in_review' => ['weight' => 45, 'label' => 'In review', 'tone' => 'blue', 'sentence' => "It's in review."],
            'in_progress' => ['weight' => 40, 'label' => 'In progress', 'tone' => 'amber', 'sentence' => "It's already in progress — keep it moving."],
            default => null,
        };
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function cycle(Issue $issue, string $today): ?array
    {
        $cycle = $issue->cycle;
        if ($cycle === null) {
            return null;
        }
        $end = $cycle->ends_at->format('Y-m-d');
        if ($today < $cycle->starts_at->format('Y-m-d') || $today > $end) {
            return null;
        }
        $left = $this->daysBetween($today, $end);
        if ($left > 7) {
            return null;
        }

        return [
            'weight' => 35,
            'label' => $left === 0 ? 'Cycle ends today' : "Cycle ends in {$left}d",
            'tone' => 'neutral',
            'sentence' => $left === 0 ? "{$cycle->name} ends today." : "{$cycle->name} ends in ".$this->count($left, 'day').'.',
        ];
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function priority(Issue $issue): ?array
    {
        return match ($issue->priority) {
            'urgent' => ['weight' => 30, 'label' => 'Urgent', 'tone' => 'neutral', 'sentence' => "It's marked urgent."],
            'high' => ['weight' => 20, 'label' => 'High priority', 'tone' => 'neutral', 'sentence' => "It's high priority."],
            'medium' => ['weight' => 5, 'label' => 'Medium priority', 'tone' => 'neutral', 'sentence' => "It's medium priority."],
            default => null,
        };
    }

    /** @return array{weight: int, label: string, tone: string, sentence: string}|null */
    private function effort(Issue $issue): ?array
    {
        if ($issue->estimate === null || $issue->estimate > 1) {
            return null;
        }

        return ['weight' => 5, 'label' => 'Low effort', 'tone' => 'neutral', 'sentence' => "It's small — ".$this->count($issue->estimate, 'point').'.'];
    }

    /** Whole days from one Y-m-d date to another (negative when `to` is earlier). */
    private function daysBetween(string $from, string $to): int
    {
        return (int) round(CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($to), false));
    }

    private function count(int $n, string $word): string
    {
        return $n.' '.$word.($n === 1 ? '' : 's');
    }
}
