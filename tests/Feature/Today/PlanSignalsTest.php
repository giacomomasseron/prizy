<?php

declare(strict_types=1);

use App\Models\Cycle;
use App\Models\Issue;
use App\Models\IssueBlocker;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Services\PlanSignals;
use App\Services\PlanTime;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

// Today v2: why an issue belongs on today's plan. In memory: every relation the signals read is set on the issue.
const PLAN_TODAY = '2026-10-14';
const PLAN_ME = 'me-0000-0000';

beforeEach(fn () => Carbon::setTestNow('2026-10-14 10:00:00'));
afterEach(fn () => Carbon::setTestNow());

/** An issue assigned to PLAN_ME with no tickets, no cycle and blocking nothing, unless told otherwise. */
function planIssue(array $attrs = [], array $relations = []): Issue
{
    $issue = (new Issue())->forceFill(array_merge([
        'id' => 'iss00000-0000-4000-8000-000000000001', 'status' => 'todo', 'priority' => 'no_priority',
        'estimate' => null, 'due_date' => null, 'assignee_id' => PLAN_ME,
    ], $attrs));
    $issue->setRelation('supportTickets', new Collection($relations['tickets'] ?? []));
    $issue->setRelation('cycle', $relations['cycle'] ?? null);
    $issue->setRelation('issueBlockersAsBlockingIssue', new Collection(array_map(function (string $status): IssueBlocker {
        $blocker = new IssueBlocker();
        $blocker->setRelation('blockedIssue', (new Issue())->forceFill(['status' => $status]));

        return $blocker;
    }, $relations['blocks'] ?? [])));

    return $issue;
}

/** An open ticket opened `$hoursAgo` hours ago under a 3h first-reply / 24h resolution policy. */
function planTicket(float $hoursAgo, string $status = 'open'): Ticket
{
    $policy = (new SlaPolicy())->forceFill(['name' => 'Standard', 'first_reply_minutes' => 180, 'resolution_minutes' => 1440, 'next_reply_minutes' => null]);
    $policy->setRelation('schedule', null);
    $ticket = (new Ticket())->forceFill([
        'id' => 'abc12300-0000-4000-8000-000000000009', 'status' => $status,
        'created_at' => now()->subMinutes((int) ($hoursAgo * 60)), 'first_replied_at' => null, 'resolved_at' => null,
    ]);
    $ticket->setRelation('slaPolicy', $policy);
    $ticket->setRelation('slaBreaches', new Collection());
    $ticket->setRelation('latestPublicMessage', null);

    return $ticket;
}

function planCycle(string $starts, string $ends): Cycle
{
    return (new Cycle())->forceFill(['name' => 'Cycle 24', 'starts_at' => $starts, 'ends_at' => $ends]);
}

/** @return array{score: int, tag: array{label: string, tone: string}|null, reason: string} */
function planSignals(Issue $issue, bool $starred = false, bool $helpdesk = true): array
{
    return app(PlanSignals::class)->of($issue, PLAN_TODAY, PLAN_ME, $starred, $helpdesk);
}

it('times a running SLA on a linked open ticket, and calls a missed one breached', function (): void {
    $running = planSignals(planIssue([], ['tickets' => [planTicket(1)]]));
    expect($running['tag'])->toBe(['label' => 'SLA 2h', 'tone' => 'red']);
    expect($running['reason'])->toBe('Its linked ticket TKT-ABC123 breaches SLA in 2h.');
    expect($running['score'])->toBe(90);

    $missed = planSignals(planIssue([], ['tickets' => [planTicket(5)]]));
    expect($missed['tag'])->toBe(['label' => 'SLA breached', 'tone' => 'red']);
    expect($missed['reason'])->toBe('Its linked ticket TKT-ABC123 has breached its SLA.');
});

it('ignores a solved ticket, and every ticket when the support module is off', function (): void {
    expect(planSignals(planIssue([], ['tickets' => [planTicket(5, 'solved')]]))['tag'])->toBeNull();
    expect(planSignals(planIssue([], ['tickets' => [planTicket(5)]]), helpdesk: false)['tag'])->toBeNull();
});

it('reads the due date against the plan\'s local day: overdue, today, tomorrow, later', function (): void {
    expect(planSignals(planIssue(['due_date' => '2026-10-12'])))->toMatchArray(['tag' => ['label' => 'Overdue 2d', 'tone' => 'red'], 'reason' => 'It was due 2 days ago.']);
    expect(planSignals(planIssue(['due_date' => '2026-10-13']))['reason'])->toBe('It was due 1 day ago.');
    expect(planSignals(planIssue(['due_date' => '2026-10-14'])))->toMatchArray(['tag' => ['label' => 'Due today', 'tone' => 'amber'], 'reason' => "It's due today."]);
    expect(planSignals(planIssue(['due_date' => '2026-10-15'])))->toMatchArray(['tag' => ['label' => 'Due tomorrow', 'tone' => 'amber'], 'reason' => "It's due tomorrow."]);
    expect(planSignals(planIssue(['due_date' => '2026-10-20']))['tag'])->toBeNull();
});

it('counts the open issues waiting on it', function (): void {
    expect(planSignals(planIssue([], ['blocks' => ['todo', 'in_progress', 'done']])))->toMatchArray(['tag' => ['label' => 'Blocks 2', 'tone' => 'amber'], 'reason' => '2 issues wait on it.', 'score' => 60]);
    expect(planSignals(planIssue([], ['blocks' => ['todo']]))['reason'])->toBe('1 issue waits on it.');
    expect(planSignals(planIssue([], ['blocks' => ['cancelled']]))['tag'])->toBeNull();
});

it('marks work in review or in progress', function (): void {
    expect(planSignals(planIssue(['status' => 'in_review'])))->toMatchArray(['tag' => ['label' => 'In review', 'tone' => 'blue'], 'reason' => "It's in review."]);
    expect(planSignals(planIssue(['status' => 'in_progress'])))->toMatchArray(['tag' => ['label' => 'In progress', 'tone' => 'amber'], 'reason' => "It's already in progress — keep it moving."]);
});

it('warns when its cycle ends within a week, and not before or after the cycle runs', function (): void {
    expect(planSignals(planIssue([], ['cycle' => planCycle('2026-10-06', '2026-10-20')])))->toMatchArray(['tag' => ['label' => 'Cycle ends in 6d', 'tone' => 'neutral'], 'reason' => 'Cycle 24 ends in 6 days.']);
    expect(planSignals(planIssue([], ['cycle' => planCycle('2026-10-06', '2026-10-14')])))->toMatchArray(['tag' => ['label' => 'Cycle ends today', 'tone' => 'neutral'], 'reason' => 'Cycle 24 ends today.']);
    expect(planSignals(planIssue([], ['cycle' => planCycle('2026-10-06', '2026-10-23')]))['tag'])->toBeNull();
    expect(planSignals(planIssue([], ['cycle' => planCycle('2026-10-15', '2026-10-20')]))['tag'])->toBeNull();
});

it('names the priority and small work, and falls back to why it is yours', function (): void {
    expect(planSignals(planIssue(['priority' => 'urgent'])))->toMatchArray(['tag' => ['label' => 'Urgent', 'tone' => 'neutral'], 'reason' => "It's marked urgent."]);
    expect(planSignals(planIssue(['priority' => 'high']))['reason'])->toBe("It's high priority.");
    expect(planSignals(planIssue(['priority' => 'medium']))['tag'])->toBe(['label' => 'Medium priority', 'tone' => 'neutral']);
    expect(planSignals(planIssue(['estimate' => 1])))->toMatchArray(['tag' => ['label' => 'Low effort', 'tone' => 'neutral'], 'reason' => "It's small — 1 point."]);
    expect(planSignals(planIssue(['estimate' => 3]))['tag'])->toBeNull();

    expect(planSignals(planIssue()))->toBe(['score' => 0, 'tag' => null, 'reason' => 'Assigned to you.']);
    expect(planSignals(planIssue(['assignee_id' => 'someone-else']), starred: true)['reason'])->toBe('You starred it.');
});

it('scores the sum of its signals, tags the strongest, and explains it with the two strongest', function (): void {
    $issue = planIssue(['due_date' => '2026-10-13', 'priority' => 'high'], ['blocks' => ['todo']]);

    expect(planSignals($issue))->toBe([
        'score' => 85 + 55 + 20,
        'tag' => ['label' => 'Overdue 1d', 'tone' => 'red'],
        'reason' => 'It was due 1 day ago. 1 issue waits on it.',
    ]);
});

it('starts an issue on the plan at an hour a point, within 15 minutes and 12 hours, and writes times short', function (): void {
    expect(PlanTime::defaultMinutes(null))->toBe(60);
    expect(PlanTime::defaultMinutes(0))->toBe(60);
    expect(PlanTime::defaultMinutes(3))->toBe(180);
    expect(PlanTime::defaultMinutes(20))->toBe(720);
    expect(PlanTime::format(45))->toBe('45m');
    expect(PlanTime::format(120))->toBe('2h');
    expect(PlanTime::format(90))->toBe('1h 30m');
});
